"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CompanyResponse = {
  company?: {
    labor_user_id?: string | null;
    assigned_labor?: {
      id: string;
      name: string;
      email: string;
    } | null;
  } | null;
  pending_requests?: {
    id: string;
    labor?: {
      id: string;
      name: string;
      email: string;
    } | null;
  }[];
  pending_request_count?: number;
  pending_request_error?: string;
  error?: string;
};

function card() {
  return "rounded-[28px] border border-zinc-200 bg-white p-6";
}

async function safeJsonFetch<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: init?.method ?? "GET",
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

export default function LaborConnectionStatusPanel() {
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [laborUserId, setLaborUserId] = useState("");
  const [laborName, setLaborName] = useState("");
  const [laborEmail, setLaborEmail] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setErrorMessage("");

    const data = await safeJsonFetch<CompanyResponse>("/api/company/me");

    if (data?.error) {
      setErrorMessage(data.error);
      setLoading(false);
      return;
    }

    const company = data?.company ?? null;
    const assignedLabor = company?.assigned_labor ?? null;
    const pendingRequests = Array.isArray(data?.pending_requests) ? data.pending_requests : [];
    const pendingRequestCount =
      typeof data?.pending_request_count === "number"
        ? data.pending_request_count
        : pendingRequests.length;

    setLaborUserId(company?.labor_user_id ?? "");
    setLaborName(assignedLabor?.name ?? "");
    setLaborEmail(assignedLabor?.email ?? "");
    setPendingCount(pendingRequestCount);

    if (data?.pending_request_error) {
      setErrorMessage(data.pending_request_error);
    }

    setLoading(false);
  }

  async function disconnect() {
    if (!confirm("현재 연결된 노무사와의 연결을 해제하시겠습니까?")) return;

    setDisconnecting(true);
    setErrorMessage("");

    const result = await safeJsonFetch<{ error?: string; success?: boolean }>(
      "/api/company/labor-connection",
      {
        method: "DELETE",
      }
    );

    if (result?.error) {
      setErrorMessage(result.error);
      setDisconnecting(false);
      return;
    }

    await load();
    setDisconnecting(false);
  }

  const connected = Boolean(laborUserId);

  return (
    <section className={card()}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-zinc-400">담당 노무사 연결 상태</div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {loading ? (
              <div className="text-2xl font-extrabold tracking-tight text-zinc-900">-</div>
            ) : connected ? (
              <>
                <div className="text-2xl font-extrabold tracking-tight text-zinc-900">
                  {laborName ? `${laborName} 노무사` : "노무사"}
                </div>

                <span className="inline-flex h-9 items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700">
                  연결됨
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex h-9 items-center rounded-full border border-zinc-200 bg-zinc-100 px-3 text-xs font-bold text-zinc-500">
                  미연결
                </span>

                {pendingCount > 0 ? (
                  <Link
                    href="/company/onboarding/company"
                    className="inline-flex h-9 items-center rounded-full border border-orange-200 bg-orange-50 px-3 text-xs font-bold text-orange-600"
                  >
                    연결 요청 {pendingCount}건
                  </Link>
                ) : null}
              </>
            )}
          </div>

          <div className="mt-2 text-sm text-zinc-500">
            {loading
              ? "불러오는 중..."
              : connected
              ? laborEmail || "현재 담당 노무사와 연결되어 있습니다."
              : pendingCount > 0
              ? "노무사 연결 요청이 도착했습니다. 버튼을 눌러 요청을 확인하세요."
              : "아직 연결된 노무사가 없습니다."}
          </div>
        </div>

        {connected ? (
          <button
            type="button"
            onClick={disconnect}
            disabled={disconnecting}
            className="inline-flex h-10 items-center rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-600 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400"
          >
            {disconnecting ? "해제 중..." : "노무사 연결 해제"}
          </button>
        ) : null}
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {errorMessage}
        </div>
      ) : null}
    </section>
  );
}