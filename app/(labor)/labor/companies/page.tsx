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
  employee_count: number;
  payroll_period_count: number;
};

function card() {
  return "rounded-[28px] border border-zinc-200 bg-white px-8 py-6 shadow-sm";
}

function formatBusinessNumber(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (digits.length !== 10) return value;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export default function LaborCompaniesPage() {
  const [items, setItems] = useState<CompanyItem[]>([]);
  const [query, setQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setErrorMessage("");

    const res = await fetch("/api/labor/companies", {
      cache: "no-store",
      credentials: "include",
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      setErrorMessage(json?.error ?? "회사 목록을 불러오지 못했습니다.");
      return;
    }

    setItems(Array.isArray(json?.companies) ? json.companies : []);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) =>
      [
        item.name,
        item.business_number,
        item.representative_name,
        item.email,
        item.phone,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, query]);

  return (
    <div className="space-y-5">
      <section className={`${card()} max-w-[860px]`}>
        <div className="text-xs font-extrabold tracking-wide text-orange-500">
          ASSIGNED COMPANIES
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900">
          담당 회사 목록
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          현재 내 계정에 배정된 회사만 표시됩니다.
        </p>

        <div className="mt-6 max-w-[360px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="회사명 / 사업자등록번호 / 대표자 검색"
            className="h-11 w-full rounded-2xl border border-zinc-200 px-4 text-sm focus:border-orange-400 focus:outline-none"
          />
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {errorMessage}
          </div>
        ) : null}
      </section>

      <section className={`${card()} max-w-[860px]`}>
        <div className="overflow-hidden rounded-2xl border border-zinc-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] table-auto text-sm md:min-w-0 md:table-fixed">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="w-[240px] px-5 py-4 text-center font-bold text-zinc-700 md:w-[24%] md:px-3 md:py-3">
                    <span className="whitespace-nowrap">회사명</span>
                  </th>
                  <th className="w-[240px] px-5 py-4 text-center font-bold text-zinc-700 md:w-[24%] md:px-3 md:py-3">
                    <span className="whitespace-nowrap">사업자등록번호</span>
                  </th>
                  <th className="w-[160px] px-5 py-4 text-center font-bold text-zinc-700 md:w-[16%] md:px-3 md:py-3">
                    <span className="whitespace-nowrap">대표자</span>
                  </th>
                  <th className="w-[120px] px-5 py-4 text-center font-bold text-zinc-700 md:w-[10%] md:px-3 md:py-3">
                    <span className="whitespace-nowrap">직원 수</span>
                  </th>
                  <th className="w-[120px] px-5 py-4 text-center font-bold text-zinc-700 md:w-[10%] md:px-3 md:py-3">
                    <span className="whitespace-nowrap">급여월 수</span>
                  </th>
                  <th className="w-[180px] px-5 py-4 text-center font-bold text-zinc-700 md:w-[16%] md:px-3 md:py-3">
                    <span className="whitespace-nowrap">열기</span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {filtered.length ? (
                  filtered.map((item) => (
                    <tr key={item.id} className="border-t border-zinc-100">
                      <td className="px-5 py-4 text-center font-semibold text-zinc-900 md:px-3 md:py-3">
                        <div className="whitespace-nowrap">{item.name || "-"}</div>
                      </td>
                      <td className="px-5 py-4 text-center text-zinc-600 md:px-3 md:py-3">
                        <div className="whitespace-nowrap">
                          {formatBusinessNumber(item.business_number)}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center text-zinc-600 md:px-3 md:py-3">
                        <div className="whitespace-nowrap">{item.representative_name || "-"}</div>
                      </td>
                      <td className="px-5 py-4 text-center text-zinc-600 md:px-3 md:py-3">
                        <span className="whitespace-nowrap">{item.employee_count}명</span>
                      </td>
                      <td className="px-5 py-4 text-center text-zinc-600 md:px-3 md:py-3">
                        <span className="whitespace-nowrap">{item.payroll_period_count}건</span>
                      </td>
                      <td className="px-5 py-4 text-center md:px-3 md:py-3">
                        <div className="flex justify-center">
                          <Link
                            href={`/labor/companies/${item.id}`}
                            className="inline-flex h-9 items-center rounded-2xl border border-orange-200 bg-orange-50 px-3 text-sm font-bold text-orange-600 whitespace-nowrap"
                          >
                            회사 보기
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-5 py-8 text-center text-sm text-zinc-400 md:px-4" colSpan={6}>
                      담당 회사가 없습니다.
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