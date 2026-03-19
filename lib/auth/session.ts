import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "labor" | "company";

export type SessionContext = {
  userId: string;
  role: AppRole;
  companyId: string | null;
};

export async function getSessionContext(): Promise<SessionContext> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("로그인이 필요합니다.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role =
    (profile?.role as AppRole | undefined) ||
    (user.user_metadata?.role as AppRole | undefined) ||
    "company";

  let companyId: string | null = null;

  if (role === "company") {
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    companyId = company?.id ?? null;
  }

  return {
    userId: user.id,
    role,
    companyId,
  };
}

/**
 * company role만 확인
 * 온보딩 전이라 companies row가 없어도 company 페이지 진입은 허용
 */
export async function requireCompanyPage() {
  try {
    const ctx = await getSessionContext();

    if (ctx.role !== "company") {
      redirect("/login");
    }

    return ctx;
  } catch {
    redirect("/login");
  }
}

/**
 * labor role만 확인
 */
export async function requireLaborPage() {
  try {
    const ctx = await getSessionContext();

    if (ctx.role !== "labor") {
      redirect("/login");
    }

    return ctx;
  } catch {
    redirect("/login");
  }
}

/**
 * 회사 row(company_id)까지 반드시 필요한 API/페이지용
 */
export async function requireCompanyContext() {
  const ctx = await getSessionContext();

  if (ctx.role !== "company") {
    throw new Error("회사 계정만 접근할 수 있습니다.");
  }

  if (!ctx.companyId) {
    throw new Error("회사 정보가 연결되어 있지 않습니다.");
  }

  return ctx;
}

/**
 * 노무사 전용 API/페이지용
 */
export async function requireLaborContext() {
  const ctx = await getSessionContext();

  if (ctx.role !== "labor") {
    throw new Error("노무사 계정만 접근할 수 있습니다.");
  }

  return ctx;
}

/**
 * 기존 API 파일 호환용 alias
 */
export async function requireCompanyApi() {
  return requireCompanyContext();
}

/**
 * 기존 API 파일 호환용 alias
 */
export async function requireLaborApi() {
  return requireLaborContext();
}