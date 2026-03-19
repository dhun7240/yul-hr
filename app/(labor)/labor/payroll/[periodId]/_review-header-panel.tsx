"use client";

type PeriodInfo = {
  id: string;
  company_id: string;
  company_name: string;
  payroll_year: number | null;
  payroll_month: number | null;
  status: string;
};

function card(maxWidth = "max-w-[860px]") {
  return `rounded-[28px] border border-zinc-200 bg-white px-8 py-6 shadow-sm ${maxWidth}`;
}

function statusBadge(status: string) {
  switch (status) {
    case "submitted":
      return "inline-flex h-9 items-center rounded-full bg-orange-50 px-4 text-sm font-bold text-orange-600 whitespace-nowrap";
    case "needs_revision":
      return "inline-flex h-9 items-center rounded-full bg-red-50 px-4 text-sm font-bold text-red-600 whitespace-nowrap";
    case "completed":
      return "inline-flex h-9 items-center rounded-full bg-emerald-50 px-4 text-sm font-bold text-emerald-700 whitespace-nowrap";
    default:
      return "inline-flex h-9 items-center rounded-full bg-zinc-100 px-4 text-sm font-bold text-zinc-600 whitespace-nowrap";
  }
}

function statusText(status: string) {
  switch (status) {
    case "submitted":
      return "검토중";
    case "needs_revision":
      return "수정요청";
    case "completed":
      return "검토완료";
    default:
      return "작성중";
  }
}

export default function ReviewHeaderPanel({
  period,
  errorMessage,
  successMessage,
}: {
  period: PeriodInfo | null;
  errorMessage: string;
  successMessage: string;
}) {
  return (
    <section className={card()}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-extrabold tracking-wide text-orange-500">
            PAYROLL REVIEW
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900">
            {period?.company_name || "-"} · {period?.payroll_year ?? "-"}년{" "}
            {period?.payroll_month ?? "-"}월
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            제출 내역을 검토하고 수정 요청 또는 검토 완료 처리를 진행합니다.
          </p>
        </div>

        <div className="md:shrink-0">
          <div className={statusBadge(period?.status || "draft")}>
            {statusText(period?.status || "draft")}
          </div>
        </div>
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
    </section>
  );
}