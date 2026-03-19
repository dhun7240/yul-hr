import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type LooseRow = Record<string, unknown>;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBoolean(value: unknown) {
  return value === true;
}

function mapNotification(row: LooseRow) {
  return {
    id: normalizeString(row.id),
    user_id: normalizeString(row.user_id),
    title: normalizeString(row.title),
    body: normalizeString(row.body),
    link: normalizeString(row.link),
    is_read: normalizeBoolean(row.is_read),
    created_at: normalizeString(row.created_at),
  };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const rawLimit = Number(req.nextUrl.searchParams.get("limit") || "20");
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 20;

  const [{ data, error }, unreadResult] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (unreadResult.error) {
    return NextResponse.json({ error: unreadResult.error.message }, { status: 400 });
  }

  const rows = ((data as LooseRow[] | null) ?? []).map(mapNotification);

  return NextResponse.json({
    notifications: rows,
    unread_count: unreadResult.count ?? 0,
  });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: {
    id?: string;
    ids?: string[];
    is_read?: boolean;
    mark_all_read?: boolean;
  } = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (body.mark_all_read) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  }

  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id) => typeof id === "string" && id.trim())
    : body.id && body.id.trim()
    ? [body.id.trim()]
    : [];

  if (!ids.length) {
    return NextResponse.json({ error: "알림 ID가 없습니다." }, { status: 400 });
  }

  const isRead = body.is_read === true;

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: isRead })
    .eq("user_id", user.id)
    .in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}