import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { requireLaborContext, getSessionContext } from "@/lib/auth/session";

const resend = new Resend(process.env.RESEND_API_KEY);

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

    const [{ data: files }, { data: logs }] = await Promise.all([
      supabase
        .from("payroll_files")
        .select("*")
        .eq("period_id", periodId)
        .in("category", ["output_register", "output_payslip", "output_other"])
        .order("created_at", { ascending: false }),
      supabase
        .from("payroll_delivery_logs")
        .select("*")
        .eq("period_id", periodId)
        .order("created_at", { ascending: false }),
    ]);

    return NextResponse.json({
      files: files ?? [],
      logs: logs ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "조회 실패" },
      { status: 401 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireLaborContext();
    const supabase = await createClient();
    const body = await request.json();

    if (!body.periodId || !body.deliveryType || !body.recipientEmail) {
      return NextResponse.json(
        { error: "periodId, deliveryType, recipientEmail이 필요합니다." },
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

    let status = "queued";
    let sentAt: string | null = null;
    let metadata: Record<string, unknown> = body.metadata || {};

    if (process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "no-reply@yulhr.com",
          to: [String(body.recipientEmail)],
          subject: body.subject || "YUL HR 급여 산출물 안내",
          html: `
            <div style="font-family:Arial,sans-serif;line-height:1.6;">
              <h2>YUL HR 급여 산출물 안내</h2>
              <p>${body.message || "급여 관련 산출물이 등록되었습니다. ERP에서 확인해 주세요."}</p>
            </div>
          `,
        });

        status = "sent";
        sentAt = new Date().toISOString();
      } catch (e) {
        status = "failed";
        metadata = {
          ...metadata,
          resendError: e instanceof Error ? e.message : "send failed",
        };
      }
    }

    const { data, error } = await supabase
      .from("payroll_delivery_logs")
      .insert({
        period_id: body.periodId,
        company_id: period.company_id,
        employee_id: body.employeeId || null,
        delivery_type: body.deliveryType,
        recipient_email: String(body.recipientEmail),
        status,
        sent_at: sentAt,
        metadata,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "발송 로그 저장 실패" },
      { status: 400 },
    );
  }
}