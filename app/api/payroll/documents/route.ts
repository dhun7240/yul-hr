import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

type LooseRow = Record<string, unknown>;

const BUCKET_NAME = "payroll-documents";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-()가-힣 ]/g, "_");
}

function getStorageAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다.");
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
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
      userId: "",
      companyId: "",
      role: "",
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
      userId: user.id,
      companyId: profileCompanyId,
      role: role || "company",
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
    userId: user.id,
    companyId,
    role: role || (companyId ? "company" : "labor"),
    error: null,
  };
}

async function getPeriodInfo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  periodId: string
) {
  const { data, error } = await supabase
    .from("payroll_periods")
    .select("*")
    .eq("id", periodId)
    .maybeSingle();

  if (error || !data) {
    return {
      error: error?.message ?? "급여월 정보를 찾을 수 없습니다.",
      period: null as LooseRow | null,
    };
  }

  return {
    error: null,
    period: data as LooseRow,
  };
}

async function ensureLaborCanAccessPeriodCompany(
  supabase: Awaited<ReturnType<typeof createClient>>,
  laborUserId: string,
  companyId: string
) {
  const { data: company, error } = await supabase
    .from("companies")
    .select("id, labor_user_id")
    .eq("id", companyId)
    .maybeSingle();

  if (error || !company) {
    return {
      ok: false,
      error: error?.message ?? "회사 정보를 찾을 수 없습니다.",
    };
  }

  const assignedLaborUserId = normalizeString((company as LooseRow).labor_user_id);

  if (!assignedLaborUserId || assignedLaborUserId !== laborUserId) {
    return {
      ok: false,
      error: "해당 회사에 접근할 권한이 없습니다.",
    };
  }

  return {
    ok: true,
    error: null,
  };
}

async function resolveEffectiveCompanyId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  role: string,
  userId: string,
  baseCompanyId: string,
  periodId: string
) {
  const periodCheck = await getPeriodInfo(supabase, periodId);

  if (periodCheck.error || !periodCheck.period) {
    return {
      companyId: "",
      period: null as LooseRow | null,
      error: periodCheck.error ?? "급여월 정보를 찾을 수 없습니다.",
    };
  }

  const periodCompanyId = normalizeString(periodCheck.period.company_id);

  if (!periodCompanyId) {
    return {
      companyId: "",
      period: null as LooseRow | null,
      error: "급여월에 연결된 회사 정보가 없습니다.",
    };
  }

  if (role === "company") {
    if (!baseCompanyId || baseCompanyId !== periodCompanyId) {
      return {
        companyId: "",
        period: null as LooseRow | null,
        error: "해당 급여월에 접근할 권한이 없습니다.",
      };
    }

    return {
      companyId: periodCompanyId,
      period: periodCheck.period,
      error: null,
    };
  }

  if (role === "labor") {
    const accessCheck = await ensureLaborCanAccessPeriodCompany(
      supabase,
      userId,
      periodCompanyId
    );

    if (!accessCheck.ok) {
      return {
        companyId: "",
        period: null as LooseRow | null,
        error: accessCheck.error ?? "접근 권한이 없습니다.",
      };
    }

    return {
      companyId: periodCompanyId,
      period: periodCheck.period,
      error: null,
    };
  }

  return {
    companyId: "",
    period: null as LooseRow | null,
    error: "접근 권한이 없습니다.",
  };
}

function buildPrefix(companyId: string, periodId: string, scope: string) {
  return `${companyId}/${periodId}/${scope}`;
}

export async function GET(req: NextRequest) {
  const { supabase, userId, companyId, role, error } = await getAuthContext();

  if (error) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const periodId = req.nextUrl.searchParams.get("period_id")?.trim() ?? "";
  const scope = req.nextUrl.searchParams.get("scope")?.trim() ?? "company_reference";
  const path = req.nextUrl.searchParams.get("path")?.trim() ?? "";
  const download = req.nextUrl.searchParams.get("download")?.trim() === "1";

  if (!periodId) {
    return NextResponse.json({ error: "급여월 정보가 없습니다." }, { status: 400 });
  }

  const resolved = await resolveEffectiveCompanyId(
    supabase,
    role,
    userId,
    companyId,
    periodId
  );

  if (resolved.error || !resolved.companyId) {
    return NextResponse.json(
      { error: resolved.error ?? "회사 정보를 찾을 수 없습니다." },
      { status: 400 }
    );
  }

  let storage;
  try {
    storage = getStorageAdminClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "스토리지 설정 오류" },
      { status: 500 }
    );
  }

  if (download) {
    if (!path) {
      return NextResponse.json({ error: "다운로드할 파일 경로가 없습니다." }, { status: 400 });
    }

    const expectedPrefix = `${resolved.companyId}/${periodId}/`;

    if (!path.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: "잘못된 파일 경로입니다." }, { status: 400 });
    }

    const { data, error: signedUrlError } = await storage.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, 60);

    if (signedUrlError || !data?.signedUrl) {
      return NextResponse.json(
        { error: signedUrlError?.message ?? "다운로드 URL 생성 실패" },
        { status: 400 }
      );
    }

    return NextResponse.json({ url: data.signedUrl });
  }

  const prefix = buildPrefix(resolved.companyId, periodId, scope);

  const { data, error: listError } = await storage.storage
    .from(BUCKET_NAME)
    .list(prefix, {
      limit: 100,
      sortBy: { column: "updated_at", order: "desc" },
    });

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 400 });
  }

  const validFiles = (data ?? []).filter((item) => item.name);

  if (!validFiles.length) {
    return NextResponse.json({ file: null });
  }

  const file = validFiles[0];
  const fullPath = `${prefix}/${file.name}`;

  return NextResponse.json({
    file: {
      name: file.name,
      path: fullPath,
      size: file.metadata?.size ?? 0,
      updated_at: file.updated_at ?? "",
    },
  });
}

export async function POST(req: NextRequest) {
  const { supabase, userId, companyId, role, error } = await getAuthContext();

  if (error) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const formData = await req.formData();
  const periodId = normalizeString(formData.get("period_id"));
  const scope = normalizeString(formData.get("scope")) || "company_reference";
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "업로드할 파일이 없습니다." }, { status: 400 });
  }

  if (!periodId) {
    return NextResponse.json({ error: "급여월 정보가 없습니다." }, { status: 400 });
  }

  const resolved = await resolveEffectiveCompanyId(
    supabase,
    role,
    userId,
    companyId,
    periodId
  );

  if (resolved.error || !resolved.companyId || !resolved.period) {
    return NextResponse.json(
      { error: resolved.error ?? "회사 정보를 찾을 수 없습니다." },
      { status: 400 }
    );
  }

  const status = normalizeString(resolved.period.status) || "draft";

  if (role === "company" && !["draft", "needs_revision"].includes(status)) {
    return NextResponse.json(
      { error: "제출 완료 상태에서는 파일을 수정할 수 없습니다." },
      { status: 400 }
    );
  }

  let storage;
  try {
    storage = getStorageAdminClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "스토리지 설정 오류" },
      { status: 500 }
    );
  }

  const prefix = buildPrefix(resolved.companyId, periodId, scope);

  const { data: existingFiles, error: existingListError } = await storage.storage
    .from(BUCKET_NAME)
    .list(prefix, {
      limit: 100,
      sortBy: { column: "updated_at", order: "desc" },
    });

  if (existingListError) {
    return NextResponse.json({ error: existingListError.message }, { status: 400 });
  }

  const existingPaths = (existingFiles ?? [])
    .filter((item) => item.name)
    .map((item) => `${prefix}/${item.name}`);

  if (existingPaths.length) {
    const { error: removeExistingError } = await storage.storage
      .from(BUCKET_NAME)
      .remove(existingPaths);

    if (removeExistingError) {
      return NextResponse.json({ error: removeExistingError.message }, { status: 400 });
    }
  }

  const safeName = sanitizeFileName(file.name);
  const filePath = `${prefix}/${Date.now()}_${safeName}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await storage.storage
    .from(BUCKET_NAME)
    .upload(filePath, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  return NextResponse.json({
    file: {
      name: filePath.split("/").pop() ?? safeName,
      path: filePath,
      size: file.size,
      updated_at: new Date().toISOString(),
    },
  });
}

export async function DELETE(req: NextRequest) {
  const { supabase, userId, companyId, role, error } = await getAuthContext();

  if (error) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const periodId = req.nextUrl.searchParams.get("period_id")?.trim() ?? "";
  const path = req.nextUrl.searchParams.get("path")?.trim() ?? "";

  if (!periodId || !path) {
    return NextResponse.json({ error: "삭제할 파일 정보가 없습니다." }, { status: 400 });
  }

  const resolved = await resolveEffectiveCompanyId(
    supabase,
    role,
    userId,
    companyId,
    periodId
  );

  if (resolved.error || !resolved.companyId || !resolved.period) {
    return NextResponse.json(
      { error: resolved.error ?? "회사 정보를 찾을 수 없습니다." },
      { status: 400 }
    );
  }

  const status = normalizeString(resolved.period.status) || "draft";

  if (role === "company" && !["draft", "needs_revision"].includes(status)) {
    return NextResponse.json(
      { error: "제출 완료 상태에서는 파일을 수정할 수 없습니다." },
      { status: 400 }
    );
  }

  const expectedPrefix = `${resolved.companyId}/${periodId}/`;

  if (!path.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: "잘못된 파일 경로입니다." }, { status: 400 });
  }

  let storage;
  try {
    storage = getStorageAdminClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "스토리지 설정 오류" },
      { status: 500 }
    );
  }

  const { error: removeError } = await storage.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (removeError) {
    return NextResponse.json({ error: removeError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}