"use client";

import { useEffect, useState } from "react";

type PeriodInfo = {
  id: string;
  status: string;
  rejection_reason?: string;
};

function card() {
  return "rounded-[28px] border border-zinc-200 bg-white px-8 py-6 shadow-sm max-w-[1180px]";
}

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

export default function SubmissionConfirmPanel({
  periodId,
}: {
  periodId: string;
}) {
  const [period, setPeriod] = useState<PeriodInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    void load();
  }, [periodId]);

  async function load() {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const result = await safeJsonFetch<{ period?: PeriodInfo; error?: string }>(
      `/api/payroll/periods/${encodeURIComponent(periodId)}`
    );

    if (result?.error) {
      setErrorMessage(result.error);
      setLoading(false);
      return;
    }

    setPeriod(result?.period ?? null);
    setLoading(false);
  }

  async function handleSubmit() {
    if (!canSubmit) return;

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    const result = await safeJsonFetch<{ period?: PeriodInfo; error?: string }>(
      `/api/payroll/periods/${encodeURIComponent(periodId)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "submit" }),
      }
    );

    if (result?.error) {
      setErrorMessage(result.error);
      setSubmitting(false);
      return;
    }

    setPeriod(result?.period ?? null);
    setSuccessMessage("최종 제출이 완료되었습니다.");
    setSubmitting(false);
  }

  const canSubmit = ["draft", "needs_revision"].includes(period?.status ?? "draft");

  return (
    <section className={card()}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-extrabold tracking-wide text-orange-500">
            FINAL SUBMISSION
          </div>
          <h1 className="mt-2 text-2xl font-extrabold text-zinc-900">제출 확정</h1>
          <p className="mt-2 text-sm text-zinc-500">
            입력 정보와 업로드 파일을 최종 제출합니다. 제출 후에는 수정할 수 없지만,
            노무사의 수정 요청이 있으면 다시 수정할 수 있습니다.
          </p>
        </div>

        <button
          onClick={() => void handleSubmit()}
          disabled={!canSubmit || loading || submitting}
          className="h-11 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 font-bold text-emerald-700 disabled:opacity-50"
        >
          {submitting ? "제출 중..." : "제출 확정"}
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

      {!canSubmit && !loading ? (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-600">
          현재 상태에서는 이미 제출이 완료되어 수정이 잠겨 있습니다.
        </div>
      ) : null}
    </section>
  );
}