"use client";

import { useEffect, useRef, useState } from "react";

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

export default function CompanyPayrollUploadPage({
  params,
}: {
  params: Promise<{ periodId: string }>;
}) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const [periodId, setPeriodId] = useState("");
  const [period, setPeriod] = useState<PeriodInfo | null>(null);
  const [currentFile, setCurrentFile] = useState<UploadedFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const canEdit = ["draft", "needs_revision"].includes(period?.status ?? "draft");

  useEffect(() => {
    let cancelled = false;

    async function resolveParams() {
      const resolved = await params;
      if (cancelled) return;
      setPeriodId(resolved.periodId);
    }

    void resolveParams();

    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    if (!periodId) return;
    void load();
  }, [periodId]);

  async function load() {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const [periodRes, fileRes] = await Promise.all([
      fetch(`/api/payroll/periods/${encodeURIComponent(periodId)}`, {
        cache: "no-store",
        credentials: "include",
      }),
      fetch(
        `/api/payroll/documents?period_id=${encodeURIComponent(periodId)}&scope=company_reference`,
        {
          cache: "no-store",
          credentials: "include",
        }
      ),
    ]);

    const periodJson = await periodRes.json().catch(() => null);
    const fileJson = await fileRes.json().catch(() => null);

    if (!periodRes.ok) {
      setErrorMessage(periodJson?.error ?? "급여월 정보를 불러오지 못했습니다.");
      setLoading(false);
      return;
    }

    if (!fileRes.ok) {
      setErrorMessage(fileJson?.error ?? "업로드 파일 정보를 불러오지 못했습니다.");
      setLoading(false);
      return;
    }

    setPeriod(periodJson?.period ?? null);
    setCurrentFile(fileJson?.file ?? null);
    setLoading(false);
  }

  async function handleUpload(file: File) {
    if (!canEdit) return;

    setUploading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("period_id", periodId);
    formData.append("scope", "company_reference");

    const res = await fetch("/api/payroll/documents", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      setErrorMessage(json?.error ?? "파일 업로드 실패");
      setUploading(false);
      return;
    }

    setCurrentFile(json?.file ?? null);
    setSuccessMessage("파일이 업로드되었습니다.");
    setUploading(false);
  }

  async function handleDelete() {
    if (!canEdit || !currentFile?.path) return;

    setDeleting(true);
    setErrorMessage("");
    setSuccessMessage("");

    const res = await fetch(
      `/api/payroll/documents?period_id=${encodeURIComponent(periodId)}&scope=company_reference&path=${encodeURIComponent(currentFile.path)}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      setErrorMessage(json?.error ?? "파일 삭제 실패");
      setDeleting(false);
      return;
    }

    setCurrentFile(null);
    setSuccessMessage("파일이 삭제되었습니다.");
    setDeleting(false);
  }

  return (
    <section className={card()}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-extrabold tracking-wide text-orange-500">
            PAYROLL REFERENCE FILES
          </div>
          <h1 className="mt-2 text-2xl font-extrabold text-zinc-900">급여 자료 업로드</h1>
          <p className="mt-2 text-sm text-zinc-500">
            직원 관리 또는 직원 급여 정보 관련 참고자료가 있으시면 업로드해주세요.
          </p>
        </div>
      </div>

      {period?.rejection_reason ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          수정 요청 사유: {period.rejection_reason}
        </div>
      ) : null}

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

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={() => uploadInputRef.current?.click()}
          disabled={!canEdit || uploading || loading}
          className="h-11 rounded-2xl bg-orange-500 px-6 font-bold text-white disabled:opacity-50"
        >
          {uploading ? "업로드 중..." : "업로드"}
        </button>

        {currentFile ? (
          <>
            <button
              onClick={() => replaceInputRef.current?.click()}
              disabled={!canEdit || uploading || loading}
              className="h-11 rounded-2xl border border-zinc-300 bg-white px-6 font-bold disabled:opacity-50"
            >
              파일 변경
            </button>

            <button
              onClick={() => void handleDelete()}
              disabled={!canEdit || deleting || loading}
              className="h-11 rounded-2xl border border-red-200 bg-red-50 px-6 font-bold text-red-600 disabled:opacity-50"
            >
              {deleting ? "삭제 중..." : "삭제"}
            </button>
          </>
        ) : null}

        <input
          ref={uploadInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              void handleUpload(file);
            }
            e.currentTarget.value = "";
          }}
        />

        <input
          ref={replaceInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              void handleUpload(file);
            }
            e.currentTarget.value = "";
          }}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
        {loading ? (
          <div className="text-sm text-zinc-500">불러오는 중...</div>
        ) : currentFile ? (
          <div className="space-y-1">
            <div className="text-sm font-semibold text-zinc-900">{currentFile.name}</div>
            <div className="text-xs text-zinc-500">
              {(currentFile.size / 1024).toFixed(1)} KB
            </div>
          </div>
        ) : (
          <div className="text-sm text-zinc-500">업로드된 참고자료가 없습니다.</div>
        )}
      </div>
    </section>
  );
}