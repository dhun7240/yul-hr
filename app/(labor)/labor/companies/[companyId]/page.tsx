"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type CompanyItem = {
  id: string;
  name: string;
  business_number: string;
  representative_name: string;
  email: string;
  phone: string;
  address: string;
};

type PayrollPeriodItem = {
  id: string;
  company_id: string;
  company_name: string;
  payroll_year: number;
  payroll_month: number;
  status: string;
};

function card() {
  return "rounded-[28px] border border-zinc-200 bg-white px-8 py-6 shadow-sm";
}

function formatBusinessNumber(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (digits.length !== 10) return value;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
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

export default function LaborCompanyDetailPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const [companyId, setCompanyId] = useState("");
  const [company, setCompany] = useState<CompanyItem | null>(null);
  const [periods, setPeriods] = useState<PayrollPeriodItem[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function resolveParams() {
      const resolved = await params;
      if (cancelled) return;
      setCompanyId(resolved.companyId);
    }

    void resolveParams();

    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    if (!companyId) return;
    void load();
  }, [companyId]);

  async function load() {
    setErrorMessage("");

    const [companyRes, periodRes] = await Promise.all([
      fetch("/api/labor/companies", {
        cache: "no-store",
        credentials: "include",
      }),
      fetch(`/api/payroll/periods?company_id=${encodeURIComponent(companyId)}`, {
        cache: "no-store",
        credentials: "include",
      }),
    ]);

    const companyJson = await companyRes.json().catch(() => null);
    const periodJson = await periodRes.json().catch(() => null);

    if (!companyRes.ok) {
      setErrorMessage(companyJson?.error ?? "회사 정보를 불러오지 못했습니다.");
      return;
    }

    if (!periodRes.ok) {
      setErrorMessage(periodJson?.error ?? "급여월 목록을 불러오지 못했습니다.");
      return;
    }

    const companies = Array.isArray(companyJson?.companies) ? companyJson.companies : [];
    const found = companies.find((item: CompanyItem) => item.id === companyId) ?? null;

    if (!found) {
      setErrorMessage("담당 회사가 아니므로 접근할 수 없습니다.");
      setCompany(null);
      setPeriods([]);
      return;
    }

    setCompany(found);
    setPeriods(
      Array.isArray(periodJson?.periods)
        ? periodJson.periods
        : Array.isArray(periodJson)
        ? periodJson
        : []
    );
  }

  const sortedPeriods = useMemo(() => {
    return [...periods].sort((a, b) => {
      if (a.payroll_year !== b.payroll_year) return b.payroll_year - a.payroll_year;
      if (a.payroll_month !== b.payroll_month) return b.payroll_month - a.payroll_month;
      return 0;
    });
  }, [periods]);

  return (
    <div className="space-y-5">
      <section className={card()}>
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
          <div>
            <div className="text-xs font-extrabold tracking-wide text-orange-500">
              COMPANY DETAIL
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900">
              {company?.name || "회사 정보"}
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              담당 회사에 대한 기본 정보와 급여월 현황입니다.
            </p>
          </div>

          <Link
            href="/labor/companies"
            className="inline-flex h-10 items-center rounded-2xl border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-700 whitespace-nowrap"
          >
            목록으로
          </Link>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {errorMessage}
          </div>
        ) : null}

        {company ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 px-5 py-4">
              <div className="text-sm font-semibold text-zinc-500">사업자등록번호</div>
              <div className="mt-2 text-base font-bold text-zinc-900">
                {formatBusinessNumber(company.business_number)}
              </div>
            </div>

            <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 px-5 py-4">
              <div className="text-sm font-semibold text-zinc-500">대표자</div>
              <div className="mt-2 text-base font-bold text-zinc-900">
                {company.representative_name || "-"}
              </div>
            </div>

            <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 px-5 py-4">
              <div className="text-sm font-semibold text-zinc-500">이메일</div>
              <div className="mt-2 text-base font-bold text-zinc-900">{company.email || "-"}</div>
            </div>

            <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 px-5 py-4">
              <div className="text-sm font-semibold text-zinc-500">연락처</div>
              <div className="mt-2 text-base font-bold text-zinc-900">{company.phone || "-"}</div>
            </div>

            <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 px-5 py-4 md:col-span-2">
              <div className="text-sm font-semibold text-zinc-500">주소</div>
              <div className="mt-2 text-base font-bold text-zinc-900">{company.address || "-"}</div>
            </div>
          </div>
        ) : null}
      </section>

      <section className={card()}>
        <div className="text-lg font-extrabold text-zinc-900">급여월 목록</div>
        <div className="mt-1 text-sm text-zinc-500">해당 회사의 급여월만 표시됩니다.</div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm md:min-w-0">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-5 py-4 text-left font-bold text-zinc-700 md:px-4 md:py-3">
                    <span className="whitespace-nowrap">급여월</span>
                  </th>
                  <th className="px-5 py-4 text-left font-bold text-zinc-700 md:px-4 md:py-3">
                    <span className="whitespace-nowrap">상태</span>
                  </th>
                  <th className="px-5 py-4 text-left font-bold text-zinc-700 md:px-4 md:py-3">
                    <span className="whitespace-nowrap">열기</span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {sortedPeriods.length ? (
                  sortedPeriods.map((item) => (
                    <tr key={item.id} className="border-t border-zinc-100">
                      <td className="px-5 py-4 text-zinc-900 md:px-4 md:py-3">
                        <span className="whitespace-nowrap">
                          {item.payroll_year}년 {item.payroll_month}월
                        </span>
                      </td>
                      <td className="px-5 py-4 md:px-4 md:py-3">
                        <span className={statusBadge(item.status)}>{statusText(item.status)}</span>
                      </td>
                      <td className="px-5 py-4 md:px-4 md:py-3">
                        <Link
                          href={`/labor/payroll/${item.id}`}
                          className="inline-flex h-10 items-center rounded-2xl border border-orange-200 bg-orange-50 px-4 text-sm font-bold text-orange-600 whitespace-nowrap"
                        >
                          검토하기
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-zinc-400" colSpan={3}>
                      생성된 급여월이 없습니다.
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