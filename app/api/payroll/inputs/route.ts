import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";

type LooseRow = Record<string, unknown>;
type PayrollPayload = Record<string, unknown>;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function mapRow(row: LooseRow) {
  return {
    id: normalizeString(row.id),
    period_id: normalizeString(row.period_id),
    employee_id: normalizeString(row.employee_id),
    company_id: normalizeString(row.company_id),
    base_salary: row.base_salary ?? null,
    allowance_taxable: row.allowance_taxable ?? null,
    allowance_nontaxable: row.allowance_nontaxable ?? null,
    bonus: row.bonus ?? null,
    attendance_note: normalizeString(row.attendance_note),
    company_note: normalizeString(row.company_note),
    payload:
      row.payload && typeof row.payload === "object"
        ? (row.payload as PayrollPayload)
        : {},
    created_at: normalizeString(row.created_at),
    updated_at: normalizeString(row.updated_at),
  };
}

function toPayload(row: LooseRow): PayrollPayload {
  const payload =
    row.payload && typeof row.payload === "object"
      ? { ...(row.payload as PayrollPayload) }
      : {};

  return {
    ...payload,
    employee_id: normalizeString(row.employee_id),
    base_salary:
      payload.base_salary ?? (row.base_salary == null ? "" : String(row.base_salary)),
    fixed_allowance:
      payload.fixed_allowance ?? (row.allowance_taxable == null ? "" : String(row.allowance_taxable)),
    non_taxable_allowance:
      payload.non_taxable_allowance ??
      (row.allowance_nontaxable == null ? "" : String(row.allowance_nontaxable)),
    bonus: payload.bonus ?? (row.bonus == null ? "" : String(row.bonus)),
    memo: payload.memo ?? normalizeString(row.company_note),
    attendance_note: payload.attendance_note ?? normalizeString(row.attendance_note),
    company_note: payload.company_note ?? normalizeString(row.company_note),
    hourly_wage: payload.hourly_wage ?? "",
    weekly_hours: payload.weekly_hours ?? "",
    weekly_days: payload.weekly_days ?? "",
    meal_allowance: payload.meal_allowance ?? "",
    transport_allowance: payload.transport_allowance ?? "",
    overtime_hours: payload.overtime_hours ?? "",
    night_hours: payload.night_hours ?? "",
    holiday_hours: payload.holiday_hours ?? "",
    paid_leave_days: payload.paid_leave_days ?? "",
    unpaid_leave_days: payload.unpaid_leave_days ?? "",
    incentive: payload.incentive ?? "",
    annual_leave_allowance: payload.annual_leave_allowance ?? "",
    severance_reserve: payload.severance_reserve ?? "",
    adjustment_amount: payload.adjustment_amount ?? "",
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

async function ensureEditablePeriod(
  supabase: Awaited<ReturnType<typeof createClient>>,
  periodId: string,
  companyId: string
) {
  const { data, error } = await supabase
    .from("payroll_periods")
    .select("status")
    .eq("id", periodId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "급여월 정보를 찾을 수 없습니다." };
  }

  const status = normalizeString((data as LooseRow).status) || "draft";

  if (!["draft", "needs_revision"].includes(status)) {
    return { ok: false, error: "현재 상태에서는 급여 입력을 수정할 수 없습니다." };
  }

  return { ok: true, error: null };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const ctx = await getSessionContext();

  const periodId = req.nextUrl.searchParams.get("period_id")?.trim() ?? "";
  const employeeId = req.nextUrl.searchParams.get("employee_id")?.trim() ?? "";
  const latest = req.nextUrl.searchParams.get("latest")?.trim() === "1";
  const excludePeriodId = req.nextUrl.searchParams.get("exclude_period_id")?.trim() ?? "";

  let query = supabase.from("payroll_inputs").select("*");

  if (ctx.role === "company") {
    if (!ctx.companyId) {
      return NextResponse.json({ inputs: [] });
    }
    query = query.eq("company_id", ctx.companyId);
  }

  if (periodId) query = query.eq("period_id", periodId);
  if (employeeId) query = query.eq("employee_id", employeeId);

  const { data, error } = await query.order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  let rows = ((data as LooseRow[] | null) ?? []).map((row) => {
    const mapped = mapRow(row);
    return {
      ...mapped,
      payload: toPayload(row),
    };
  });

  if (excludePeriodId) {
    rows = rows.filter((row) => row.period_id !== excludePeriodId);
  }

  if (latest) {
    return NextResponse.json({
      input: rows.length ? rows[0] : null,
    });
  }

  return NextResponse.json({ inputs: rows });
}

export async function POST(req: NextRequest) {
  const { supabase, companyId, error } = await getCompanyContextForWrite();

  if (error || !companyId) {
    return NextResponse.json(
      { error: error ?? "회사 정보를 먼저 저장해주세요." },
      { status: 400 }
    );
  }

  let body: {
    period_id?: string;
    employee_id?: string;
    payload?: PayrollPayload;
  } = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const periodId = normalizeString(body.period_id);
  const employeeId = normalizeString(body.employee_id);
  const payload =
    body.payload && typeof body.payload === "object" ? body.payload : {};

  if (!periodId || !employeeId) {
    return NextResponse.json({ error: "급여월 또는 직원 정보가 없습니다." }, { status: 400 });
  }

  const editableCheck = await ensureEditablePeriod(supabase, periodId, companyId);
  if (!editableCheck.ok) {
    return NextResponse.json({ error: editableCheck.error }, { status: 400 });
  }

  const now = new Date().toISOString();

  const rowPayload = {
    company_id: companyId,
    period_id: periodId,
    employee_id: employeeId,
    base_salary: numberOrNull(payload.base_salary),
    allowance_taxable: numberOrNull(payload.fixed_allowance),
    allowance_nontaxable: numberOrNull(payload.non_taxable_allowance),
    bonus: numberOrNull(payload.bonus),
    attendance_note: normalizeString(payload.attendance_note),
    company_note: normalizeString(payload.company_note || payload.memo),
    payload,
    updated_at: now,
  };

  const { error: deleteError } = await supabase
    .from("payroll_inputs")
    .delete()
    .eq("company_id", companyId)
    .eq("period_id", periodId)
    .eq("employee_id", employeeId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  const { data, error: insertError } = await supabase
    .from("payroll_inputs")
    .insert({
      ...rowPayload,
      created_at: now,
    })
    .select("*")
    .maybeSingle();

  if (insertError || !data) {
    return NextResponse.json(
      { error: insertError?.message ?? "급여 정보 저장 실패" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    input: {
      ...mapRow(data as LooseRow),
      payload: toPayload(data as LooseRow),
    },
  });
}

export async function DELETE(req: NextRequest) {
  const { supabase, companyId, error } = await getCompanyContextForWrite();

  if (error || !companyId) {
    return NextResponse.json(
      { error: error ?? "회사 정보를 먼저 저장해주세요." },
      { status: 400 }
    );
  }

  const rowId = req.nextUrl.searchParams.get("id")?.trim() ?? "";

  if (!rowId) {
    return NextResponse.json({ error: "삭제할 입력 ID가 없습니다." }, { status: 400 });
  }

  const { data: target, error: targetError } = await supabase
    .from("payroll_inputs")
    .select("*")
    .eq("id", rowId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (targetError || !target) {
    return NextResponse.json(
      { error: targetError?.message ?? "삭제할 입력을 찾을 수 없습니다." },
      { status: 400 }
    );
  }

  const targetRow = target as LooseRow;
  const periodId = normalizeString(targetRow.period_id);
  const employeeId = normalizeString(targetRow.employee_id);

  const editableCheck = await ensureEditablePeriod(supabase, periodId, companyId);
  if (!editableCheck.ok) {
    return NextResponse.json({ error: editableCheck.error }, { status: 400 });
  }

  const { error: deleteError } = await supabase
    .from("payroll_inputs")
    .delete()
    .eq("company_id", companyId)
    .eq("period_id", periodId)
    .eq("employee_id", employeeId);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message ?? "급여 입력 삭제 실패" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}