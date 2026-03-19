"use client";

import { FormEvent, useState } from "react";
import InputBusinessNumber from "@/components/forms/input-business-number";

function card() {
  return "rounded-[28px] border border-zinc-200 bg-white px-8 py-6 shadow-sm";
}

type Props = {
  onSuccess?: () => void;
};

type RequestResponse = {
  error?: string;
  success?: boolean;
};

async function safeJsonFetch<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      credentials: "include",
      ...init,
    });

    const text = await res.text();
    if (!text) return null;

    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

function normalizeBusinessNumber(value: string) {
  return value.replace(/[^\d]/g, "");
}

export default function CompanyConnectionRequestPanel({ onSuccess }: Props) {
  const [businessNumber, setBusinessNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const normalizedBusinessNumber = normalizeBusinessNumber(businessNumber);

    if (normalizedBusinessNumber.length !== 10) {
      setErrorMessage("사업자등록번호 10자리를 정확히 입력해주세요.");
      setSuccessMessage("");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    const result = await safeJsonFetch<RequestResponse>("/api/labor/connection-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        business_number: normalizedBusinessNumber,
      }),
    });

    if (result?.error) {
      setErrorMessage(result.error);
      setSubmitting(false);
      return;
    }

    setSuccessMessage("연결 요청을 전송했습니다.");
    setBusinessNumber("");
    setSubmitting(false);
    onSuccess?.();
  }

  return (
    <section className={card()}>
      <div className="flex flex-col gap-2">
        <div className="text-lg font-extrabold text-zinc-900">자문사 연결 요청</div>
        <div className="text-sm text-zinc-500">
          사업자등록번호로 회사를 찾아 연결 요청을 보냅니다.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px]">
          <InputBusinessNumber
            value={businessNumber}
            onChange={setBusinessNumber}
            placeholder="사업자등록번호 입력"
            className="h-12 w-full rounded-2xl border border-zinc-200 px-5 text-[15px] font-medium leading-none placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none"
            disabled={submitting}
          />

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-orange-500 bg-orange-500 px-5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-200 disabled:text-zinc-500"
          >
            {submitting ? "전송 중..." : "연결 요청"}
          </button>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {successMessage}
          </div>
        ) : null}
      </form>
    </section>
  );
}