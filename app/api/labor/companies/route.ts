import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type LooseRow = Record<string, unknown>;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function resolveProfileName(
  profile: LooseRow | null | undefined,
  userMetadata?: Record<string, unknown> | null
) {
  return (
    normalizeString(profile?.name) ||
    normalizeString(profile?.full_name) ||
    normalizeString(profile?.nickname) ||
    normalizeString(profile?.display_name) ||
    normalizeString(profile?.user_name) ||
    normalizeString(profile?.username) ||
    normalizeString(profile?.korean_name) ||
    normalizeString(userMetadata?.name) ||
    normalizeString(userMetadata?.full_name) ||
    normalizeString(userMetadata?.nickname) ||
    normalizeString(userMetadata?.display_name) ||
    normalizeString(userMetadata?.user_name) ||
    normalizeString(userMetadata?.username) ||
    normalizeString(userMetadata?.korean_name) ||
    normalizeString(profile?.email) ||
    normalizeString(userMetadata?.email)
  );
}

function mapCompany(row: LooseRow) {
  return {
    id: normalizeString(row.id),
    name: normalizeString(row.name),
    business_number: normalizeString(row.business_number),
    representative_name: normalizeString(row.representative_name),
    email: normalizeString(row.email),
    phone: normalizeString(row.phone),
    address: normalizeString(row.address),
    employee_count: normalizeNumber(row.employee_count),
    payroll_period_count: normalizeNumber(row.payroll_period_count),
  };
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const profileRow = (profile ?? null) as LooseRow | null;
  const userMetadata =
    user.user_metadata && typeof user.user_metadata === "object"
      ? (user.user_metadata as Record<string, unknown>)
      : null;

  const role =
    normalizeString(profileRow?.role) ||
    normalizeString(userMetadata?.role);

  if (role !== "labor") {
    return NextResponse.json({ error: "노무사 계정만 접근할 수 있습니다." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("companies")
    .select(`
      *,
      employees:employees(count),
      payroll_periods:payroll_periods(count)
    `)
    .eq("labor_user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const items = Array.isArray(data)
    ? data.map((row) => {
        const r = row as LooseRow;
        const employees = Array.isArray(r.employees) ? (r.employees as LooseRow[]) : [];
        const payrollPeriods = Array.isArray(r.payroll_periods)
          ? (r.payroll_periods as LooseRow[])
          : [];

        return mapCompany({
          ...r,
          employee_count: employees[0]?.count ?? 0,
          payroll_period_count: payrollPeriods[0]?.count ?? 0,
        });
      })
    : [];

  const { data: pendingRequests, error: pendingError } = await supabase
    .from("company_labor_connection_requests")
    .select(`
      id,
      company_id,
      company_user_id,
      labor_user_id,
      status,
      created_at,
      companies:companies!company_labor_connection_requests_company_id_fkey (
        id,
        name,
        business_number
      )
    `)
    .eq("labor_user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (pendingError) {
    return NextResponse.json({ error: pendingError.message }, { status: 400 });
  }

  const requests = Array.isArray(pendingRequests)
    ? pendingRequests.map((row) => {
        const r = row as LooseRow;
        const company =
          r.companies && typeof r.companies === "object" && !Array.isArray(r.companies)
            ? (r.companies as LooseRow)
            : null;

        return {
          id: normalizeString(r.id),
          company_id: normalizeString(r.company_id),
          company_user_id: normalizeString(r.company_user_id),
          labor_user_id: normalizeString(r.labor_user_id),
          status: normalizeString(r.status),
          created_at: normalizeString(r.created_at),
          company: company
            ? {
                id: normalizeString(company.id),
                name: normalizeString(company.name),
                business_number: normalizeString(company.business_number),
              }
            : null,
        };
      })
    : [];

  return NextResponse.json({
    labor_name: resolveProfileName(profileRow, userMetadata),
    companies: items,
    pending_requests: requests,
  });
}