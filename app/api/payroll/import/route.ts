import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";

type SheetRow = Record<string, unknown>;
type LooseRow = Record<string, unknown>;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function normalizeNullableString(value: unknown) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function normalizeNumericString(value: unknown) {
  const normalized = normalizeString(value).replace(/[^\d.-]/g, "");
  return normalized || "0";
}

function toNumberOrNull(value: string) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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
    return { ok: false, error: "현재 상태에서는 엑셀 업로드로 수정할 수 없습니다." };
  }

  return { ok: true, error: null };
}

function pickEmployeeMatch(employees: LooseRow[], row: SheetRow) {
  const employeeId = normalizeString(row["employee_id"]);
  const residentRegistrationNumber = normalizeString(row["주민등록번호"]);
  const employeeNumber = normalizeString(row["사번"]);
  const name = normalizeString(row["이름"]);

  if (employeeId) {
    const found = employees.find((item) => normalizeString(item.id) === employeeId);
    if (found) return found;
  }

  if (residentRegistrationNumber) {
    const found = employees.find(
      (item) =>
        normalizeString(item.resident_registration_number) === residentRegistrationNumber
    );
    if (found) return found;
  }

  if (employeeNumber) {
    const found = employees.find(
      (item) => normalizeString(item.employee_number) === employeeNumber
    );
    if (found) return found;
  }

  if (name) {
    const found = employees.find((item) => normalizeString(item.name) === name);
    if (found) return found;
  }

  return null;
}

function buildPayload(row: SheetRow) {
  return {
    base_salary: normalizeNumericString(row["기본급"]),
    hourly_wage: normalizeNumericString(row["시급"]),
    weekly_hours: normalizeNumericString(row["주_소정_근로시간"] || row["주 소정 근로시간"]),
    weekly_days: normalizeNumericString(row["주_소정_근로일수"] || row["주 소정 근로일수"]),
    fixed_allowance: normalizeNumericString(row["고정수당"]),
    meal_allowance: normalizeNumericString(row["식대"]),
    transport_allowance: normalizeNumericString(row["교통비"]),
    overtime_hours: normalizeNumericString(row["연장근로시간"]),
    night_hours: normalizeNumericString(row["야간근로시간"]),
    holiday_hours: normalizeNumericString(row["휴일근로시간"]),
    paid_leave_days: normalizeNumericString(row["유급휴가일수"]),
    unpaid_leave_days: normalizeNumericString(row["무급결근일수"]),
    bonus: normalizeNumericString(row["상여금"]),
    incentive: normalizeNumericString(row["인센티브"]),
    annual_leave_allowance: normalizeNumericString(row["연차수당"]),
    severance_reserve: normalizeNumericString(row["퇴직충당금"]),
    non_taxable_allowance: normalizeNumericString(row["비과세수당"]),
    adjustment_amount: normalizeNumericString(row["조정금액"]),
    attendance_note: normalizeNullableString(row["근태메모"]) ?? "",
    company_note: normalizeNullableString(row["회사메모"] || row["메모"]) ?? "",
    memo: normalizeNullableString(row["메모"]) ?? "",
  };
}

export async function POST(req: Request) {
  const { supabase, companyId, error } = await getCompanyContext();

  if (error || !companyId) {
    return NextResponse.json(
      { error: error ?? "회사 정보를 먼저 저장해주세요." },
      { status: 400 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const periodId = normalizeString(formData.get("period_id"));

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "업로드할 파일이 없습니다." }, { status: 400 });
  }

  if (!periodId) {
    return NextResponse.json({ error: "급여월 정보가 없습니다." }, { status: 400 });
  }

  const editableCheck = await ensureEditablePeriod(supabase, periodId, companyId);
  if (!editableCheck.ok) {
    return NextResponse.json({ error: editableCheck.error }, { status: 400 });
  }

  const { data: employeesData, error: employeeError } = await supabase
    .from("employees")
    .select("*")
    .eq("company_id", companyId);

  if (employeeError) {
    return NextResponse.json({ error: employeeError.message }, { status: 400 });
  }

  const employees = (employeesData as LooseRow[] | null) ?? [];

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return NextResponse.json({ error: "엑셀 시트를 찾을 수 없습니다." }, { status: 400 });
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<SheetRow>(worksheet, {
    defval: "",
    raw: false,
  });

  let importedCount = 0;

  for (const row of rows) {
    const employee = pickEmployeeMatch(employees, row);
    if (!employee) continue;

    const employeeId = normalizeString(employee.id);
    if (!employeeId) continue;

    const payload = buildPayload(row);
    const now = new Date().toISOString();

    await supabase
      .from("payroll_inputs")
      .delete()
      .eq("company_id", companyId)
      .eq("period_id", periodId)
      .eq("employee_id", employeeId);

    const { error: insertError } = await supabase
      .from("payroll_inputs")
      .insert({
        company_id: companyId,
        period_id: periodId,
        employee_id: employeeId,
        base_salary: toNumberOrNull(payload.base_salary),
        allowance_taxable: toNumberOrNull(payload.fixed_allowance),
        allowance_nontaxable: toNumberOrNull(payload.non_taxable_allowance),
        bonus: toNumberOrNull(payload.bonus),
        attendance_note: payload.attendance_note,
        company_note: payload.company_note,
        payload,
        created_at: now,
        updated_at: now,
      });

    if (!insertError) {
      importedCount += 1;
    }
  }

  return NextResponse.json({
    success: true,
    importedCount,
  });
}