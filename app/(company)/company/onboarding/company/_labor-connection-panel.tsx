"use client";

import { useEffect, useState } from "react";

type RequestItem = {
  id: string;
  status: string;
  labor?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

type Response = {
  requests?: RequestItem[];
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

export default function LaborConnectionPanel() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setErrorMessage("");

    const data = await safeJsonFetch<Response>("/api/company/connection-requests");

    if (data?.error) {
      setRequests([]);
      setErrorMessage(data.error);
      setLoading(false);
      return;
    }

    setRequests(Array.isArray(data?.requests) ? data.requests : []);
    setLoading(false);
  }

  async function accept(id: string) {
    const result = await safeJsonFetch<{ error?: string }>(
      `/api/company/connection-requests/${id}/accept`,
      {
        method: "POST",
      }
    );

    if (result?.error) {
      setErrorMessage(result.error);
      return;
    }

    await load();
  }

  async function reject(id: string) {
    const result = await safeJsonFetch<{ error?: string }>(
      `/api/company/connection-requests/${id}/reject`,
      {
        method: "POST",
      }
    );

    if (result?.error) {
      setErrorMessage(result.error);
      return;
    }

    await load();
  }

  const pending = requests.filter((r) => r.status === "pending");

  return (
    <section className={`${card()} max-w-[860px]`}>
      <div className="text-lg font-extrabold text-zinc-900">노무사 연결 요청</div>
      <div className="mt-1 text-sm text-zinc-500">
        노무사가 연결 요청을 보내면 여기서 수락할 수 있습니다.
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left font-bold text-zinc-700">노무사</th>
              <th className="px-4 py-3 text-left font-bold text-zinc-700">이메일</th>
              <th className="px-4 py-3 text-left font-bold text-zinc-700">처리</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-zinc-400">
                  불러오는 중...
                </td>
              </tr>
            ) : pending.length ? (
              pending.map((item) => (
                <tr key={item.id} className="border-t border-zinc-100">
                  <td className="px-4 py-3 font-semibold text-zinc-900">
                    {item.labor?.name || "-"}
                  </td>

                  <td className="px-4 py-3 text-zinc-600">
                    {item.labor?.email || "-"}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => accept(item.id)}
                        className="inline-flex h-9 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700"
                      >
                        수락
                      </button>

                      <button
                        onClick={() => reject(item.id)}
                        className="inline-flex h-9 items-center rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-600"
                      >
                        거절
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-zinc-400">
                  요청이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}