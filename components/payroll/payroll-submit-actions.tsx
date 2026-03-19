"use client";

import { useState } from "react";

export default function PayrollSubmitActions({
  periodId,
  status,
  onChanged,
}: {
  periodId: string;
  status: string;
  onChanged?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const canSubmit = status === "draft" || status === "needs_revision";

  async function handleSubmit() {
    if (!canSubmit) {
      alert("현재 상태에서는 제출할 수 없어.");
      return;
    }

    if (!confirm("노무사에게 제출할까? 제출 후에는 수정 요청 전까지 잠겨.")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/payroll/periods/${periodId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        throw new Error(data?.error || "제출 실패");
      }

      alert("제출 완료");
      onChanged?.();
    } catch (error) {
      alert(error instanceof Error ? error.message : "제출 중 오류가 발생했어.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-zinc-900">제출</h3>
      <p className="mt-1 text-sm text-zinc-500">
        현재 상태: <span className="font-medium">{status}</span>
      </p>
      <div className="mt-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "처리 중..." : "노무사에게 제출"}
        </button>
      </div>
    </div>
  );
}