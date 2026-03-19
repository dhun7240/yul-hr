import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type LooseRow = Record<string, unknown>;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pickNumber(row: LooseRow, keys: string[]) {
  for (const key of keys) {
    const value = normalizeNumber(row[key]);
    if (value !== null) return value;
  }
  return null;
}

function pickString(row: LooseRow, keys: string[]) {
  for (const key of keys) {
    const value = normalizeString(row[key]);
    if (value) return value;
  }
  return "";
}

function mapPeriod(row: LooseRow, companyName = "") {
  const payrollYear = pickNumber(row, ["payroll_year", "year"]);
  const payrollMonth = pickNumber(row, ["payroll_month", "month_number", "month"]);

  return {
    id: pickString(row, ["id"]),
    company_id: pickString(row, ["company_id", "client_id"]),
    company_name: companyName || pickString(row, ["company_name"]),
    payroll_year: payrollYear,
    payroll_month: payrollMonth,
    status: pickString(row, ["status"]) || "draft",
    month:
      pickString(row, ["month"]) ||
      (payrollYear && payrollMonth
        ? `${payrollYear}년 ${String(payrollMonth).padStart(2, "0")}월`
        : ""),
    submitted_at: pickString(row, ["submitted_at"]),
    reviewed_at: pickString(row, ["reviewed_at", "review_started_at"]),
    confirmed_at: pickString(row, ["confirmed_at"]),
    rejected_at: pickString(row, ["rejected_at"]),
    rejection_reason: pickString(row, ["rejection_reason"]),
    note: pickString(row, ["note"]),
    created_at: pickString(row, ["created_at"]),
    updated_at: pickString(row, ["updated_at"]),
    reviewed_by: pickString(row, ["reviewed_by"]),
  };
}

async function getContext() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      role: "",
      companyId: "",
      userId: "",
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
      role: role || "company",
      companyId: profileCompanyId,
      userId: user.id,
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
    role: role || (companyId ? "company" : "labor"),
    companyId,
    userId: user.id,
    error: null,
  };
}

async function fetchPeriodById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  role: string,
  companyId: string
) {
  let query = supabase.from("payroll_periods").select("*").eq("id", id);

  if (role === "company") {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return {
      period: null as LooseRow | null,
      error: error?.message ?? "급여월 정보를 찾을 수 없습니다.",
    };
  }

  return {
    period: data as LooseRow,
    error: null,
  };
}

async function fetchCompanyInfo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string
) {
  if (!companyId) {
    return {
      name: "",
      user_id: "",
      labor_user_id: "",
    };
  }

  const { data } = await supabase
    .from("companies")
    .select("name, user_id, labor_user_id")
    .eq("id", companyId)
    .maybeSingle();

  return {
    name: normalizeString(data?.name),
    user_id: normalizeString(data?.user_id),
    labor_user_id: normalizeString(data?.labor_user_id),
  };
}

async function createNotification(input: {
  userId: string;
  title: string;
  body: string;
  link: string;
}) {
  if (!input.userId) return;

  const admin = createAdminClient();

  const { error } = await admin.from("notifications").insert({
    user_id: input.userId,
    title: input.title,
    body: input.body,
    link: input.link,
    is_read: false,
  });

  if (error) {
    console.error("notification insert failed:", error.message, input);
  }
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { supabase, role, companyId, error } = await getContext();

  if (error) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const { id } = await context.params;
  const result = await fetchPeriodById(supabase, id, role, companyId);

  if (result.error || !result.period) {
    return NextResponse.json(
      { error: result.error ?? "급여월 정보를 찾을 수 없습니다." },
      { status: 400 }
    );
  }

  const rowCompanyId = pickString(result.period, ["company_id", "client_id"]);
  const companyInfo = await fetchCompanyInfo(supabase, rowCompanyId);

  return NextResponse.json({
    period: mapPeriod(result.period, companyInfo.name),
  });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { supabase, role, companyId, userId, error } = await getContext();

  if (error) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const { id } = await context.params;

  let body: {
    action?: string;
    rejection_reason?: string;
  } = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const action = normalizeString(body.action);
  const rejectionReason = normalizeString(body.rejection_reason);

  const periodResult = await fetchPeriodById(supabase, id, role, companyId);

  if (periodResult.error || !periodResult.period) {
    return NextResponse.json(
      { error: periodResult.error ?? "급여월 정보를 찾을 수 없습니다." },
      { status: 400 }
    );
  }

  const row = periodResult.period;
  const currentStatus = normalizeString(row.status) || "draft";
  const rowCompanyId = pickString(row, ["company_id", "client_id"]);
  const payrollYear = pickNumber(row, ["payroll_year", "year"]);
  const payrollMonth = pickNumber(row, ["payroll_month", "month_number", "month"]);
  const companyInfo = await fetchCompanyInfo(supabase, rowCompanyId);

  if (action === "submit") {
    if (role !== "company") {
      return NextResponse.json({ error: "제출 권한이 없습니다." }, { status: 403 });
    }

    if (!["draft", "needs_revision"].includes(currentStatus)) {
      return NextResponse.json({ error: "현재 상태에서는 제출할 수 없습니다." }, { status: 400 });
    }

    const { data, error: updateError } = await supabase
      .from("payroll_periods")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("company_id", companyId)
      .select("*")
      .maybeSingle();

    if (updateError || !data) {
      return NextResponse.json(
        { error: updateError?.message ?? "제출 처리 실패" },
        { status: 400 }
      );
    }

    await createNotification({
      userId: companyInfo.labor_user_id,
      title: `[급여 검토 요청] ${companyInfo.name} ${payrollYear}년 ${payrollMonth}월`,
      body: `${companyInfo.name}의 ${payrollYear}년 ${payrollMonth}월 급여자료가 제출되었습니다.`,
      link: `/labor/payroll/${id}`,
    });

    return NextResponse.json({ period: mapPeriod(data as LooseRow, companyInfo.name) });
  }

  if (action === "request_revision") {
    if (role !== "labor") {
      return NextResponse.json({ error: "수정 요청 권한이 없습니다." }, { status: 403 });
    }

    const { data, error: updateError } = await supabase
      .from("payroll_periods")
      .update({
        status: "needs_revision",
        rejection_reason: rejectionReason || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (updateError || !data) {
      return NextResponse.json(
        { error: updateError?.message ?? "수정 요청 처리 실패" },
        { status: 400 }
      );
    }

    await createNotification({
      userId: companyInfo.user_id,
      title: `[급여 수정 요청] ${companyInfo.name} ${payrollYear}년 ${payrollMonth}월`,
      body: `${payrollYear}년 ${payrollMonth}월 급여자료에 수정 요청이 등록되었습니다.${rejectionReason ? ` 사유: ${rejectionReason}` : ""}`,
      link: `/company/payroll/${id}`,
    });

    return NextResponse.json({ period: mapPeriod(data as LooseRow, companyInfo.name) });
  }

  if (action === "complete") {
    if (role !== "labor") {
      return NextResponse.json({ error: "확정 권한이 없습니다." }, { status: 403 });
    }

    const { data, error: updateError } = await supabase
      .from("payroll_periods")
      .update({
        status: "completed",
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (updateError || !data) {
      return NextResponse.json(
        { error: updateError?.message ?? "확정 처리 실패" },
        { status: 400 }
      );
    }

    await createNotification({
      userId: companyInfo.user_id,
      title: `[급여 검토 완료] ${companyInfo.name} ${payrollYear}년 ${payrollMonth}월`,
      body: `${payrollYear}년 ${payrollMonth}월 급여 검토가 완료되었습니다. 산출물을 확인해주세요.`,
      link: `/company/payroll/${id}/submission`,
    });

    return NextResponse.json({ period: mapPeriod(data as LooseRow, companyInfo.name) });
  }

  if (action === "reopen_review") {
    if (role !== "labor") {
      return NextResponse.json({ error: "재검토 권한이 없습니다." }, { status: 403 });
    }

    const { data, error: updateError } = await supabase
      .from("payroll_periods")
      .update({
        status: "submitted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (updateError || !data) {
      return NextResponse.json(
        { error: updateError?.message ?? "재검토 처리 실패" },
        { status: 400 }
      );
    }

    return NextResponse.json({ period: mapPeriod(data as LooseRow, companyInfo.name) });
  }

  return NextResponse.json({ error: "지원하지 않는 요청입니다." }, { status: 400 });
}