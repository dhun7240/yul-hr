"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LaborConnectionStatusPanel from "./_labor-connection-status-panel";

type CompanyResponse = {
  company?: {
    id?: string;
    name?: string | null;
    business_number?: string | null;
    representative_name?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  } | null;
};

type EmployeeItem = {
  id: string;
  name?: string | null;
  pay_type?: string | null;
  base_salary?: number | null;
  hourly_wage?: number | null;
  weekly_hours?: number | null;
  weekly_days?: number | null;
};

type EmployeesResponse = {
  employees?: EmployeeItem[];
};

type PayrollPeriodItem = {
  id: string;
  payroll_year?: number | null;
  payroll_month?: number | null;
  status?: string | null;
  month?: string | null;
};

type PayrollPeriodsResponse = {
  periods?: PayrollPeriodItem[];
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

function getLatestPeriod(periods: PayrollPeriodItem[]) {
  if (!periods.length) return null;

  return [...periods].sort((a, b) => {
    const aValue = (a.payroll_year ?? 0) * 100 + (a.payroll_month ?? 0);
    const bValue = (b.payroll_year ?? 0) * 100 + (b.payroll_month ?? 0);
    return bValue - aValue;
  })[0];
}

function getPayrollStatusLabel(status?: string | null) {
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

function isCompanyCompleted(company: CompanyResponse["company"] | null | undefined) {
  return Boolean(
    company?.name &&
      company?.business_number &&
      company?.representative_name &&
      company?.email &&
      company?.phone &&
      company?.address
  );
}

function clickableCardClass(disabled?: boolean) {
  if (disabled) {
    return ["rounded-[24px] border border-zinc-200 bg-white p-6", "opacity-60"].join(" ");
  }

  return [
    "rounded-[24px] border border-zinc-200 bg-white p-6",
    "cursor-pointer transition duration-150",
    "hover:border-orange-400 hover:bg-orange-50 hover:shadow-md",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300",
  ].join(" ");
}

function statCardClass() {
  return "rounded-[24px] border border-zinc-200 bg-white p-6";
}

function smallInfoCardClass() {
  return "min-w-[180px] rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3";
}

function formatBusinessNumber(value?: string | null) {
  const digits = (value ?? "").replace(/[^\d]/g, "").slice(0, 10);

  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function estimateEmployeeMonthlyPay(employee: EmployeeItem) {
  const payType = (employee.pay_type ?? "").trim();
  const baseSalary = normalizeNumber(employee.base_salary);
  const hourlyWage = normalizeNumber(employee.hourly_wage);
  const weeklyHours = normalizeNumber(employee.weekly_hours);
  const weeklyDays = normalizeNumber(employee.weekly_days);

  if (payType === "시급") {
    return hourlyWage * weeklyHours * 4.345;
  }

  if (payType === "일급") {
    return hourlyWage * weeklyDays * 4.345;
  }

  return baseSalary;
}

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function getTotalPayrollAmount(employees: EmployeeItem[]) {
  return employees.reduce((sum, employee) => sum + estimateEmployeeMonthlyPay(employee), 0);
}

function getPayrollAmountLabel(period: PayrollPeriodItem | null) {
  if (period?.payroll_month) {
    return `${period.payroll_month}월 총 급여`;
  }

  return "총 급여";
}

export default function CompanyDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<CompanyResponse["company"] | null>(null);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriodItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const [companyRes, employeesRes, periodsRes] = await Promise.all([
        safeJsonFetch<CompanyResponse>("/api/company/me"),
        safeJsonFetch<EmployeesResponse>("/api/employees"),
        safeJsonFetch<PayrollPeriodsResponse>("/api/payroll/periods"),
      ]);

      if (cancelled) return;

      setCompany(companyRes?.company ?? null);
      setEmployees(employeesRes?.employees ?? []);
      setPeriods(periodsRes?.periods ?? []);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const companyCompleted = useMemo(() => isCompanyCompleted(company), [company]);
  const employeeCount = employees.length;
  const latestPeriod = useMemo(() => getLatestPeriod(periods), [periods]);
  const latestPayrollStatus = getPayrollStatusLabel(latestPeriod?.status);
  const canStartPayroll = companyCompleted && employeeCount > 0;
  const totalPayrollAmount = useMemo(() => getTotalPayrollAmount(employees), [employees]);

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 text-sm font-medium text-zinc-400">회사 전용 페이지</div>

        <div className="space-y-5">
          <section className="rounded-[28px] border border-zinc-200 bg-white px-6 py-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="text-xs font-extrabold tracking-wide text-orange-500">
                  COMPANY DASHBOARD
                </div>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900">
                  {loading ? "-" : company?.name?.trim() ? company.name : "회사 정보 입력 필요"}
                </h1>
                <p className="mt-2 text-sm text-zinc-500">
                  {companyCompleted
                    ? "회사 정보와 직원 정보를 바탕으로 페이롤을 진행할 수 있습니다."
                    : "회사 정보와 직원 정보가 완료되어야 페이롤을 시작할 수 있습니다."}
                </p>
              </div>

              <div className="flex flex-col gap-3 md:flex-row">
                <div className={smallInfoCardClass()}>
                  <div className="text-xs font-semibold text-zinc-400">사업자등록번호</div>
                  <div className="mt-1 text-base font-bold tracking-tight text-zinc-900">
                    {loading
                      ? "-"
                      : company?.business_number?.trim()
                      ? formatBusinessNumber(company.business_number)
                      : "미입력"}
                  </div>
                </div>

                <div className={smallInfoCardClass()}>
                  <div className="text-xs font-semibold text-zinc-400">대표자</div>
                  <div className="mt-1 text-base font-bold tracking-tight text-zinc-900">
                    {loading
                      ? "-"
                      : company?.representative_name?.trim()
                      ? company.representative_name
                      : "미입력"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          < LaborConnectionStatusPanel />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className={statCardClass()}>
              <div className="text-sm font-medium text-zinc-400">
                {getPayrollAmountLabel(latestPeriod)}
              </div>
              <div className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-900">
                {loading ? "-" : formatCurrency(totalPayrollAmount)}
              </div>
            </div>

            <div className={statCardClass()}>
              <div className="text-sm font-medium text-zinc-400">직원 수</div>
              <div className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-900">
                {loading ? "-" : `${employeeCount}명`}
              </div>
            </div>

            <div className={statCardClass()}>
              <div className="text-sm font-medium text-zinc-400">최근 페이롤 상태</div>
              <div className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-900">
                {loading ? "-" : latestPayrollStatus}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Link href="/company/onboarding/company" className="block">
              <div className={clickableCardClass(false)}>
                <div className="text-sm font-medium text-zinc-400">회사 정보</div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-2xl font-extrabold tracking-tight text-zinc-900">
                    회사 정보 입력 / 수정
                  </div>
                  <div className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-bold text-orange-600">
                    이동
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/company/employees" className="block">
              <div className={clickableCardClass(false)}>
                <div className="text-sm font-medium text-zinc-400">직원 관리</div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-2xl font-extrabold tracking-tight text-zinc-900">
                    직원 등록 / 수정
                  </div>
                  <div className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-bold text-orange-600">
                    이동
                  </div>
                </div>
              </div>
            </Link>
          </section>

          <section className="rounded-[28px] border border-zinc-200 bg-white p-6">
            <div className="text-sm font-medium text-zinc-400">페이롤 시작 가능 여부</div>

            <div className="mt-4 text-sm text-zinc-500">
              시작 조건: 회사 정보 6개 항목(회사명, 사업자등록번호, 대표자명, 이메일, 연락처, 주소) 저장 완료 + 직원 1명 이상 등록
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div
                className={[
                  "inline-flex items-center rounded-full px-4 py-2 text-sm font-bold",
                  canStartPayroll
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border border-zinc-200 bg-zinc-100 text-zinc-500",
                ].join(" ")}
              >
                {loading ? "확인 중" : canStartPayroll ? "시작 가능" : "아직 불가"}
              </div>

              {canStartPayroll ? (
                <Link href="/company/payroll" className="block">
                  <div className={clickableCardClass(false)}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-base font-bold text-zinc-900">페이롤 페이지로 이동</div>
                      <div className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-bold text-orange-600">
                        이동
                      </div>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className={clickableCardClass(true)}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-base font-bold text-zinc-500">페이롤 페이지로 이동</div>
                    <div className="rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-sm font-bold text-zinc-400">
                      잠김
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}