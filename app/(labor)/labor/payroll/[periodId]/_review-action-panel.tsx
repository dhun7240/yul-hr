"use client";

function card(maxWidth = "max-w-[860px]") {
  return `rounded-[28px] border border-zinc-200 bg-white px-8 py-6 shadow-sm ${maxWidth}`;
}

function textareaClass() {
  return "min-h-[120px] w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm focus:border-orange-400 focus:outline-none";
}

export default function ReviewActionPanel({
  revisionReason,
  onChangeRevisionReason,
  onRequestRevision,
  onComplete,
  onReopenReview,
  submittingRevision,
  submittingComplete,
  submittingReopen,
  isCompleted,
}: {
  revisionReason: string;
  onChangeRevisionReason: (value: string) => void;
  onRequestRevision: () => void;
  onComplete: () => void;
  onReopenReview: () => void;
  submittingRevision: boolean;
  submittingComplete: boolean;
  submittingReopen: boolean;
  isCompleted: boolean;
}) {
  return (
    <section className={card()}>
      <div className="text-lg font-extrabold text-zinc-900">검토 처리</div>
      <div className="mt-1 text-sm text-zinc-500">
        수정이 필요하면 사유를 남겨 회사로 다시 돌려보내고, 검토가 끝나면 완료 처리합니다.
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_auto_auto]">
        <div>
          <textarea
            className={textareaClass()}
            value={revisionReason}
            onChange={(e) => onChangeRevisionReason(e.target.value)}
            placeholder="수정 요청 사유를 입력하세요."
          />
        </div>

        <button
          onClick={onRequestRevision}
          disabled={submittingRevision}
          className="h-11 rounded-2xl border border-red-200 bg-red-50 px-6 font-bold text-red-600 disabled:opacity-50"
        >
          {submittingRevision ? "전달 중..." : "수정 요청"}
        </button>

        <button
          onClick={onComplete}
          disabled={submittingComplete || isCompleted}
          className="h-11 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 font-bold text-emerald-700 disabled:opacity-50"
        >
          {submittingComplete ? "처리 중..." : "검토 완료"}
        </button>

        <button
          onClick={onReopenReview}
          disabled={submittingReopen || !isCompleted}
          className="h-11 rounded-2xl border border-orange-500 bg-orange-500 px-6 font-bold text-white disabled:opacity-50"
        >
          {submittingReopen ? "처리 중..." : "재검토"}
        </button>
      </div>
    </section>
  );
}