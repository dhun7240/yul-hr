"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PayrollPeriodItem = {
  id: string;
  payroll_year?: number | null;
  payroll_month?: number | null;
  status?: string | null;
  month?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  confirmed_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  note?: string | null;
};

type PayrollPeriodsResponse = {
  periods?: PayrollPeriodItem[];
  error?: string;
};

type PayrollPeriodResponse = {
  period?: PayrollPeriodItem | null;
  error?: string;
};

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

function getStatusLabel(status?: string | null) {
  switch (status) {
    case "draft":
      return "입력 중";
    case "submitted":
      return "제출 완료";
    case "needs_revision":
      return "수정 요청";
    case "completed":
      return "확정 완료";
    default:
      return "-";
  }
}

function getStatusClass(status?: string | null) {
  switch (status) {
    case "draft":
      return "border border-zinc-200 bg-zinc-100 text-zinc-700";
    case "submitted":
      return "border border-orange-200 bg-orange-50 text-orange-700";
    case "needs_revision":
      return "border border-red-200 bg-red-50 text-red-700";
    case "completed":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border border-zinc-200 bg-zinc-100 text-zinc-500";
  }
}

function formatPeriodLabel(item: PayrollPeriodItem) {
  if (item.payroll_year && item.payroll_month) {
    return `${item.payroll_year}년 ${String(item.payroll_month).padStart(2, "0")}월`;
  }

  if (item.month?.trim()) {
    return item.month;
  }

  return "-";
}

function sortPeriods(items: PayrollPeriodItem[]) {
  return [...items].sort((a, b) => {
    const aValue = (a.payroll_year ?? 0) * 100 + (a.payroll_month ?? 0);
    const bValue = (b.payroll_year ?? 0) * 100 + (b.payroll_month ?? 0);
    return bValue - aValue;
  });
}

function cardClass() {
  return "rounded-[28px] border border-zinc-200 bg-white px-6 py-6 shadow-sm md:px-8 md:py-8";
}

function inputClass() {
  return "h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-[15px] font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none";
}

function headClass() {
  return "border-b border-zinc-200 px-6 py-4 text-left text-sm font-bold text-zinc-600 align-middle";
}

function cellClass() {
  return "border-b border-zinc-100 px-6 py-4 text-sm align-middle";
}

export default function CompanyPayrollPage() {
  const today = new Date();
  const [year, setYear] = useState(String(today.getFullYear()));
  const [month, setMonth] = useState(String(today.getMonth() + 1).padStart(2, "0"));
  const [items, setItems] = useState<PayrollPeriodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function load() {
    setLoading(true);
    setErrorMessage("");

    const data = await safeJsonFetch<PayrollPeriodsResponse>("/api/payroll/periods");

    if (data?.error) {
      setErrorMessage(data.error);
      setItems([]);
      setLoading(false);
      return;
    }

    setItems(sortPeriods(Array.isArray(data?.periods) ? data.periods : []));
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const hasItems = useMemo(() => items.length > 0, [items]);

  async function handleCreatePeriod() {
    setCreating(true);
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      payroll_year: Number(year),
      payroll_month: Number(month),
    };

    const data = await safeJsonFetch<PayrollPeriodResponse>("/api/payroll/periods", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (data?.error) {
      setErrorMessage(data.error);
      setCreating(false);
      return;
    }

    setSuccessMessage("급여월이 생성되었습니다.");
    await load();
    setCreating(false);
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <div className="mx-auto max-w-5xl px-4 py-4 md:px-6 md:py-10">
        <div className="space-y-5">
          <section className={cardClass()}>
            <div className="text-xs font-extrabold tracking-wide text-orange-500">PAYROLL RUN</div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900">
              급여월 생성
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              월별 급여 입력 작업을 시작할 급여월을 생성합니다.
            </p>

            <div className="mt-8 flex flex-wrap items-end gap-4">
              <div className="max-w-[160px]">
                <label className="mb-2 block text-sm font-semibold text-zinc-700">연도</label>
                <input
                  value={year}
                  onChange={(e) => setYear(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                  className={inputClass()}
                  inputMode="numeric"
                  placeholder="2026"
                />
              </div>

              <div className="max-w-[140px]">
                <label className="mb-2 block text-sm font-semibold text-zinc-700">월</label>
                <input
                  value={month}
                  onChange={(e) => setMonth(e.target.value.replace(/[^\d]/g, "").slice(0, 2))}
                  className={inputClass()}
                  inputMode="numeric"
                  placeholder="03"
                />
              </div>

              <button
                type="button"
                onClick={handleCreatePeriod}
                disabled={creating}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-orange-500 bg-orange-500 px-6 text-base font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-200 disabled:text-zinc-500"
              >
                {creating ? "생성 중..." : "급여월 생성"}
              </button>
            </div>

            {(errorMessage || successMessage) && (
              <div className="mt-6 space-y-3">
                {errorMessage ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                    {errorMessage}
                  </div>
                ) : null}

                {successMessage ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    {successMessage}
                  </div>
                ) : null}
              </div>
            )}
          </section>

          <section className={cardClass()}>
            <div className="text-xs font-extrabold tracking-wide text-orange-500">PAYROLL LIST</div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900">
              급여월 목록
            </h2>

            <div className="mt-6 overflow-x-auto">
              <table className="w-max min-w-[860px] border-collapse md:min-w-full">
                <thead>
                  <tr className="bg-zinc-50">
                    <th className={`${headClass()} min-w-[180px] whitespace-nowrap`}>
                      급여월
                    </th>
                    <th className={`${headClass()} min-w-[140px] whitespace-nowrap`}>
                      상태
                    </th>
                    <th className={`${headClass()} min-w-[320px] whitespace-nowrap`}>
                      비고
                    </th>
                    <th className={`${headClass()} min-w-[140px] whitespace-nowrap`}>
                      이동
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && !hasItems ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-sm font-medium text-zinc-500">
                        생성된 급여월 없음
                      </td>
                    </tr>
                  ) : null}

                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className={`${cellClass()} min-w-[180px] whitespace-nowrap font-semibold text-zinc-900`}>
                        {formatPeriodLabel(item)}
                      </td>
                      <td className={`${cellClass()} min-w-[140px] whitespace-nowrap`}>
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold",
                            getStatusClass(item.status),
                          ].join(" ")}
                        >
                          {getStatusLabel(item.status)}
                        </span>
                      </td>
                      <td className={`${cellClass()} min-w-[320px] text-zinc-700`}>
                        <div className="max-w-[320px] truncate">
                          {item.rejection_reason || item.note || "-"}
                        </div>
                      </td>
                      <td className={`${cellClass()} min-w-[140px] whitespace-nowrap`}>
                        <Link
                          href={`/company/payroll/${item.id}`}
                          className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50"
                        >
                          열기
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-sm font-medium text-zinc-500">
                        불러오는 중...
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}