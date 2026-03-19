import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type LooseRow = Record<string, unknown>;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableString(value: unknown) {
  const normalized = normalizeString(value);
  return normalized || null;
}

async function getCompanyContext() {
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

function mapChangeFromEmployee(row: LooseRow) {
  const sourcePeriodId = normalizeString(row.source_period_id);
  const changePeriodId = normalizeString(row.change_period_id);
  const changeType = normalizeString(row.change_type);

  if (sourcePeriodId) {
    return {
      id: `hire:${normalizeString(row.id)}`,
      employee_id: normalizeString(row.id),
      change_type: "hire",
      period_id: sourcePeriodId,
      is_active: true,
    };
  }

  if (changePeriodId && changeType) {
    return {
      id: `change:${normalizeString(row.id)}`,
      employee_id: normalizeString(row.id),
      change_type: changeType,
      period_id: changePeriodId,
      is_active: true,
    };
  }

  return null;
}

export async function GET(req: NextRequest) {
  const { supabase, companyId, error } = await getCompanyContext();

  if (error || !companyId) {
    return NextResponse.json({ changes: [] });
  }

  const periodId = req.nextUrl.searchParams.get("period_id")?.trim() ?? "";

  let query = supabase
    .from("employees")
    .select("*")
    .eq("company_id", companyId);

  if (periodId) {
    query = query.or(`source_period_id.eq.${periodId},change_period_id.eq.${periodId}`);
  }

  const { data, error: fetchError } = await query.order("created_at", { ascending: false });

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 400 });
  }

  const changes = ((data as LooseRow[] | null) ?? [])
    .map(mapChangeFromEmployee)
    .filter(Boolean);

  return NextResponse.json({ changes });
}

export async function POST(req: NextRequest) {
  const { supabase, companyId, error } = await getCompanyContext();

  if (error || !companyId) {
    return NextResponse.json(
      { error: error ?? "회사 정보를 먼저 저장해주세요." },
      { status: 400 }
    );
  }

  let body: {
    employee_id?: string;
    type?: string;
    effective_date?: string;
    new_department?: string;
    action?: string;
    period_id?: string;
  } = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const employeeId = normalizeString(body.employee_id);
  const type = normalizeString(body.type);
  const effectiveDate = normalizeString(body.effective_date);
  const newDepartment = normalizeString(body.new_department);
  const action = normalizeString(body.action);
  const periodId = normalizeString(body.period_id);

  if (!employeeId) {
    return NextResponse.json({ error: "직원 정보가 없습니다." }, { status: 400 });
  }

  if (!periodId) {
    return NextResponse.json({ error: "급여월 정보가 없습니다." }, { status: 400 });
  }

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (employeeError || !employee) {
    return NextResponse.json(
      { error: employeeError?.message ?? "직원을 찾을 수 없습니다." },
      { status: 400 }
    );
  }

  const employeeRow = employee as LooseRow;

  if (action === "cancel") {
    const sourcePeriodId = normalizeString(employeeRow.source_period_id);
    const changePeriodId = normalizeString(employeeRow.change_period_id);

    if (sourcePeriodId === periodId) {
      const { error: deleteError } = await supabase
        .from("employees")
        .delete()
        .eq("id", employeeId)
        .eq("company_id", companyId);

      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message ?? "신규 입사자 삭제 실패" },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true });
    }

    if (changePeriodId !== periodId) {
      return NextResponse.json({ error: "취소할 변동 내역이 없습니다." }, { status: 400 });
    }

    const restorePayload = {
      department: normalizeNullableString(employeeRow.previous_department),
      status: normalizeNullableString(employeeRow.previous_status) ?? "재직",
      leave_start_date: normalizeNullableString(employeeRow.previous_leave_start_date),
      return_date: normalizeNullableString(employeeRow.previous_return_date),
      termination_date: normalizeNullableString(employeeRow.previous_termination_date),
      change_period_id: null,
      change_type: null,
      previous_department: null,
      previous_status: null,
      previous_leave_start_date: null,
      previous_return_date: null,
      previous_termination_date: null,
      updated_at: new Date().toISOString(),
    };

    const { error: restoreError } = await supabase
      .from("employees")
      .update(restorePayload)
      .eq("id", employeeId)
      .eq("company_id", companyId);

    if (restoreError) {
      return NextResponse.json(
        { error: restoreError.message ?? "변동 내역 복원 실패" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  }

  if (!type) {
    return NextResponse.json({ error: "변동 유형이 없습니다." }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    change_period_id: periodId,
    change_type:
      type === "퇴사"
        ? "termination"
        : type === "휴직"
        ? "leave"
        : type === "복직"
        ? "return"
        : "transfer",
    previous_department: normalizeNullableString(employeeRow.department),
    previous_status: normalizeNullableString(employeeRow.status) ?? "재직",
    previous_leave_start_date: normalizeNullableString(employeeRow.leave_start_date),
    previous_return_date: normalizeNullableString(employeeRow.return_date),
    previous_termination_date: normalizeNullableString(employeeRow.termination_date),
  };

  if (type === "퇴사") {
    updatePayload.status = "퇴사";
    updatePayload.termination_date = effectiveDate || null;
    updatePayload.return_date = null;
  }

  if (type === "휴직") {
    updatePayload.status = "휴직";
    updatePayload.leave_start_date = effectiveDate || null;
    updatePayload.return_date = null;
  }

  if (type === "복직") {
    updatePayload.status = "재직";
    updatePayload.return_date = effectiveDate || null;
    updatePayload.leave_start_date = null;
    updatePayload.termination_date = null;
  }

  if (type === "부서이동") {
    updatePayload.department = newDepartment || null;
  }

  const { data: updatedEmployee, error: updateError } = await supabase
    .from("employees")
    .update(updatePayload)
    .eq("id", employeeId)
    .eq("company_id", companyId)
    .select("*")
    .maybeSingle();

  if (updateError || !updatedEmployee) {
    return NextResponse.json(
      { error: updateError?.message ?? "직원 변동 저장 실패" },
      { status: 400 }
    );
  }

  return NextResponse.json({ employee: updatedEmployee });
}