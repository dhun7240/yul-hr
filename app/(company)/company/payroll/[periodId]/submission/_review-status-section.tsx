"use client";

import { useEffect, useState } from "react";

type PeriodInfo = {
  id: string;
  status: string;
  rejection_reason?: string;
  submitted_at?: string;
  reviewed_at?: string;
};

function card() {
  return "rounded-[28px] border border-zinc-200 bg-white px-6 py-5 shadow-sm max-w-[1180px] md:px-8 md:py-6";
}

function sectionTitle() {
  return "text-xs font-extrabold tracking-wide text-orange-500";
}

function mapStatus(status: string) {
  switch (status) {
    case "submitted":
      return "검토중";
    case "needs_revision":
      return "수정요청";
    case "completed":
      return "검토완료";
    default:
      return "제출 전";
  }
}

function headClass() {
  return "px-4 py-3 text-left text-sm font-bold text-zinc-700 whitespace-nowrap";
}

function cellClass() {
  return "px-4 py-3 text-sm text-zinc-700 whitespace-nowrap";
}

export default function ReviewStatusSection({ periodId }: { periodId: string }) {
  const [period, setPeriod] = useState<PeriodInfo | null>(null);

  useEffect(() => {
    void load();
  }, [periodId]);

  async function load() {
    const res = await fetch(`/api/payroll/periods/${encodeURIComponent(periodId)}`, {
      cache: "no-store",
      credentials: "include",
    });

    const json = await res.json().catch(() => null);
    setPeriod(json?.period ?? null);
  }

  return (
    <section className={card()}>
      <div className={sectionTitle()}>LABOR REVIEW</div>

      <h2 className="mt-2 text-2xl font-extrabold text-zinc-900">
        노무사 검토 현황
      </h2>

      <p className="mt-2 text-sm leading-6 text-zinc-500">
        현재 제출 자료에 대한 노무사 검토 상태를 확인하실 수 있습니다.
      </p>

      {/* 모바일 가로 스크롤 */}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200">
        <table className="w-max min-w-[720px] text-sm md:w-full">
          <thead className="bg-zinc-50">
            <tr>
              <th className={`${headClass()} min-w-[140px]`}>검토 현황</th>
              <th className={`${headClass()} min-w-[180px]`}>제출일시</th>
              <th className={`${headClass()} min-w-[180px]`}>검토일시</th>
              <th className={`${headClass()} min-w-[220px]`}>비고</th>
            </tr>
          </thead>

          <tbody>
            <tr className="border-t border-zinc-100">
              <td className={`${cellClass()} min-w-[140px]`}>
                {mapStatus(period?.status ?? "draft")}
              </td>

              <td className={`${cellClass()} min-w-[180px]`}>
                {period?.submitted_at || "-"}
              </td>

              <td className={`${cellClass()} min-w-[180px]`}>
                {period?.reviewed_at || "-"}
              </td>

              <td className={`${cellClass()} min-w-[220px]`}>
                {period?.rejection_reason || "-"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}