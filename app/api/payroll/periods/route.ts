import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type LooseRow = Record<string, unknown>;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pickNumber(row: LooseRow, keys: string[]) {
  for (const key of keys) {
    const value = normalizeNumber(row[key]);
    if (value !== null) return value;
  }
  return null;
}

function pickString(row: LooseRow, keys: string[]) {
  for (const key of keys) {
    const value = normalizeString(row[key]);
    if (value) return value;
  }
  return "";
}

function mapPeriod(row: LooseRow) {
  const payrollYear = pickNumber(row, ["payroll_year", "year"]);
  const payrollMonth = pickNumber(row, ["payroll_month", "month_number", "month"]);

  const company =
    row.company && typeof row.company === "object" ? (row.company as LooseRow) : null;

  return {
    id: pickString(row, ["id"]),
    company_id: pickString(row, ["company_id", "client_id"]),
    company_name: company
      ? pickString(company, ["name", "company_name", "company_nm", "corp_name"])
      : "",
    payroll_year: payrollYear,
    payroll_month: payrollMonth,
    status: pickString(row, ["status"]),
    month:
      pickString(row, ["month"]) ||
      (payrollYear && payrollMonth
        ? `${payrollYear}년 ${String(payrollMonth).padStart(2, "0")}월`
        : ""),
    submitted_at: pickString(row, ["submitted_at"]),
    reviewed_at: pickString(row, ["reviewed_at", "review_started_at"]),
    confirmed_at: pickString(row, ["confirmed_at"]),
    rejected_at: pickString(row, ["rejected_at"]),
    rejection_reason: pickString(row, ["rejection_reason"]),
    note: pickString(row, ["note"]),
    created_at: pickString(row, ["created_at"]),
    updated_at: pickString(row, ["updated_at"]),
  };
}

async function getAuthContext() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      user: null,
      role: "",
      companyId: null as string | null,
      error: "로그인이 필요합니다.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .maybeSingle();

  const role =
    profile && typeof profile.role === "string" ? profile.role.trim() : "";

  const profileCompanyId =
    profile && typeof profile.company_id === "string" ? profile.company_id : "";

  if (role === "company") {
    if (profileCompanyId) {
      return {
        supabase,
        user,
        role,
        companyId: profileCompanyId,
        error: null,
      };
    }

    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const companyId = company && typeof company.id === "string" ? company.id : "";

    if (!companyId) {
      return {
        supabase,
        user,
        role,
        companyId: null as string | null,
        error: "회사 정보를 먼저 저장해주세요.",
      };
    }

    return {
      supabase,
      user,
      role,
      companyId,
      error: null,
    };
  }

  return {
    supabase,
    user,
    role,
    companyId: null as string | null,
    error: null,
  };
}

async function fetchPeriodsByCompany(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string
) {
  const candidates: Array<
    () => Promise<{ data: LooseRow[] | null; error: { message: string } | null }>
  > = [
    async () => {
      const { data, error } = await supabase
        .from("payroll_periods")
        .select("*")
        .eq("company_id", companyId);
      return {
        data: (data as LooseRow[] | null) ?? null,
        error: error ? { message: error.message } : null,
      };
    },
    async () => {
      const { data, error } = await supabase
        .from("payroll_periods")
        .select("*")
        .eq("client_id", companyId);
      return {
        data: (data as LooseRow[] | null) ?? null,
        error: error ? { message: error.message } : null,
      };
    },
    async () => {
      const { data, error } = await supabase.from("payroll_periods").select("*");
      if (error) {
        return { data: null, error: { message: error.message } };
      }
      const filtered = ((data as LooseRow[] | null) ?? []).filter((row) => {
        const rowCompanyId = pickString(row, ["company_id", "client_id"]);
        return rowCompanyId === companyId;
      });
      return { data: filtered, error: null };
    },
  ];

  let lastError: string | null = null;

  for (const run of candidates) {
    const result = await run();
    if (!result.error) {
      return { data: result.data ?? [], error: null };
    }
    lastError = result.error.message;
  }

  return { data: [], error: lastError ?? "급여월 조회 실패" };
}

async function fetchAssignedPeriodsForLabor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  laborUserId: string,
  companyIdFilter?: string
) {
  const periodCandidates: Array<
    () => Promise<{ data: LooseRow[] | null; error: { message: string } | null }>
  > = [
    async () => {
      const { data, error } = await supabase
        .from("payroll_periods")
        .select(`
          *,
          company:companies!payroll_periods_company_id_fkey (
            id,
            labor_user_id,
            name,
            company_name,
            company_nm,
            corp_name
          )
        `);
      return {
        data: (data as LooseRow[] | null) ?? null,
        error: error ? { message: error.message } : null,
      };
    },
    async () => {
      const { data, error } = await supabase
        .from("payroll_periods")
        .select("*");
      return {
        data: (data as LooseRow[] | null) ?? null,
        error: error ? { message: error.message } : null,
      };
    },
  ];

  let periods: LooseRow[] = [];
  let lastError: string | null = null;

  for (const run of periodCandidates) {
    const result = await run();
    if (!result.error) {
      periods = result.data ?? [];
      lastError = null;
      break;
    }
    lastError = result.error.message;
  }

  if (lastError) {
    return { data: [], error: lastError };
  }

  const companiesCandidates: Array<
    () => Promise<{ data: LooseRow[] | null; error: { message: string } | null }>
  > = [
    async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("labor_user_id", laborUserId);
      return {
        data: (data as LooseRow[] | null) ?? null,
        error: error ? { message: error.message } : null,
      };
    },
    async () => {
      const { data, error } = await supabase.from("companies").select("*");
      if (error) {
        return { data: null, error: { message: error.message } };
      }
      const filtered = ((data as LooseRow[] | null) ?? []).filter((row) => {
        return pickString(row, ["labor_user_id"]) === laborUserId;
      });
      return { data: filtered, error: null };
    },
  ];

  let companies: LooseRow[] = [];
  lastError = null;

  for (const run of companiesCandidates) {
    const result = await run();
    if (!result.error) {
      companies = result.data ?? [];
      lastError = null;
      break;
    }
    lastError = result.error.message;
  }

  if (lastError) {
    return { data: [], error: lastError };
  }

  const allowedCompanyIds = new Set(
    companies
      .map((row) => pickString(row, ["id"]))
      .filter(Boolean)
  );

  const companyMap = new Map<string, LooseRow>();
  for (const company of companies) {
    const id = pickString(company, ["id"]);
    if (id) {
      companyMap.set(id, company);
    }
  }

  const filteredPeriods = periods.filter((row) => {
    const rowCompanyId = pickString(row, ["company_id", "client_id"]);
    if (!rowCompanyId) return false;
    if (!allowedCompanyIds.has(rowCompanyId)) return false;
    if (companyIdFilter && rowCompanyId !== companyIdFilter) return false;
    return true;
  });

  const enriched = filteredPeriods.map((row) => {
    const rowCompanyId = pickString(row, ["company_id", "client_id"]);
    const embeddedCompany =
      row.company && typeof row.company === "object" ? (row.company as LooseRow) : null;

    return {
      ...row,
      company: embeddedCompany ?? companyMap.get(rowCompanyId) ?? null,
    };
  });

  return { data: enriched, error: null };
}

async function insertPeriod(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  year: number,
  month: number
) {
  const now = new Date().toISOString();

  const payloads = [
    {
      company_id: companyId,
      payroll_year: year,
      payroll_month: month,
      month: `${year}-${String(month).padStart(2, "0")}`,
      status: "draft",
      created_at: now,
      updated_at: now,
    },
    {
      company_id: companyId,
      year,
      month,
      status: "draft",
      created_at: now,
      updated_at: now,
    },
    {
      client_id: companyId,
      payroll_year: year,
      payroll_month: month,
      month: `${year}-${String(month).padStart(2, "0")}`,
      status: "draft",
      created_at: now,
      updated_at: now,
    },
    {
      client_id: companyId,
      year,
      month,
      status: "draft",
      created_at: now,
      updated_at: now,
    },
  ];

  let lastError = "급여월 생성 실패";

  for (const payload of payloads) {
    const { data, error } = await supabase
      .from("payroll_periods")
      .insert(payload)
      .select("*")
      .maybeSingle();

    if (!error && data) {
      return { period: mapPeriod(data as LooseRow), error: null };
    }

    if (error?.message) {
      lastError = error.message;
    }
  }

  return { period: null, error: lastError };
}

export async function GET(req: NextRequest) {
  const { supabase, user, role, companyId, error } = await getAuthContext();

  if (error || !user) {
    return NextResponse.json({ periods: [] });
  }

  const companyIdParam = req.nextUrl.searchParams.get("company_id")?.trim() ?? "";

  if (role === "company") {
    if (!companyId) {
      return NextResponse.json({ periods: [] });
    }

    const result = await fetchPeriodsByCompany(supabase, companyId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const rows = (result.data ?? []).map((row) => mapPeriod(row));

    rows.sort((a, b) => {
      const aValue = (a.payroll_year ?? 0) * 100 + (a.payroll_month ?? 0);
      const bValue = (b.payroll_year ?? 0) * 100 + (b.payroll_month ?? 0);
      return bValue - aValue;
    });

    return NextResponse.json({ periods: rows });
  }

  if (role === "labor") {
    const result = await fetchAssignedPeriodsForLabor(
      supabase,
      user.id,
      companyIdParam || undefined
    );

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const rows = (result.data ?? []).map((row) => mapPeriod(row));

    rows.sort((a, b) => {
      const aValue = (a.payroll_year ?? 0) * 100 + (a.payroll_month ?? 0);
      const bValue = (b.payroll_year ?? 0) * 100 + (b.payroll_month ?? 0);
      return bValue - aValue;
    });

    return NextResponse.json({ periods: rows });
  }

  return NextResponse.json({ periods: [] });
}

export async function POST(req: NextRequest) {
  const { supabase, companyId, role, error } = await getAuthContext();

  if (error || role !== "company" || !companyId) {
    return NextResponse.json(
      { error: error ?? "회사 정보를 먼저 저장해주세요." },
      { status: 400 }
    );
  }

  let body: { payroll_year?: number; payroll_month?: number; year?: number; month?: number } = {};

  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const year = normalizeNumber(body.payroll_year ?? body.year);
  const month = normalizeNumber(body.payroll_month ?? body.month);

  if (!year || !month) {
    return NextResponse.json({ error: "급여 연월이 올바르지 않습니다." }, { status: 400 });
  }

  const existingResult = await fetchPeriodsByCompany(supabase, companyId);

  if (existingResult.error) {
    return NextResponse.json({ error: existingResult.error }, { status: 400 });
  }

  const existing = (existingResult.data ?? [])
    .map((row) => mapPeriod(row))
    .find((row) => row.payroll_year === year && row.payroll_month === month);

  if (existing) {
    return NextResponse.json({ period: existing });
  }

  const insertResult = await insertPeriod(supabase, companyId, year, month);

  if (insertResult.error || !insertResult.period) {
    return NextResponse.json(
      { error: insertResult.error ?? "급여월 생성 실패" },
      { status: 400 }
    );
  }

  return NextResponse.json({ period: insertResult.period });
}