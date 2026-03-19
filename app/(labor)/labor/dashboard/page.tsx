"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CompanyConnectionRequestPanel from "./_company-connection-request-panel";
import ConnectedCompaniesPanel from "./_connected-companies-panel";

type CompanyItem = {
  id: string;
  name: string;
  business_number: string;
  representative_name: string;
  email: string;
  phone: string;
  address: string;
  employee_count: number;
  payroll_period_count: number;
};

type PayrollPeriodItem = {
  id: string;
  company_id: string;
  company_name: string;
  payroll_year: number | null;
  payroll_month: number | null;
  status: string;
};

type CompaniesResponse = {
  labor_name?: string;
  companies?: CompanyItem[];
  error?: string;
};

function card() {
  return "rounded-[28px] border border-zinc-200 bg-white px-8 py-6 shadow-sm";
}

function statusBadge(status: string) {
  switch (status) {
    case "submitted":
      return "inline-flex h-8 items-center rounded-full bg-orange-50 px-3 text-xs font-bold text-orange-600 whitespace-nowrap";
    case "needs_revision":
      return "inline-flex h-8 items-center rounded-full bg-red-50 px-3 text-xs font-bold text-red-600 whitespace-nowrap";
    case "completed":
      return "inline-flex h-8 items-center rounded-full bg-emerald-50 px-3 text-xs font-bold text-emerald-700 whitespace-nowrap";
    default:
      return "inline-flex h-8 items-center rounded-full bg-zinc-100 px-3 text-xs font-bold text-zinc-600 whitespace-nowrap";
  }
}

function statusText(status: string) {
  switch (status) {
    case "submitted":
      return "검토 대기";
    case "needs_revision":
      return "수정 요청";
    case "completed":
      return "검토 완료";
    default:
      return "작성 중";
  }
}

export default function LaborDashboardPage() {
  const [laborName, setLaborName] = useState("");
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriodItem[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setErrorMessage("");

    const [companyRes, periodRes] = await Promise.all([
      fetch("/api/labor/companies", {
        cache: "no-store",
        credentials: "include",
      }),
      fetch("/api/payroll/periods", {
        cache: "no-store",
        credentials: "include",
      }),
    ]);

    const companyJson = (await companyRes.json().catch(() => null)) as CompaniesResponse | null;
    const periodJson = await periodRes.json().catch(() => null);

    if (!companyRes.ok) {
      setErrorMessage(companyJson?.error ?? "대시보드를 불러오지 못했습니다.");
      return;
    }

    if (!periodRes.ok) {
      setErrorMessage(periodJson?.error ?? "급여월 목록을 불러오지 못했습니다.");
      return;
    }

    setLaborName((companyJson?.labor_name ?? "").trim());
    setCompanies(Array.isArray(companyJson?.companies) ? companyJson.companies : []);
    setPeriods(
      Array.isArray(periodJson?.periods)
        ? periodJson.periods
        : Array.isArray(periodJson)
        ? periodJson
        : []
    );
  }

  const submittedPeriods = useMemo(
    () => periods.filter((item) => item.status === "submitted"),
    [periods]
  );

  const needsRevisionPeriods = useMemo(
    () => periods.filter((item) => item.status === "needs_revision"),
    [periods]
  );

  return (
    <div className="space-y-5">
      <section className={`${card()} max-w-[860px]`}>
        <div className="text-xs font-extrabold tracking-wide text-orange-500">
          LABOR DASHBOARD
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900">
          {laborName ? `${laborName} 노무사` : "노무사"}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          내게 배정된 회사와 해당 회사의 급여 검토 현황만 표시됩니다.
        </p>

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {errorMessage}
          </div>
        ) : null}
      </section>

      <div className="max-w-[860px]">
        <CompanyConnectionRequestPanel onSuccess={load} />
      </div>

      <div className="max-w-[860px]">
        <ConnectedCompaniesPanel />
      </div>

      <section className="grid max-w-[860px] gap-5 md:grid-cols-3">
        <div className={card()}>
          <div className="text-sm font-semibold text-zinc-500">담당 회사 수</div>
          <div className="mt-3 text-4xl font-extrabold text-zinc-900">
            {companies.length}
          </div>
        </div>

        <div className={card()}>
          <div className="text-sm font-semibold text-zinc-500">검토 대기</div>
          <div className="mt-3 text-4xl font-extrabold text-zinc-900">
            {submittedPeriods.length}
          </div>
        </div>

        <div className={card()}>
          <div className="text-sm font-semibold text-zinc-500">수정 요청 중</div>
          <div className="mt-3 text-4xl font-extrabold text-zinc-900">
            {needsRevisionPeriods.length}
          </div>
        </div>
      </section>

      <section className={`${card()} max-w-[860px]`}>
        <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-extrabold text-zinc-900">
              최근 급여 검토 현황
            </div>
            <div className="mt-1 text-sm text-zinc-500">
              내 담당 회사의 급여월만 표시됩니다.
            </div>
          </div>

          <Link
            href="/labor/companies"
            className="inline-flex h-10 items-center rounded-2xl border border-orange-200 bg-orange-50 px-4 text-sm font-bold text-orange-600 whitespace-nowrap"
          >
            회사 목록 보기
          </Link>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] table-auto text-sm md:min-w-0 md:table-fixed">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="w-[300px] px-6 py-4 text-left font-bold text-zinc-700 md:w-[28%] md:px-4 md:py-3">
                    <span className="whitespace-nowrap">회사</span>
                  </th>
                  <th className="w-[220px] px-6 py-4 text-left font-bold text-zinc-700 md:w-[24%] md:px-4 md:py-3">
                    <span className="whitespace-nowrap">급여월</span>
                  </th>
                  <th className="w-[180px] px-6 py-4 text-left font-bold text-zinc-700 md:w-[20%] md:px-4 md:py-3">
                    <span className="whitespace-nowrap">상태</span>
                  </th>
                  <th className="w-[220px] px-6 py-4 text-left font-bold text-zinc-700 md:w-[28%] md:px-4 md:py-3">
                    <span className="whitespace-nowrap">열기</span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {periods.length ? (
                  periods.slice(0, 10).map((item) => (
                    <tr key={item.id} className="border-t border-zinc-100">
                      <td className="px-6 py-4 text-left font-semibold text-zinc-900 md:px-4 md:py-3">
                        <span className="whitespace-nowrap">{item.company_name || "-"}</span>
                      </td>

                      <td className="px-6 py-4 text-left text-zinc-600 md:px-4 md:py-3">
                        <span className="whitespace-nowrap">
                          {item.payroll_year ?? "-"}년 {item.payroll_month ?? "-"}월
                        </span>
                      </td>

                      <td className="px-6 py-4 text-left md:px-4 md:py-3">
                        <div className="flex justify-start">
                          <span className={statusBadge(item.status)}>
                            {statusText(item.status)}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-left md:px-4 md:py-3">
                        <div className="flex justify-start">
                          <Link
                            href={`/labor/payroll/${item.id}`}
                            className="inline-flex h-10 items-center rounded-2xl border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-700 whitespace-nowrap"
                          >
                            검토하기
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      className="px-6 py-8 text-center text-sm text-zinc-400 md:px-4"
                      colSpan={4}
                    >
                      표시할 급여월이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}