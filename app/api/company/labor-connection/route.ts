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
    .select("id, user_id, labor_user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!company) {
    return { user, company: null, error: "회사 정보가 없습니다." };
  }

  return { user, company: company as LooseRow, error: null };
}

export async function DELETE() {
  const supabase = await createClient();
  const { company, error } = await getCompanyContext(supabase);

  if (error || !company) {
    return NextResponse.json({ error: error ?? "회사 정보가 없습니다." }, { status: 400 });
  }

  const companyId = normalizeString(company.id);
  const laborUserId = normalizeString(company.labor_user_id);

  if (!laborUserId) {
    return NextResponse.json(
      { error: "현재 연결된 노무사가 없습니다." },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from("companies")
    .update({
      labor_user_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  await supabase
    .from("company_labor_connection_requests")
    .update({
      status: "cancelled",
      responded_at: now,
      updated_at: now,
    })
    .eq("company_id", companyId)
    .eq("labor_user_id", laborUserId)
    .eq("status", "pending");

  return NextResponse.json({ success: true });
}