import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";

type LooseRow = Record<string, unknown>;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function normalizeNullableString(value: unknown) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeEmploymentType(value: unknown) {
  const normalized = normalizeString(value).toLowerCase();

  if (!normalized) return null;

  const map: Record<string, string> = {
    정규직: "regular",
    정규: "regular",
    상용직: "regular",
    regular: "regular",

    계약직: "contract",
    계약: "contract",
    contract: "contract",

    파트타임: "part_time",
    파트: "part_time",
    단시간: "part_time",
    시간제: "part_time",
    아르바이트: "part_time",
    알바: "part_time",
    parttime: "part_time",
    "part-time": "part_time",
    part_time: "part_time",

    일용직: "daily",
    일용: "daily",
    daily: "daily",

    임원: "executive",
    임원급: "executive",
    executive: "executive",
  };

  return map[normalized] ?? normalized;
}

function mapEmployee(row: LooseRow) {
  return {
    id: normalizeString(row.id),
    company_id: normalizeString(row.company_id),
    name: normalizeString(row.name),
    resident_registration_number: normalizeString(row.resident_registration_number),
    email: normalizeString(row.email),
    phone: normalizeString(row.phone),
    employee_number: normalizeString(row.employee_number),
    department: normalizeString(row.department),
    position: normalizeString(row.position),
    employment_type: normalizeString(row.employment_type),
    pay_type: normalizeString(row.pay_type),
    base_salary: normalizeNumber(row.base_salary),
    hourly_wage: normalizeNumber(row.hourly_wage),
    weekly_hours: normalizeNumber(row.weekly_hours),
    weekly_days: normalizeNumber(row.weekly_days),
    hire_date: normalizeString(row.hire_date),
    status: normalizeString(row.status),
    source_period_id: normalizeString(row.source_period_id),
    change_period_id: normalizeString(row.change_period_id),
    change_type: normalizeString(row.change_type),
    leave_start_date: normalizeString(row.leave_start_date),
    return_date: normalizeString(row.return_date),
    termination_date: normalizeString(row.termination_date),
    created_at: normalizeString(row.created_at),
    updated_at: normalizeString(row.updated_at),
  };
}

async function getCompanyContextForWrite() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      companyId: null as string | null,
      error: "로그인이 필요합니다.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();

  const profileCompanyId =
    profile && typeof profile.company_id === "string" ? profile.company_id : "";

  if (profileCompanyId) {
    return {
      supabase,
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
      companyId: null as string | null,
      error: "회사 정보를 먼저 저장해주세요.",
    };
  }

  return {
    supabase,
    companyId,
    error: null,
  };
}

async function getLaborCompanyIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  laborUserId: string
) {
  const { data, error } = await supabase
    .from("companies")
    .select("id")
    .eq("labor_user_id", laborUserId);

  if (error) {
    return [];
  }

  return ((data as LooseRow[] | null) ?? [])
    .map((row) => normalizeString(row.id))
    .filter(Boolean);
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const ctx = await getSessionContext();

  const companyIdParam = req.nextUrl.searchParams.get("company_id")?.trim() ?? "";
  const employeeId = req.nextUrl.searchParams.get("employee_id")?.trim() ?? "";

  let query = supabase.from("employees").select("*");

  if (ctx.role === "company") {
    if (!ctx.companyId) {
      return NextResponse.json({ employees: [] });
    }
    query = query.eq("company_id", ctx.companyId);
  } else if (ctx.role === "labor") {
    const laborCompanyIds = await getLaborCompanyIds(supabase, ctx.userId);
    if (!laborCompanyIds.length) {
      return NextResponse.json({ employees: [] });
    }

    const targetCompanyIds = companyIdParam
      ? laborCompanyIds.filter((id) => id === companyIdParam)
      : laborCompanyIds;

    if (!targetCompanyIds.length) {
      return NextResponse.json({ employees: [] });
    }

    query = query.in("company_id", targetCompanyIds);
  }

  if (employeeId) {
    query = query.eq("id", employeeId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    employees: ((data as LooseRow[] | null) ?? []).map((row) => mapEmployee(row)),
  });
}

export async function POST(req: NextRequest) {
  const { supabase, companyId, error } = await getCompanyContextForWrite();

  if (error || !companyId) {
    return NextResponse.json(
      { error: error ?? "회사 정보를 먼저 저장해주세요." },
      { status: 400 }
    );
  }

  let body: Record<string, unknown> = {};

  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const payload = {
    company_id: companyId,
    name: normalizeString(body.name),
    resident_registration_number: normalizeString(body.resident_registration_number),
    email: normalizeNullableString(body.email),
    phone: normalizeNullableString(body.phone),
    employee_number: normalizeNullableString(body.employee_number),
    department: normalizeNullableString(body.department),
    position: normalizeNullableString(body.position),
    employment_type: normalizeEmploymentType(body.employment_type),
    pay_type: normalizeNullableString(body.pay_type),
    base_salary: normalizeNumber(body.base_salary),
    hourly_wage: normalizeNumber(body.hourly_wage),
    weekly_hours: normalizeNumber(body.weekly_hours),
    weekly_days: normalizeNumber(body.weekly_days),
    hire_date: normalizeNullableString(body.hire_date),
    status: normalizeNullableString(body.status),
    source_period_id: normalizeNullableString(body.source_period_id),
    change_period_id: normalizeNullableString(body.change_period_id),
    change_type: normalizeNullableString(body.change_type),
    leave_start_date: normalizeNullableString(body.leave_start_date),
    return_date: normalizeNullableString(body.return_date),
    termination_date: normalizeNullableString(body.termination_date),
  };

  if (!payload.name) {
    return NextResponse.json({ error: "이름은 필수입니다." }, { status: 400 });
  }

  const employeeId = normalizeString(body.id);

  if (employeeId) {
    const { data, error: updateError } = await supabase
      .from("employees")
      .update(payload)
      .eq("id", employeeId)
      .eq("company_id", companyId)
      .select("*")
      .maybeSingle();

    if (updateError || !data) {
      return NextResponse.json(
        { error: updateError?.message ?? "직원 수정 실패" },
        { status: 400 }
      );
    }

    return NextResponse.json({ employee: mapEmployee(data as LooseRow) });
  }

  const { data, error: insertError } = await supabase
    .from("employees")
    .insert(payload)
    .select("*")
    .maybeSingle();

  if (insertError || !data) {
    return NextResponse.json(
      { error: insertError?.message ?? "직원 등록 실패" },
      { status: 400 }
    );
  }

  return NextResponse.json({ employee: mapEmployee(data as LooseRow) });
}

export async function DELETE(req: NextRequest) {
  const { supabase, companyId, error } = await getCompanyContextForWrite();

  if (error || !companyId) {
    return NextResponse.json(
      { error: error ?? "회사 정보를 먼저 저장해주세요." },
      { status: 400 }
    );
  }

  const employeeId = req.nextUrl.searchParams.get("id")?.trim() ?? "";

  if (!employeeId) {
    return NextResponse.json({ error: "삭제할 직원 ID가 없습니다." }, { status: 400 });
  }

  const { error: deleteError } = await supabase
    .from("employees")
    .delete()
    .eq("id", employeeId)
    .eq("company_id", companyId);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message ?? "직원 삭제 실패" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}