"use client";

import { useRef, useState } from "react";
import type { UploadedFile } from "./page";

function card(maxWidth = "max-w-[860px]") {
  return `rounded-[28px] border border-zinc-200 bg-white px-8 py-6 shadow-sm ${maxWidth}`;
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

export default function ResultUploadPanel({
  periodId,
  registerFile,
  payslipFile,
  isCompleted,
  onChanged,
  onError,
  onSuccess,
}: {
  periodId: string;
  registerFile: UploadedFile | null;
  payslipFile: UploadedFile | null;
  isCompleted: boolean;
  onChanged: () => Promise<void> | void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const registerInputRef = useRef<HTMLInputElement | null>(null);
  const payslipInputRef = useRef<HTMLInputElement | null>(null);

  const [uploadingRegister, setUploadingRegister] = useState(false);
  const [uploadingPayslip, setUploadingPayslip] = useState(false);
  const [deletingRegister, setDeletingRegister] = useState(false);
  const [deletingPayslip, setDeletingPayslip] = useState(false);

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

  async function handleUpload(file: File, scope: "labor_register" | "labor_payslip") {
    if (scope === "labor_register") {
      setUploadingRegister(true);
    } else {
      setUploadingPayslip(true);
    }

    onError("");
    onSuccess("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("period_id", periodId);
    formData.append("scope", scope);

    const result = await safeJsonFetch<{ file?: UploadedFile | null; error?: string }>(
      "/api/payroll/documents",
      {
        method: "POST",
        body: formData,
      }
    );

    if (result?.error) {
      onError(result.error);
      setUploadingRegister(false);
      setUploadingPayslip(false);
      return;
    }

    await onChanged();
    onSuccess(
      scope === "labor_register"
        ? "급여대장을 업로드했습니다."
        : "급여명세서를 업로드했습니다."
    );
    setUploadingRegister(false);
    setUploadingPayslip(false);
  }

  async function handleDelete(scope: "labor_register" | "labor_payslip") {
    const targetFile = scope === "labor_register" ? registerFile : payslipFile;
    if (!targetFile?.path) return;

    if (scope === "labor_register") {
      setDeletingRegister(true);
    } else {
      setDeletingPayslip(true);
    }

    onError("");
    onSuccess("");

    const result = await safeJsonFetch<{ success?: boolean; error?: string }>(
      `/api/payroll/documents?period_id=${encodeURIComponent(periodId)}&path=${encodeURIComponent(
        targetFile.path
      )}`,
      {
        method: "DELETE",
      }
    );

    if (result?.error) {
      onError(result.error);
      setDeletingRegister(false);
      setDeletingPayslip(false);
      return;
    }

    await onChanged();
    onSuccess(
      scope === "labor_register"
        ? "급여대장을 삭제했습니다."
        : "급여명세서를 삭제했습니다."
    );
    setDeletingRegister(false);
    setDeletingPayslip(false);
  }

  return (
    <section className={card()}>
      <div className="text-lg font-extrabold text-zinc-900">산출물 업로드</div>
      <div className="mt-1 text-sm text-zinc-500">
        급여대장과 급여명세서를 업로드하면 회사 제출 내역 확인 화면에서 바로 다운로드할 수 있습니다.
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 px-5 py-5">
          <div className="text-sm font-semibold text-zinc-500">급여대장</div>
          <div className="mt-2 truncate text-sm font-bold text-zinc-900">
            {registerFile?.name ?? "업로드된 파일 없음"}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => registerInputRef.current?.click()}
              className="h-10 rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white"
            >
              {uploadingRegister ? "업로드 중..." : registerFile ? "파일 변경" : "업로드"}
            </button>

            <button
              onClick={() => void handleDownload(registerFile?.path)}
              disabled={!registerFile}
              className="h-10 rounded-2xl border border-zinc-300 bg-white px-4 text-sm font-bold disabled:opacity-50"
            >
              다운로드
            </button>

            <button
              onClick={() => void handleDelete("labor_register")}
              disabled={!registerFile || deletingRegister}
              className="h-10 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-600 disabled:opacity-50"
            >
              {deletingRegister ? "삭제 중..." : "삭제"}
            </button>
          </div>

          <input
            ref={registerInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file, "labor_register");
              e.currentTarget.value = "";
            }}
          />
        </div>

        <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 px-5 py-5">
          <div className="text-sm font-semibold text-zinc-500">급여명세서</div>
          <div className="mt-2 truncate text-sm font-bold text-zinc-900">
            {payslipFile?.name ?? "업로드된 파일 없음"}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => payslipInputRef.current?.click()}
              className="h-10 rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white"
            >
              {uploadingPayslip ? "업로드 중..." : payslipFile ? "파일 변경" : "업로드"}
            </button>

            <button
              onClick={() => void handleDownload(payslipFile?.path)}
              disabled={!payslipFile}
              className="h-10 rounded-2xl border border-zinc-300 bg-white px-4 text-sm font-bold disabled:opacity-50"
            >
              다운로드
            </button>

            <button
              onClick={() => void handleDelete("labor_payslip")}
              disabled={!payslipFile || deletingPayslip}
              className="h-10 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-600 disabled:opacity-50"
            >
              {deletingPayslip ? "삭제 중..." : "삭제"}
            </button>
          </div>

          <input
            ref={payslipInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file, "labor_payslip");
              e.currentTarget.value = "";
            }}
          />
        </div>
      </div>

      {isCompleted ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          현재 급여월은 검토 완료 상태입니다.
        </div>
      ) : null}
    </section>
  );
}