import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CompanyPayload = {
  name?: string;
  business_number?: string;
  representative_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  labor_user_id?: string;
};

type CompanyResponse = {
  id: string;
  name: string;
  business_number: string;
  representative_name: string;
  email: string;
  phone: string;
  address: string;
  labor_user_id: string;
  assigned_labor?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

type LooseRow = Record<string, unknown>;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function resolveProfileName(row: LooseRow | null | undefined) {
  if (!row) return "";

  return (
    normalizeString(row.name) ||
    normalizeString(row.full_name) ||
    normalizeString(row.nickname) ||
    normalizeString(row.display_name) ||
    normalizeString(row.user_name) ||
    normalizeString(row.username) ||
    normalizeString(row.korean_name) ||
    normalizeString(row.email)
  );
}

function pickString(row: LooseRow | null | undefined, keys: string[]) {
  if (!row) return "";

  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function mapCompany(row: LooseRow | null | undefined): CompanyResponse | null {
  if (!row) return null;

  return {
    id: pickString(row, ["id"]),
    name: pickString(row, ["name", "company_name", "company_nm", "corp_name"]),
    business_number: pickString(row, [
      "business_number",
      "biz_number",
      "business_no",
      "registration_number",
    ]),
    representative_name: pickString(row, [
      "representative_name",
      "representative",
      "ceo_name",
      "owner_name",
    ]),
    email: pickString(row, ["email", "company_email", "contact_email"]),
    phone: pickString(row, ["phone", "company_phone", "contact_phone", "tel"]),
    address: pickString(row, ["address", "company_address", "addr"]),
    labor_user_id: pickString(row, ["labor_user_id", "laborId", "assigned_labor_user_id"]),
    assigned_labor: null,
  };
}

async function getAuthContext() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      supabase,
      user: null,
      profile: null,
      error: "로그인이 필요합니다.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return {
    supabase,
    user,
    profile: (profile ?? null) as LooseRow | null,
    error: null,
  };
}

async function findCompanyRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  profile: LooseRow | null
) {
  const profileCompanyId =
    typeof profile?.company_id === "string"
      ? profile.company_id
      : typeof profile?.companyId === "string"
      ? profile.companyId
      : "";

  if (profileCompanyId) {
    const byId = await supabase
      .from("companies")
      .select("*")
      .eq("id", profileCompanyId)
      .maybeSingle();

    if (byId.data) return byId.data as LooseRow;
  }

  const byUserId = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (byUserId.data) return byUserId.data as LooseRow;

  return null;
}

async function getCompanyColumns(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string[]> {
  const query = `
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'companies'
    order by ordinal_position
  `;

  const { data, error } = await supabase.rpc("run_sql", { query }).single();

  if (!error && data) {
    if (Array.isArray(data)) {
      return data
        .map((row) =>
          row && typeof row === "object" && "column_name" in row
            ? String((row as Record<string, unknown>).column_name)
            : ""
        )
        .filter(Boolean);
    }

    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed
            .map((row) =>
              row && typeof row === "object" && "column_name" in row
                ? String((row as Record<string, unknown>).column_name)
                : ""
            )
            .filter(Boolean);
        }
      } catch {
        return [];
      }
    }
  }

  const { data: sample } = await supabase.from("companies").select("*").limit(1);
  const first = Array.isArray(sample) && sample.length > 0 ? sample[0] : null;

  if (first && typeof first === "object") {
    return Object.keys(first);
  }

  return [
    "id",
    "user_id",
    "labor_user_id",
    "name",
    "business_number",
    "representative_name",
    "email",
    "phone",
    "address",
    "created_at",
    "updated_at",
  ];
}

function buildPayloadByColumns(body: CompanyPayload, columns: string[]) {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  const setIfExists = (keys: string[], value: string) => {
    for (const key of keys) {
      if (columns.includes(key)) {
        payload[key] = value;
      }
    }
  };

  setIfExists(["name", "company_name", "company_nm", "corp_name"], normalizeString(body.name));
  setIfExists(
    ["business_number", "biz_number", "business_no", "registration_number"],
    normalizeString(body.business_number)
  );
  setIfExists(
    ["representative_name", "representative", "ceo_name", "owner_name"],
    normalizeString(body.representative_name)
  );
  setIfExists(["email", "company_email", "contact_email"], normalizeString(body.email));
  setIfExists(["phone", "company_phone", "contact_phone", "tel"], normalizeString(body.phone));
  setIfExists(["address", "company_address", "addr"], normalizeString(body.address));

  const laborUserId = normalizeString(body.labor_user_id);
  if (laborUserId) {
    setIfExists(["labor_user_id", "laborId", "assigned_labor_user_id"], laborUserId);
  }

  return payload;
}

function buildInsertPayload(userId: string, body: CompanyPayload, columns: string[]) {
  const payload = buildPayloadByColumns(body, columns);

  if (columns.includes("user_id")) {
    payload.user_id = userId;
  }

  if (columns.includes("created_at")) {
    payload.created_at = new Date().toISOString();
  }

  return payload;
}

function stripMissingColumnFromPayload(
  payload: Record<string, unknown>,
  message?: string | null
) {
  const errorMessage = typeof message === "string" ? message : "";
  const match =
    errorMessage.match(/Could not find the '([^']+)' column/i) ??
    errorMessage.match(/column "([^"]+)" does not exist/i);

  if (!match?.[1]) {
    return payload;
  }

  const missingColumn = match[1];
  const nextPayload = { ...payload };
  delete nextPayload[missingColumn];
  return nextPayload;
}

export async function GET() {
  const { supabase, user, profile, error } = await getAuthContext();

  if (error || !user) {
    return NextResponse.json({ error: error ?? "로그인이 필요합니다." }, { status: 401 });
  }

  const row = await findCompanyRow(supabase, user.id, profile);
  const company = mapCompany(row);

  let assignedLabor: CompanyResponse["assigned_labor"] = null;

  if (company?.labor_user_id) {
    const { data: laborProfile } = await supabase
      .from("profiles")
      .select(
        "id, name, full_name, nickname, display_name, user_name, username, korean_name, email"
      )
      .eq("id", company.labor_user_id)
      .maybeSingle();

    if (laborProfile) {
      const laborRow = laborProfile as LooseRow;
      assignedLabor = {
        id: normalizeString(laborRow.id),
        name: resolveProfileName(laborRow),
        email: normalizeString(laborRow.email),
      };
    } else {
      const { data: acceptedRequest } = await supabase
        .from("company_labor_connection_requests")
        .select("labor_user_id, labor_name, labor_email, responded_at, created_at")
        .eq("company_id", company.id)
        .eq("labor_user_id", company.labor_user_id)
        .eq("status", "accepted")
        .order("responded_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (acceptedRequest) {
        const requestRow = acceptedRequest as LooseRow;
        assignedLabor = {
          id: normalizeString(requestRow.labor_user_id),
          name: normalizeString(requestRow.labor_name),
          email: normalizeString(requestRow.labor_email),
        };
      }
    }
  }

  let pending_requests: {
    id: string;
    labor_user_id: string;
    status: string;
    labor: {
      id: string;
      name: string;
      email: string;
    } | null;
  }[] = [];

  let pending_request_error = "";

  if (company?.id) {
    const { data: pendingRequestRows, error: pendingError } = await supabase
      .from("company_labor_connection_requests")
      .select("id, labor_user_id, labor_name, labor_email, status")
      .eq("company_id", company.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (pendingError) {
      pending_request_error = pendingError.message;
    }

    pending_requests = Array.isArray(pendingRequestRows)
      ? pendingRequestRows.map((row) => {
          const requestRow = row as LooseRow;
          return {
            id: normalizeString(requestRow.id),
            labor_user_id: normalizeString(requestRow.labor_user_id),
            status: normalizeString(requestRow.status),
            labor: {
              id: normalizeString(requestRow.labor_user_id),
              name: normalizeString(requestRow.labor_name),
              email: normalizeString(requestRow.labor_email),
            },
          };
        })
      : [];
  }

  return NextResponse.json({
    company: company
      ? {
          ...company,
          assigned_labor: assignedLabor,
        }
      : null,
    pending_requests,
    pending_request_count: pending_requests.length,
    pending_request_error,
  });
}

export async function POST(req: Request) {
  const { supabase, user, profile, error } = await getAuthContext();

  if (error || !user) {
    return NextResponse.json({ error: error ?? "로그인이 필요합니다." }, { status: 401 });
  }

  let body: CompanyPayload = {};

  try {
    body = (await req.json()) as CompanyPayload;
  } catch {
    body = {};
  }

  const existingRow = await findCompanyRow(supabase, user.id, profile);
  const columns = await getCompanyColumns(supabase);

  if (!columns.length) {
    return NextResponse.json(
      { error: "companies 테이블 컬럼 정보를 확인할 수 없습니다." },
      { status: 400 }
    );
  }

  if (existingRow?.id && typeof existingRow.id === "string") {
    const updatePayload = buildPayloadByColumns(body, columns);

    let { data, error: updateError } = await supabase
      .from("companies")
      .update(updatePayload)
      .eq("id", existingRow.id)
      .select("*")
      .maybeSingle();

    if (updateError) {
      const retryPayload = stripMissingColumnFromPayload(updatePayload, updateError.message);

      if (Object.keys(retryPayload).length !== Object.keys(updatePayload).length) {
        const retryResult = await supabase
          .from("companies")
          .update(retryPayload)
          .eq("id", existingRow.id)
          .select("*")
          .maybeSingle();

        data = retryResult.data;
        updateError = retryResult.error;
      }
    }

    if (updateError || !data) {
      return NextResponse.json(
        { error: updateError?.message ?? "회사 정보 저장에 실패했습니다." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      company: mapCompany(data as LooseRow),
    });
  }

  const insertPayload = buildInsertPayload(user.id, body, columns);

  let { data, error: insertError } = await supabase
    .from("companies")
    .insert(insertPayload)
    .select("*")
    .maybeSingle();

  if (insertError) {
    const retryPayload = stripMissingColumnFromPayload(insertPayload, insertError.message);

    if (Object.keys(retryPayload).length !== Object.keys(insertPayload).length) {
      const retryResult = await supabase
        .from("companies")
        .insert(retryPayload)
        .select("*")
        .maybeSingle();

      data = retryResult.data;
      insertError = retryResult.error;
    }
  }

  if (insertError || !data) {
    return NextResponse.json(
      { error: insertError?.message ?? "회사 정보 저장에 실패했습니다." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    company: mapCompany(data as LooseRow),
  });
}