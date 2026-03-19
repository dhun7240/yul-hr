import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type LooseRow = Record<string, unknown>;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableString(value: unknown) {
  const v = normalizeString(value);
  return v || null;
}

function digitsOnly(value: unknown) {
  return normalizeString(value).replace(/[^\d]/g, "");
}

function resolveProfileName(
  profile: LooseRow | null | undefined,
  user: { email?: string | null; user_metadata?: Record<string, unknown> | null } | null
) {
  const metadata =
    user?.user_metadata && typeof user.user_metadata === "object"
      ? user.user_metadata
      : null;

  return (
    normalizeString(profile?.name) ||
    normalizeString(profile?.full_name) ||
    normalizeString(profile?.nickname) ||
    normalizeString(profile?.display_name) ||
    normalizeString(profile?.user_name) ||
    normalizeString(profile?.username) ||
    normalizeString(profile?.korean_name) ||
    normalizeString(metadata?.name) ||
    normalizeString(metadata?.full_name) ||
    normalizeString(metadata?.nickname) ||
    normalizeString(metadata?.display_name) ||
    normalizeString(metadata?.user_name) ||
    normalizeString(metadata?.username) ||
    normalizeString(metadata?.korean_name) ||
    normalizeString(profile?.email) ||
    normalizeString(user?.email)
  );
}

async function getLaborUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, profile: null, error: "로그인이 필요합니다." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const profileRow = (profile ?? null) as LooseRow | null;
  const role =
    normalizeString(profileRow?.role) ||
    normalizeString(
      user.user_metadata && typeof user.user_metadata === "object"
        ? user.user_metadata.role
        : ""
    );

  if (role !== "labor") {
    return { user: null, profile: null, error: "노무사 계정만 접근할 수 있습니다." };
  }

  return { user, profile: profileRow, error: null };
}

async function findCompanyByBusinessNumber(businessNumber: string) {
  const admin = createAdminClient();
  const digits = digitsOnly(businessNumber);

  if (digits.length !== 10) return null;

  const { data, error } = await admin
    .from("companies")
    .select("id, user_id, business_number, labor_user_id");

  if (error || !Array.isArray(data)) {
    return null;
  }

  const found =
    data.find((row) => digitsOnly((row as LooseRow).business_number) === digits) ?? null;

  return (found ?? null) as LooseRow | null;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { user, profile, error } = await getLaborUser(supabase);

  if (error || !user) {
    return NextResponse.json({ error: error ?? "로그인이 필요합니다." }, { status: 401 });
  }

  let body: { business_number?: string } = {};

  try {
    body = (await req.json()) as { business_number?: string };
  } catch {
    body = {};
  }

  const businessNumber = digitsOnly(body.business_number);

  if (!businessNumber) {
    return NextResponse.json(
      { error: "사업자등록번호를 입력해주세요." },
      { status: 400 }
    );
  }

  if (businessNumber.length !== 10) {
    return NextResponse.json(
      { error: "사업자등록번호 10자리를 정확히 입력해주세요." },
      { status: 400 }
    );
  }

  const company = await findCompanyByBusinessNumber(businessNumber);

  if (!company) {
    return NextResponse.json(
      { error: "해당 사업자등록번호의 회사를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const companyId = normalizeString(company.id);
  const companyUserId = normalizeString(company.user_id);
  const currentLaborUserId = normalizeNullableString(company.labor_user_id);

  if (!companyId || !companyUserId) {
    return NextResponse.json(
      { error: "회사 계정 정보가 올바르지 않습니다." },
      { status: 400 }
    );
  }

  if (currentLaborUserId && currentLaborUserId === user.id) {
    return NextResponse.json(
      { error: "이미 연결된 회사입니다." },
      { status: 400 }
    );
  }

  if (currentLaborUserId && currentLaborUserId !== user.id) {
    return NextResponse.json(
      { error: "이미 다른 노무사와 연결된 회사입니다." },
      { status: 400 }
    );
  }

  const { data: existingPending } = await supabase
    .from("company_labor_connection_requests")
    .select("id")
    .eq("company_id", companyId)
    .eq("labor_user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existingPending?.id) {
    return NextResponse.json(
      { error: "이미 연결 요청을 보냈습니다." },
      { status: 400 }
    );
  }

  const laborName = resolveProfileName(profile, {
    email: user.email ?? "",
    user_metadata:
      user.user_metadata && typeof user.user_metadata === "object"
        ? (user.user_metadata as Record<string, unknown>)
        : null,
  });

  const laborEmail = normalizeString(profile?.email) || normalizeString(user.email);

  const { data, error: insertError } = await supabase
    .from("company_labor_connection_requests")
    .insert({
      company_id: companyId,
      company_user_id: companyUserId,
      labor_user_id: user.id,
      labor_name: laborName,
      labor_email: laborEmail,
      status: "pending",
    })
    .select("id, status, created_at")
    .maybeSingle();

  if (insertError || !data) {
    return NextResponse.json(
      { error: insertError?.message ?? "연결 요청 전송에 실패했습니다." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    request: data,
  });
}