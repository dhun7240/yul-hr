import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type LooseRow = Record<string, unknown>;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function getCompanyContext(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, company: null, error: "로그인이 필요합니다." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (normalizeString(profile?.role) !== "company") {
    return { user: null, company: null, error: "회사 계정만 접근할 수 있습니다." };
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!company) {
    return { user, company: null, error: "회사 정보가 없습니다." };
  }

  return { user, company: company as LooseRow, error: null };
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const supabase = await createClient();
  const { company, error } = await getCompanyContext(supabase);

  if (error || !company) {
    return NextResponse.json({ error: error ?? "회사 정보가 없습니다." }, { status: 400 });
  }

  const { requestId } = await params;
  const companyId = normalizeString(company.id);

  const { data: requestRow, error: requestError } = await supabase
    .from("company_labor_connection_requests")
    .select("id, company_id, status")
    .eq("id", requestId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (requestError || !requestRow) {
    return NextResponse.json(
      { error: requestError?.message ?? "연결 요청을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  if (normalizeString(requestRow.status) !== "pending") {
    return NextResponse.json(
      { error: "이미 처리된 연결 요청입니다." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  const { error: rejectError } = await supabase
    .from("company_labor_connection_requests")
    .update({
      status: "rejected",
      responded_at: now,
      updated_at: now,
    })
    .eq("id", requestId);

  if (rejectError) {
    return NextResponse.json(
      { error: rejectError.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}