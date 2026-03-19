import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type LooseRow = Record<string, unknown>;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function getLaborContext(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, error: "로그인이 필요합니다." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (normalizeString(profile?.role) !== "labor") {
    return { user: null, error: "노무사 계정만 접근할 수 있습니다." };
  }

  return { user, error: null };
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { user, error } = await getLaborContext(supabase);

  if (error || !user) {
    return NextResponse.json({ error: error ?? "로그인이 필요합니다." }, { status: 401 });
  }

  let body: { company_id?: string } = {};

  try {
    body = (await req.json()) as { company_id?: string };
  } catch {
    body = {};
  }

  const companyId = normalizeString(body.company_id);

  if (!companyId) {
    return NextResponse.json(
      { error: "company_id가 필요합니다." },
      { status: 400 }
    );
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, labor_user_id")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError || !company) {
    return NextResponse.json(
      { error: companyError?.message ?? "회사를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  if (normalizeString((company as LooseRow).labor_user_id) !== user.id) {
    return NextResponse.json(
      { error: "현재 이 회사와 연결된 담당 노무사가 아닙니다." },
      { status: 403 }
    );
  }

  const { error: updateError } = await supabase
    .from("companies")
    .update({
      labor_user_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId)
    .eq("labor_user_id", user.id);

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
    .eq("labor_user_id", user.id)
    .eq("status", "pending");

  return NextResponse.json({ success: true });
}