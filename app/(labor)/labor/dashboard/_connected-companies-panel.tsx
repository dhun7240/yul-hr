"use client";

import { useEffect, useState } from "react";

type CompanyItem = {
  id: string;
  name: string;
  business_number: string;
};

type CompaniesResponse = {
  companies?: CompanyItem[];
  error?: string;
};

function card() {
  return "rounded-[28px] border border-zinc-200 bg-white px-8 py-6 shadow-sm";
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

export default function ConnectedCompaniesPanel() {
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setErrorMessage("");

    const data = await safeJsonFetch<CompaniesResponse>("/api/labor/companies");

    if (data?.error) {
      setErrorMessage(data.error);
      setLoading(false);
      return;
    }

    setCompanies(Array.isArray(data?.companies) ? data.companies : []);
    setLoading(false);
  }

  async function disconnect(companyId: string) {
    if (!confirm("이 회사와의 연결을 해제하시겠습니까?")) return;

    await safeJsonFetch("/api/labor/company-connection", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ company_id: companyId }),
    });

    await load();
  }

  return (
    <section className={card()}>
      <div className="flex flex-col gap-2">
        <div className="text-lg font-extrabold text-zinc-900">연결된 자문사</div>
        <div className="text-sm text-zinc-500">현재 담당 중인 회사 목록입니다.</div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200">
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 text-left font-bold text-zinc-700">
                  회사명
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-bold text-zinc-700">
                  사업자등록번호
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-bold text-zinc-700">
                  연결 해제
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={3}
                    className="whitespace-nowrap px-4 py-8 text-center text-zinc-400"
                  >
                    불러오는 중...
                  </td>
                </tr>
              ) : companies.length ? (
                companies.map((company) => (
                  <tr key={company.id} className="border-t border-zinc-100">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-zinc-900">
                      {company.name || "-"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                      {company.business_number || "-"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        onClick={() => disconnect(company.id)}
                        className="inline-flex h-9 items-center rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-600"
                      >
                        연결 해제
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={3}
                    className="whitespace-nowrap px-4 py-8 text-center text-zinc-400"
                  >
                    연결된 회사가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {errorMessage}
        </div>
      ) : null}
    </section>
  );
}