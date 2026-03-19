"use client";

import { useRef } from "react";

type EmployeeImportCardProps = {
  uploading?: boolean;
  deletingBatch?: boolean;
  hasSelection?: boolean;
  hasUploadedFile?: boolean;
  onUpload: (file: File) => void;
  onEditSelected: () => void;
  onDeleteSelected: () => void;
  onDownloadTemplate: () => void;
  uploadedFileName?: string;
  onDownloadUploadedFile?: () => void;
  onDeleteUploadedBatch?: () => void;
};

function cardClass() {
  return "rounded-[28px] border border-zinc-200 bg-white px-8 py-6 shadow-sm";
}

export default function EmployeeImportCard({
  uploading,
  deletingBatch,
  hasSelection,
  hasUploadedFile,
  onUpload,
  onEditSelected,
  onDeleteSelected,
  onDownloadTemplate,
  uploadedFileName,
  onDownloadUploadedFile,
  onDeleteUploadedBatch,
}: EmployeeImportCardProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const busy = Boolean(uploading || deletingBatch);

  return (
    <section className={`${cardClass()} max-w-[1180px]`}>
      <div className="text-xs font-extrabold tracking-wide text-orange-500">EXCEL IMPORT</div>
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900">
        엑셀로 등록하기
      </h2>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-orange-500 bg-orange-500 px-5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-200 disabled:text-zinc-500"
        >
          {uploading ? "업로드 중..." : hasUploadedFile ? "파일 다시 업로드" : "업로드"}
        </button>

        <button
          type="button"
          onClick={onEditSelected}
          disabled={!hasSelection || busy}
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-zinc-300 bg-white px-5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400"
        >
          수정
        </button>

        <button
          type="button"
          onClick={onDeleteSelected}
          disabled={!hasSelection || busy}
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-5 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400"
        >
          삭제
        </button>

        <button
          type="button"
          onClick={onDownloadTemplate}
          disabled={busy}
          className="ml-1 text-sm font-medium text-zinc-500 underline underline-offset-4 transition hover:text-zinc-700 disabled:cursor-not-allowed disabled:text-zinc-400"
        >
          엑셀 템플릿 내려받기
        </button>

        {hasUploadedFile && onDownloadUploadedFile ? (
          <button
            type="button"
            onClick={onDownloadUploadedFile}
            disabled={busy}
            className="text-sm font-medium text-zinc-500 underline underline-offset-4 transition hover:text-zinc-700 disabled:cursor-not-allowed disabled:text-zinc-400"
          >
            업로드 파일 확인하기
          </button>
        ) : null}

        {hasUploadedFile && onDeleteUploadedBatch ? (
          <button
            type="button"
            onClick={onDeleteUploadedBatch}
            disabled={busy}
            className="text-sm font-medium text-red-500 underline underline-offset-4 transition hover:text-red-600 disabled:cursor-not-allowed disabled:text-zinc-400"
          >
            {deletingBatch ? "업로드 파일 삭제 중..." : "업로드 파일 전체 삭제"}
          </button>
        ) : null}

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onUpload(file);
            }
            e.currentTarget.value = "";
          }}
        />
      </div>

      {uploadedFileName ? (
        <div className="mt-4 text-sm font-medium text-zinc-500">
          최근 업로드 파일: <span className="text-zinc-700">{uploadedFileName}</span>
        </div>
      ) : null}
    </section>
  );
}