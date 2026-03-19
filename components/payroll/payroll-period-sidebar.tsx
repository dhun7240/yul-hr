"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type PeriodResponse = {
  period?: {
    id?: string;
    payroll_year?: number | null;
    payroll_month?: number | null;
    month?: string | null;
  } | null;
  error?: string;
};

type PayrollPeriodSidebarProps = {
  periodId: string;
  mobile?: boolean;
};

async function safeJsonFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
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

function navItemClass(active: boolean) {
  return [
    "flex min-h-[48px] items-center rounded-2xl px-4 text-sm font-semibold transition",
    active
      ? "bg-orange-500 text-white shadow-sm"
      : "text-zinc-700 hover:bg-zinc-100",
  ].join(" ");
}

function getTitle(period?: PeriodResponse["period"]) {
  if (period?.payroll_year && period?.payroll_month) {
    return `${period.payroll_year}년 ${period.payroll_month}월 급여 입력`;
  }

  if (period?.month?.trim()) {
    return `${period.month} 급여 입력`;
  }

  return "급여 입력";
}

export default function PayrollPeriodSidebar({
  periodId,
  mobile = false,
}: PayrollPeriodSidebarProps) {
  const pathname = usePathname();
  const [period, setPeriod] = useState<PeriodResponse["period"] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const data = await safeJsonFetch<PeriodResponse>(`/api/payroll/periods/${periodId}`);
      if (cancelled) return;
      setPeriod(data?.period ?? null);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [periodId]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  const items = useMemo(
    () => [
      {
        href: `/company/payroll/${periodId}`,
        label: "급여 정보 입력",
        active:
          pathname === `/company/payroll/${periodId}` ||
          pathname === `/company/payroll/${periodId}/`,
      },
      {
        href: `/company/payroll/${periodId}/upload`,
        label: "급여 자료 업로드",
        active: pathname === `/company/payroll/${periodId}/upload`,
      },
      {
        href: `/company/payroll/${periodId}/submission`,
        label: "제출 확정 / 제출 내역 확인",
        active: pathname === `/company/payroll/${periodId}/submission`,
      },
    ],
    [pathname, periodId]
  );

  if (!mobile) {
    return (
      <aside className="w-[280px] shrink-0 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="border-b border-zinc-200 pb-4">
          <div className="text-xs font-extrabold tracking-wide text-orange-500">
            PAYROLL MENU
          </div>
          <div className="mt-2 text-xl font-extrabold tracking-tight text-zinc-900">
            {getTitle(period)}
          </div>
        </div>

        <nav className="mt-4 space-y-2">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className={navItemClass(item.active)}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
        aria-label="급여 메뉴"
        aria-expanded={open}
      >
        급여 메뉴
      </button>

      {open ? (
        <>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/20"
            aria-label="급여 메뉴 닫기"
          />

          <div className="fixed inset-x-4 top-28 z-50 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-zinc-200 pb-4">
              <div>
                <div className="text-xs font-extrabold tracking-wide text-orange-500">
                  PAYROLL MENU
                </div>
                <div className="mt-2 text-lg font-extrabold tracking-tight text-zinc-900">
                  {getTitle(period)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            <nav className="mt-4 space-y-2">
              {items.map((item) => (
                <Link key={item.href} href={item.href} className={navItemClass(item.active)}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </>
      ) : null}
    </>
  );
}