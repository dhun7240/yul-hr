"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AppRole = "company" | "labor";

export default function LoginPageClient() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicEmail, setMagicEmail] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingMagic, setLoadingMagic] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");

  async function moveAfterLogin() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("로그인 세션을 확인하지 못했어.");
    }

    const metadata =
      user.user_metadata && typeof user.user_metadata === "object"
        ? (user.user_metadata as Record<string, unknown>)
        : {};

    const fallbackRole =
      (typeof metadata.role === "string" ? metadata.role : "") || "company";

    const fallbackName =
      (typeof metadata.name === "string" && metadata.name.trim()) ||
      (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
      "";

    await supabase.from("profiles").upsert(
      {
        id: user.id,
        name: fallbackName,
        role: fallbackRole,
      },
      { onConflict: "id" }
    );

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    const role =
      (profile?.role as AppRole | undefined) ||
      (fallbackRole as AppRole) ||
      "company";

    const target =
      role === "labor" ? "/labor/dashboard" : "/company/dashboard";

    window.location.href = target;
  }

  async function handlePasswordLogin(e: FormEvent) {
    e.preventDefault();
    setLoadingPassword(true);
    setMessage("");
    setErrorMessage("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      await moveAfterLogin();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "로그인 중 오류가 발생했습니다."
      );
    } finally {
      setLoadingPassword(false);
    }
  }

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault();
    setLoadingMagic(true);
    setMessage("");
    setErrorMessage("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: magicEmail.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }

      setMessage("로그인 링크를 이메일로 보냈어. 가장 최근 메일의 링크를 한 번만 눌러줘.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "매직링크 발송 중 오류가 발생했습니다."
      );
    } finally {
      setLoadingMagic(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900">YUL HR 로그인</h1>
          <p className="mt-2 text-sm text-zinc-600">
            비밀번호 로그인과 이메일 매직링크 로그인을 둘 다 지원해.
          </p>
        </div>

        {(errorCode || errorDescription) && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="font-semibold">로그인 링크 오류</div>
            <div className="mt-1">
              {decodeURIComponent(errorDescription || errorCode || "로그인 링크가 유효하지 않습니다.")}
            </div>
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-900">비밀번호 로그인</h2>
            <p className="mt-1 text-sm text-zinc-500">
              개발 중에는 이 방식이 제일 안정적이야.
            </p>

            <form onSubmit={handlePasswordLogin} className="mt-6 space-y-4">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-700">이메일</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
                  required
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-700">비밀번호</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={loadingPassword}
                className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loadingPassword ? "로그인 중..." : "비밀번호로 로그인"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-900">이메일 링크 로그인</h2>
            <p className="mt-1 text-sm text-zinc-500">
              비밀번호가 없거나 잊어버렸을 때 사용할 수 있어.
            </p>

            <form onSubmit={handleMagicLink} className="mt-6 space-y-4">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-700">이메일</span>
                <input
                  type="email"
                  value={magicEmail}
                  onChange={(e) => setMagicEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={loadingMagic}
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 disabled:opacity-60"
              >
                {loadingMagic ? "발송 중..." : "로그인 링크 보내기"}
              </button>
            </form>
          </section>
        </div>

        <div className="mt-8 text-sm text-zinc-600">
          아직 계정이 없으면{" "}
          <Link href="/signup" className="font-semibold text-zinc-900 underline">
            회원가입
          </Link>
        </div>
      </div>
    </main>
  );
}