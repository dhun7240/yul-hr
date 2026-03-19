import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getSessionContext();
    const supabase = await createClient();

    const periodId = request.nextUrl.searchParams.get("periodId");
    if (!periodId) {
      return NextResponse.json({ error: "periodId가 필요합니다." }, { status: 400 });
    }

    const { data: period, error: periodError } = await supabase
      .from("payroll_periods")
      .select("*")
      .eq("id", periodId)
      .single();

    if (periodError || !period) {
      return NextResponse.json({ error: "급여월을 찾을 수 없습니다." }, { status: 404 });
    }

    if (ctx.role === "company" && ctx.companyId !== period.company_id) {
      return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("payroll_comments")
      .select("*")
      .eq("period_id", periodId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "댓글 조회 실패" },
      { status: 401 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getSessionContext();
    const supabase = await createClient();
    const body = await request.json();

    if (!body.periodId || !String(body.content || "").trim()) {
      return NextResponse.json(
        { error: "periodId와 content가 필요합니다." },
        { status: 400 },
      );
    }

    const { data: period, error: periodError } = await supabase
      .from("payroll_periods")
      .select("*")
      .eq("id", body.periodId)
      .single();

    if (periodError || !period) {
      return NextResponse.json({ error: "급여월을 찾을 수 없습니다." }, { status: 404 });
    }

    if (ctx.role === "company" && ctx.companyId !== period.company_id) {
      return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("payroll_comments")
      .insert({
        period_id: body.periodId,
        company_id: period.company_id,
        comment_type: body.commentType || "general",
        content: String(body.content).trim(),
        created_by: ctx.userId,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "댓글 등록 실패" },
      { status: 401 },
    );
  }
}