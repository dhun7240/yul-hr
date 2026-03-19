import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";

type LooseRow = Record<string, unknown>;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function numberToExcelValue(value: unknown) {
  const parsed = normalizeNumber(value);
  return parsed === null ? "-" : parsed;
}

function textToExcelValue(value: unknown) {
  const text = normalizeString(value);
  return text || "-";
}

function getCompanyName(row: LooseRow) {
  return (
    normalizeString(row.name) ||
    normalizeString(row.company_name) ||
    normalizeString(row.company_nm) ||
    normalizeString(row.corp_name) ||
    "-"
  );
}

async function getContext() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      role: "",
      companyId: "",
      userId: "",
      error: "로그인이 필요합니다.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .maybeSingle();

  const role = normalizeString(profile?.role);
  const profileCompanyId = normalizeString(profile?.company_id);

  if (profileCompanyId) {
    return {
      supabase,
      role: role || "company",
      companyId: profileCompanyId,
      userId: user.id,
      error: null,
    };
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const companyId = normalizeString(company?.id);

  return {
    supabase,
    role: role || (companyId ? "company" : "labor"),
    companyId,
    userId: user.id,
    error: null,
  };
}

export async function GET(req: NextRequest) {
  const { supabase, role, companyId, error } = await getContext();

  if (error) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const periodId = req.nextUrl.searchParams.get("period_id")?.trim() ?? "";

  if (!periodId) {
    return NextResponse.json({ error: "period_id가 필요합니다." }, { status: 400 });
  }

  let periodQuery = supabase.from("payroll_periods").select("*").eq("id", periodId);

  if (role === "company") {
    periodQuery = periodQuery.eq("company_id", companyId);
  }

  const { data: period, error: periodError } = await periodQuery.maybeSingle();

  if (periodError || !period) {
    return NextResponse.json(
      { error: periodError?.message ?? "급여월 정보를 찾을 수 없습니다." },
      { status: 400 }
    );
  }

  const rowPeriod = period as LooseRow;
  const targetCompanyId =
    normalizeString(rowPeriod.company_id) || normalizeString(rowPeriod.client_id);

  if (!targetCompanyId) {
    return NextResponse.json({ error: "회사 정보를 확인할 수 없습니다." }, { status: 400 });
  }

  const [{ data: company }, { data: employees, error: employeesError }, { data: inputs, error: inputsError }] =
    await Promise.all([
      supabase.from("companies").select("*").eq("id", targetCompanyId).maybeSingle(),
      supabase
        .from("employees")
        .select("*")
        .eq("company_id", targetCompanyId)
        .order("name", { ascending: true }),
      supabase
        .from("payroll_inputs")
        .select("*")
        .eq("period_id", periodId)
        .order("created_at", { ascending: true }),
    ]);

  if (employeesError) {
    return NextResponse.json({ error: employeesError.message }, { status: 400 });
  }

  if (inputsError) {
    return NextResponse.json({ error: inputsError.message }, { status: 400 });
  }

  const employeeRows = (employees as LooseRow[] | null) ?? [];
  const inputRows = (inputs as LooseRow[] | null) ?? [];

  const inputMap = new Map<string, LooseRow>();
  for (const row of inputRows) {
    const employeeId = normalizeString(row.employee_id);
    if (employeeId) {
      inputMap.set(employeeId, row);
    }
  }

  const companyName = company ? getCompanyName(company as LooseRow) : "-";
  const payrollYear =
    normalizeNumber(rowPeriod.payroll_year) ?? normalizeNumber(rowPeriod.year) ?? "";
  const payrollMonth =
    normalizeNumber(rowPeriod.payroll_month) ?? normalizeNumber(rowPeriod.month) ?? "";

  const exportRows = employeeRows.map((employee) => {
    const employeeRow = employee as LooseRow;
    const inputRow = inputMap.get(normalizeString(employeeRow.id));
    const payload =
      inputRow?.payload && typeof inputRow.payload === "object"
        ? (inputRow.payload as Record<string, unknown>)
        : {};

    return {
      회사명: companyName,
      급여연도: payrollYear || "-",
      급여월: payrollMonth || "-",
      직원명: textToExcelValue(employeeRow.name),
      사번: textToExcelValue(employeeRow.employee_number),
      부서: textToExcelValue(employeeRow.department),
      직책: textToExcelValue(employeeRow.position),
      고용형태: textToExcelValue(employeeRow.employment_type),
      급여형태: textToExcelValue(employeeRow.pay_type),
      입사일: textToExcelValue(employeeRow.hire_date),
      계약종료일: textToExcelValue(employeeRow.contract_end_date),

      기본급: numberToExcelValue(payload.base_salary),
      시급: numberToExcelValue(payload.hourly_wage),
      주_소정_근로시간: numberToExcelValue(payload.weekly_hours),
      주_소정_근로일수: numberToExcelValue(payload.weekly_days),
      고정수당: numberToExcelValue(payload.fixed_allowance),
      식대: numberToExcelValue(payload.meal_allowance),
      교통비: numberToExcelValue(payload.transport_allowance),
      연장근로시간: numberToExcelValue(payload.overtime_hours),
      야간근로시간: numberToExcelValue(payload.night_hours),
      휴일근로시간: numberToExcelValue(payload.holiday_hours),
      유급휴가일수: numberToExcelValue(payload.paid_leave_days),
      무급결근일수: numberToExcelValue(payload.unpaid_leave_days),
      상여금: numberToExcelValue(payload.bonus),
      인센티브: numberToExcelValue(payload.incentive),
      연차수당: numberToExcelValue(payload.annual_leave_allowance),
      퇴직충당금: numberToExcelValue(payload.severance_reserve),
      비과세수당: numberToExcelValue(payload.non_taxable_allowance),
      조정금액: numberToExcelValue(payload.adjustment_amount),
      근태메모: textToExcelValue(payload.attendance_note),
      회사메모: textToExcelValue(payload.company_note),
      메모: textToExcelValue(payload.memo),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "급여입력내역");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  const fileName = `${companyName}_${payrollYear || "-"}-${payrollMonth || "-"}_급여입력내역.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}