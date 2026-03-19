"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Role = "company" | "labor";

export default function SignupPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [role, setRole] = useState<Role>("company");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    try {
      if (!name.trim()) {
        throw new Error("이름을 입력해줘.");
      }

      if (password.length < 6) {
        throw new Error("비밀번호는 최소 6자 이상이어야 해.");
      }

      if (password !== confirmPassword) {
        throw new Error("비밀번호 확인이 일치하지 않아.");
      }

      const trimmedName = name.trim();

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            name: trimmedName,
            role,
          },
        },
      });

      if (error) {
        throw error;
      }

      const userId = data.user?.id;

      if (userId) {
        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            id: userId,
            name: trimmedName,
            role,
          },
          { onConflict: "id" }
        );

        if (profileError) {
          throw profileError;
        }
      }

      if (data.session) {
        router.refresh();
        router.push("/");
        return;
      }

      setMessage(
        "회원가입이 완료됐어. 이메일 인증을 켠 상태라면 메일함에서 인증 후 로그인해줘."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "회원가입 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900">YUL HR 회원가입</h1>
          <p className="mt-2 text-sm text-zinc-600">
            비밀번호 기반 계정을 먼저 만들고, 필요하면 매직링크 로그인도 함께 사용할 수 있어.
          </p>
        </div>

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

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSignup} className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">이름</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
                required
              />
            </label>

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
                placeholder="최소 6자 이상"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
                required
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">비밀번호 확인</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호 다시 입력"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
                required
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">계정 유형</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
              >
                <option value="company">고객 회사</option>
                <option value="labor">노무사</option>
              </select>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "가입 중..." : "회원가입"}
            </button>
          </form>
        </section>

        <div className="mt-8 text-sm text-zinc-600">
          이미 계정이 있으면{" "}
          <Link href="/login" className="font-semibold text-zinc-900 underline">
            로그인
          </Link>
        </div>
      </div>
    </main>
  );
}