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
    .select("id, user_id, name, business_number, labor_user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!company) {
    return { user, company: null, error: "회사 정보가 없습니다." };
  }

  return { user, company: company as LooseRow, error: null };
}

export async function GET() {
  const supabase = await createClient();
  const { company, error } = await getCompanyContext(supabase);

  if (error || !company) {
    return NextResponse.json({ error: error ?? "회사 정보가 없습니다." }, { status: 400 });
  }

  const companyId = normalizeString(company.id);

  const { data: requestRows, error: requestError } = await supabase
    .from("company_labor_connection_requests")
    .select(
      "id, company_id, company_user_id, labor_user_id, labor_name, labor_email, status, created_at, updated_at, responded_at"
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (requestError) {
    return NextResponse.json({ error: requestError.message }, { status: 400 });
  }

  const requests = Array.isArray(requestRows)
    ? requestRows.map((row) => {
        const r = row as LooseRow;

        return {
          id: normalizeString(r.id),
          company_id: normalizeString(r.company_id),
          company_user_id: normalizeString(r.company_user_id),
          labor_user_id: normalizeString(r.labor_user_id),
          status: normalizeString(r.status),
          created_at: normalizeString(r.created_at),
          updated_at: normalizeString(r.updated_at),
          responded_at: normalizeString(r.responded_at),
          company: {
            id: normalizeString(company.id),
            name: normalizeString(company.name),
            business_number: normalizeString(company.business_number),
          },
          labor: {
            id: normalizeString(r.labor_user_id),
            name: normalizeString(r.labor_name),
            email: normalizeString(r.labor_email),
          },
        };
      })
    : [];

  return NextResponse.json({ requests });
}