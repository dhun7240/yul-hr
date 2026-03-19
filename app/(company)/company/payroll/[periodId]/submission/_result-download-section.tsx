"use client";

import { useEffect, useMemo, useState } from "react";

type PeriodInfo = {
  id: string;
  status: string;
  rejection_reason?: string;
};

type UploadedFile = {
  name: string;
  path: string;
  size: number;
  updated_at?: string;
};

function card() {
  return "rounded-[28px] border border-zinc-200 bg-white px-8 py-6 shadow-sm max-w-[1180px]";
}

function sectionTitle() {
  return "text-xs font-extrabold tracking-wide text-orange-500";
}

function stateButtonClass(active: boolean) {
  return [
    "h-11 rounded-2xl px-5 font-bold",
    "w-full sm:w-auto",
    active
      ? "border-2 border-orange-400 bg-white text-orange-600"
      : "border border-zinc-300 bg-white text-zinc-500",
  ].join(" ");
}

function fileButtonClass(enabled: boolean) {
  return [
    "h-11 rounded-2xl px-5 font-bold",
    "w-full sm:w-auto",
    enabled
      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border border-zinc-200 bg-zinc-50 text-zinc-400",
  ].join(" ");
}

async function safeJsonFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      credentials: "include",
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

export default function ResultDownloadSection({ periodId }: { periodId: string }) {
  const [period, setPeriod] = useState<PeriodInfo | null>(null);
  const [payrollRegisterFile, setPayrollRegisterFile] = useState<UploadedFile | null>(null);
  const [payslipFile, setPayslipFile] = useState<UploadedFile | null>(null);

  useEffect(() => {
    void load();
  }, [periodId]);

  async function load() {
    const [periodJson, registerJson, payslipJson] = await Promise.all([
      safeJsonFetch<{ period?: PeriodInfo }>(`/api/payroll/periods/${encodeURIComponent(periodId)}`),
      safeJsonFetch<{ file?: UploadedFile | null }>(
        `/api/payroll/documents?period_id=${encodeURIComponent(periodId)}&scope=labor_register`
      ),
      safeJsonFetch<{ file?: UploadedFile | null }>(
        `/api/payroll/documents?period_id=${encodeURIComponent(periodId)}&scope=labor_payslip`
      ),
    ]);

    setPeriod(periodJson?.period ?? null);
    setPayrollRegisterFile(registerJson?.file ?? null);
    setPayslipFile(payslipJson?.file ?? null);
  }

  const highlight = useMemo(() => {
    if (period?.status === "completed") return "completed";
    if (period?.status === "submitted" || period?.status === "needs_revision") return "reviewing";
    return "before_submit";
  }, [period]);

  async function handleDownload(path?: string) {
    if (!path) return;

    const result = await safeJsonFetch<{ url?: string }>(
      `/api/payroll/documents?period_id=${encodeURIComponent(
        periodId
      )}&path=${encodeURIComponent(path)}&download=1`
    );

    if (result?.url) {
      window.open(result.url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <section className={card()}>
      <div className={sectionTitle()}>PAYROLL RESULTS</div>
      <h2 className="mt-2 text-2xl font-extrabold text-zinc-900">
        급여대장 및 급여명세서 다운로드
      </h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        자료 제출부터 노무사 검토 완료까지 진행 상태를 확인하시고, 완료된 산출물을 다운로드하실 수 있습니다.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-center">
        <button className={stateButtonClass(highlight === "before_submit")}>자료제출 전</button>
        <button className={stateButtonClass(highlight === "reviewing")}>노무사 검토 중</button>
        <button className={stateButtonClass(highlight === "completed")}>노무사 검토 완료</button>

        <button
          onClick={() => void handleDownload(payrollRegisterFile?.path)}
          disabled={!payrollRegisterFile}
          className={fileButtonClass(Boolean(payrollRegisterFile))}
        >
          급여대장 다운로드
        </button>

        <button
          onClick={() => void handleDownload(payslipFile?.path)}
          disabled={!payslipFile}
          className={fileButtonClass(Boolean(payslipFile))}
        >
          급여명세서 다운로드
        </button>
      </div>
    </section>
  );
}