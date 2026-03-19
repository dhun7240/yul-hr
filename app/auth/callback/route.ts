import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  const metadata =
    user.user_metadata && typeof user.user_metadata === "object"
      ? (user.user_metadata as Record<string, unknown>)
      : {};

  const role =
    (typeof metadata.role === "string" && metadata.role.trim()) || "company";

  const name =
    (typeof metadata.name === "string" && metadata.name.trim()) ||
    (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
    "";

  await supabase.from("profiles").upsert(
    {
      id: user.id,
      role,
      name,
    },
    { onConflict: "id" }
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "labor") {
    return NextResponse.redirect(new URL("/labor/dashboard", requestUrl.origin));
  }

  if (profile?.role === "company" && !profile.company_id) {
    return NextResponse.redirect(
      new URL("/company/onboarding/company", requestUrl.origin)
    );
  }

  return NextResponse.redirect(new URL("/company/dashboard", requestUrl.origin));
}