import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

function normalizeDateString(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;

    const year = String(parsed.y).padStart(4, "0");
    const month = String(parsed.m).padStart(2, "0");
    const day = String(parsed.d).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const text = normalizeString(value);
  if (!text) return null;

  const normalized = text.replace(/\./g, "-").replace(/\//g, "-").replace(/\s+/g, "");
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (!match) return text;

  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function getRowValue(row: SheetRow, keys: string[]) {
  for (const key of keys) {
    if (key in row) return row[key];
  }
  return "";
}

function toDbEmploymentType(value: unknown) {
  const v = normalizeString(value).toLowerCase();

  switch (v) {
    case "정규직":
    case "regular":
      return "regular";
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
      return "part_time";
    case "기타":
    case "other":
      return "other";
    default:
      return normalizeString(value) || null;
  }
}

function toDbPayType(value: unknown) {
  const v = normalizeString(value).toLowerCase();

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
      return normalizeString(value) || null;
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
      userId: null,
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
      userId: user.id,
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
      userId: user.id,
      companyId: null,
      error: "회사 정보를 먼저 저장해주세요.",
    };
  }

  return {
    userId: user.id,
    companyId,
    error: null,
  };
}

export async function GET() {
  try {
    const { companyId, error } = await getCompanyContext();

    if (error || !companyId) {
      return NextResponse.json(
        { error: error ?? "회사 정보를 먼저 저장해주세요." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: latestFile, error: latestFileError } = await admin
      .from("employee_import_files")
      .select("id, file_name, storage_path, employee_ids, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestFileError) {
      return NextResponse.json({ error: latestFileError.message }, { status: 400 });
    }

    if (!latestFile) {
      return NextResponse.json({
        success: true,
        file: null,
      });
    }

    const { data: signedUrlData, error: signedUrlError } = await admin.storage
      .from("employee-imports")
      .createSignedUrl(latestFile.storage_path, 60 * 10);

    if (signedUrlError) {
      return NextResponse.json({ error: signedUrlError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      file: {
        id: latestFile.id,
        fileName: latestFile.file_name,
        storagePath: latestFile.storage_path,
        employeeIds: Array.isArray(latestFile.employee_ids) ? latestFile.employee_ids : [],
        createdAt: latestFile.created_at,
        downloadUrl: signedUrlData?.signedUrl ?? "",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "업로드 파일 조회 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { companyId, error } = await getCompanyContext();

    if (error || !companyId) {
      return NextResponse.json(
        { error: error ?? "회사 정보를 먼저 저장해주세요." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "업로드할 파일이 없습니다." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, {
      type: "array",
      cellDates: true,
    });

    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return NextResponse.json({ error: "엑셀 시트를 찾을 수 없습니다." }, { status: 400 });
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<SheetRow>(worksheet, {
      defval: "",
      raw: false,
    });

    if (!rows.length) {
      return NextResponse.json(
        { error: "엑셀에 업로드할 데이터가 없습니다." },
        { status: 400 }
      );
    }

    const insertRows = rows
      .map((row) => {
        const employmentType = toDbEmploymentType(
          getRowValue(row, ["고용형태", "employment_type"])
        );

        return {
          company_id: companyId,
          name: normalizeString(getRowValue(row, ["이름", "name"])),
          resident_registration_number: normalizeString(
            getRowValue(row, ["주민등록번호", "resident_registration_number"])
          ),
          email: normalizeNullableString(getRowValue(row, ["이메일", "email"])),
          phone: normalizeNullableString(getRowValue(row, ["휴대폰", "phone"])),
          employee_number: normalizeNullableString(getRowValue(row, ["사번", "employee_number"])),
          department: normalizeNullableString(getRowValue(row, ["부서", "department"])),
          position: normalizeNullableString(getRowValue(row, ["직책", "position"])),
          employment_type: employmentType,
          contract_end_date:
            employmentType === "contract"
              ? normalizeDateString(getRowValue(row, ["계약만료일", "contract_end_date"]))
              : null,
          pay_type: toDbPayType(getRowValue(row, ["급여형태", "pay_type"])),
          base_salary: normalizeNullableNumber(getRowValue(row, ["기본급", "base_salary"])),
          hourly_wage: normalizeNullableNumber(getRowValue(row, ["시급", "hourly_wage"])),
          weekly_hours: normalizeNullableNumber(
            getRowValue(row, ["주 소정 근로시간", "weekly_hours"])
          ),
          weekly_days: normalizeNullableNumber(
            getRowValue(row, ["주 소정 근로일수", "weekly_days"])
          ),
          hire_date: normalizeDateString(getRowValue(row, ["입사일", "hire_date"])),
          status: "active",
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
        {
          error:
            "유효한 직원 데이터가 없습니다. 템플릿 헤더와 필수값(이름, 주민등록번호, 고용형태, 급여형태, 입사일)을 확인해주세요.",
        },
        { status: 400 }
      );
    }

    const { data: insertedRows, error: insertError } = await admin
      .from("employees")
      .insert(insertRows)
      .select("id, name");

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message ?? "직원 엑셀 업로드에 실패했습니다." },
        { status: 400 }
      );
    }

    const insertedEmployeeIds = Array.isArray(insertedRows)
      ? insertedRows
          .map((row) => (typeof row.id === "string" ? row.id : ""))
          .filter(Boolean)
      : [];

    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^\w.\-가-힣]/g, "_");
    const storagePath = `${companyId}/${timestamp}-${safeFileName}`;

    const { error: uploadError } = await admin.storage
      .from("employee-imports")
      .upload(storagePath, file, {
        contentType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message ?? "업로드 파일 저장에 실패했습니다." },
        { status: 400 }
      );
    }

    const { error: importFileInsertError } = await admin
      .from("employee_import_files")
      .insert({
        company_id: companyId,
        file_name: file.name,
        storage_path: storagePath,
        employee_ids: insertedEmployeeIds,
      });

    if (importFileInsertError) {
      return NextResponse.json(
        { error: importFileInsertError.message ?? "업로드 파일 기록 저장에 실패했습니다." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      importedCount: insertedEmployeeIds.length || insertRows.length,
      insertedEmployeeIds,
      uploadedFileName: file.name,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "직원 엑셀 업로드 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const { companyId, error } = await getCompanyContext();

    if (error || !companyId) {
      return NextResponse.json(
        { error: error ?? "회사 정보를 먼저 저장해주세요." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: latestFile, error: latestFileError } = await admin
      .from("employee_import_files")
      .select("id, storage_path, employee_ids")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestFileError) {
      return NextResponse.json({ error: latestFileError.message }, { status: 400 });
    }

    if (!latestFile) {
      return NextResponse.json({ error: "삭제할 최근 업로드 파일이 없습니다." }, { status: 400 });
    }

    const employeeIds = Array.isArray(latestFile.employee_ids) ? latestFile.employee_ids : [];

    if (employeeIds.length) {
      const { error: employeeDeleteError } = await admin
        .from("employees")
        .delete()
        .in("id", employeeIds);

      if (employeeDeleteError) {
        return NextResponse.json({ error: employeeDeleteError.message }, { status: 400 });
      }
    }

    const { error: storageDeleteError } = await admin.storage
      .from("employee-imports")
      .remove([latestFile.storage_path]);

    if (storageDeleteError) {
      return NextResponse.json({ error: storageDeleteError.message }, { status: 400 });
    }

    const { error: fileDeleteError } = await admin
      .from("employee_import_files")
      .delete()
      .eq("id", latestFile.id);

    if (fileDeleteError) {
      return NextResponse.json({ error: fileDeleteError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      deletedEmployeeIds: employeeIds,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "업로드 파일 삭제 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}