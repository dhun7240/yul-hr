import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";

type SheetRow = Record<string, unknown>;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function normalizeNullableString(value: unknown) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function normalizeNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const normalized = normalizeString(value).replace(/,/g, "");
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDbEmploymentType(value: unknown) {
  const v = normalizeString(value);

  switch (v) {
    case "정규직":
    case "full_time":
    case "full-time":
    case "fulltime":
    case "regular":
      return "full_time";
    case "계약직":
    case "contract":
      return "contract";
    case "일용직":
    case "daily":
      return "daily";
    case "아르바이트":
    case "파트타임":
    case "part_time":
    case "part-time":
    case "parttime":
    case "hourly":
      return "part_time";
    case "기타":
    case "other":
      return "other";
    default:
      return v || null;
  }
}

function toDbPayType(value: unknown) {
  const v = normalizeString(value);

  switch (v) {
    case "월급":
    case "salary":
    case "monthly":
    case "monthly_salary":
      return "monthly_salary";
    case "시급":
    case "hourly":
    case "hourly_wage":
      return "hourly";
    case "일급":
    case "daily":
    case "daily_wage":
      return "daily";
    case "연봉":
    case "annual":
    case "annual_salary":
      return "annual_salary";
    default:
      return v || null;
  }
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
      companyId: null,
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
      companyId: null,
      error: "회사 정보를 먼저 저장해주세요.",
    };
  }

  return {
    supabase,
    companyId,
    error: null,
  };
}

export async function POST(req: Request) {
  const { supabase, companyId, error } = await getCompanyContext();

  if (error || !companyId) {
    return NextResponse.json({ error: error ?? "회사 정보를 먼저 저장해주세요." }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "업로드할 파일이 없습니다." }, { status: 400 });
  }

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

  const insertRows = rows
    .map((row) => {
      const employmentType = toDbEmploymentType(row["고용형태"]);

      return {
        company_id: companyId,
        name: normalizeString(row["이름"]),
        resident_registration_number: normalizeString(row["주민등록번호"]),
        email: normalizeNullableString(row["이메일"]),
        phone: normalizeNullableString(row["휴대폰"]),
        employee_number: normalizeNullableString(row["사번"]),
        department: normalizeNullableString(row["부서"]),
        position: normalizeNullableString(row["직책"]),
        employment_type: employmentType,
        contract_end_date:
          employmentType === "contract" ? normalizeNullableString(row["계약만료일"]) : null,
        pay_type: toDbPayType(row["급여형태"]),
        base_salary: normalizeNullableNumber(row["기본급"]),
        hourly_wage: normalizeNullableNumber(row["시급"]),
        weekly_hours: normalizeNullableNumber(row["주 소정 근로시간"]),
        weekly_days: normalizeNullableNumber(row["주 소정 근로일수"]),
        hire_date: normalizeNullableString(row["입사일"]),
      };
    })
    .filter(
      (row) =>
        row.name &&
        row.resident_registration_number &&
        row.employment_type &&
        row.pay_type &&
        row.hire_date
    );

  if (!insertRows.length) {
    return NextResponse.json(
      { error: "유효한 직원 데이터가 없습니다. 템플릿 헤더를 확인해주세요." },
      { status: 400 }
    );
  }

  const { error: insertError } = await supabase.from("employees").insert(insertRows);

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message ?? "직원 엑셀 업로드에 실패했습니다." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    importedCount: insertRows.length,
  });
}