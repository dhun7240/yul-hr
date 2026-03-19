"use client";

import { useEffect, useMemo, useState } from "react";

type Employee = {
  id: string;
  name?: string;
  employee_number?: string;
  department?: string;
  position?: string;
  status?: string;
  source_period_id?: string;
  change_period_id?: string;
  change_type?: string;
  leave_start_date?: string;
  return_date?: string;
  termination_date?: string;
};

type PayrollInputRow = {
  id: string;
  employee_id: string;
  payload?: Record<string, unknown>;
};

type UploadedFile = {
  name: string;
  path: string;
  size: number;
  updated_at?: string;
};

function card() {
  return "rounded-[28px] border border-zinc-200 bg-white px-5 py-5 shadow-sm max-w-[1180px] md:px-8 md:py-6";
}

function labelCard() {
  return "rounded-[24px] border border-zinc-200 bg-zinc-50 px-5 py-4";
}

function sectionTitle() {
  return "text-xs font-extrabold tracking-wide text-orange-500";
}

function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatDate(value?: string) {
  if (!value) return "-";
  return value;
}

async function safeJsonFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
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

function headClass() {
  return "px-4 py-3 text-left text-sm font-bold text-zinc-700 whitespace-nowrap";
}

function cellClass() {
  return "px-4 py-3 text-sm text-zinc-700 whitespace-nowrap";
}

export default function SubmissionSummarySection({ periodId }: { periodId: string }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rows, setRows] = useState<PayrollInputRow[]>([]);
  const [referenceFile, setReferenceFile] = useState<UploadedFile | null>(null);

  useEffect(() => {
    void load();
  }, [periodId]);

  async function load() {
    const [employeesJson, inputsJson, fileJson] = await Promise.all([
      safeJsonFetch<{ employees?: Employee[] }>("/api/employees"),
      safeJsonFetch<{ inputs?: PayrollInputRow[] }>(
        `/api/payroll/inputs?period_id=${encodeURIComponent(periodId)}`
      ),
      safeJsonFetch<{ file?: UploadedFile | null }>(
        `/api/payroll/documents?period_id=${encodeURIComponent(
          periodId
        )}&scope=company_reference`
      ),
    ]);

    setEmployees(employeesJson?.employees ?? []);
    setRows(inputsJson?.inputs ?? []);
    setReferenceFile(fileJson?.file ?? null);
  }

  const summary = useMemo(() => {
    const totalEmployees = employees.length;
    const enteredCount = rows.length;

    const totals = {
      base_salary: 0,
      fixed_allowance: 0,
      meal_allowance: 0,
      transport_allowance: 0,
      bonus: 0,
      incentive: 0,
      annual_leave_allowance: 0,
      severance_reserve: 0,
      non_taxable_allowance: 0,
      adjustment_amount: 0,
      overtime_hours: 0,
      night_hours: 0,
      holiday_hours: 0,
    };

    for (const row of rows) {
      const payload = row.payload ?? {};
      totals.base_salary += toNumber(payload.base_salary);
      totals.fixed_allowance += toNumber(payload.fixed_allowance);
      totals.meal_allowance += toNumber(payload.meal_allowance);
      totals.transport_allowance += toNumber(payload.transport_allowance);
      totals.bonus += toNumber(payload.bonus);
      totals.incentive += toNumber(payload.incentive);
      totals.annual_leave_allowance += toNumber(payload.annual_leave_allowance);
      totals.severance_reserve += toNumber(payload.severance_reserve);
      totals.non_taxable_allowance += toNumber(payload.non_taxable_allowance);
      totals.adjustment_amount += toNumber(payload.adjustment_amount);
      totals.overtime_hours += toNumber(payload.overtime_hours);
      totals.night_hours += toNumber(payload.night_hours);
      totals.holiday_hours += toNumber(payload.holiday_hours);
    }

    return {
      totalEmployees,
      enteredCount,
      totals,
    };
  }, [employees, rows]);

  const employeeChanges = useMemo(() => {
    return employees.filter(
      (employee) =>
        employee.source_period_id === periodId || employee.change_period_id === periodId
    );
  }, [employees, periodId]);

  async function handleDownloadReference() {
    if (!referenceFile?.path) return;

    const result = await safeJsonFetch<{ url?: string }>(
      `/api/payroll/documents?period_id=${encodeURIComponent(
        periodId
      )}&path=${encodeURIComponent(referenceFile.path)}&download=1`
    );

    if (result?.url) {
      window.open(result.url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <section className={card()}>
      <div className={sectionTitle()}>SUBMISSION SUMMARY</div>
      <h2 className="mt-2 text-2xl font-extrabold text-zinc-900">제출 내역 확인</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        이번 급여월에 입력하신 직원 변동 사항과 급여 정보 주요 합계를 한 번에 확인하실 수 있습니다.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className={labelCard()}>
          <div className="text-sm font-semibold text-zinc-500">급여 정보 입력 현황</div>
          <div className="mt-2 text-lg font-extrabold text-zinc-900">
            총 {formatNumber(summary.totalEmployees)}명 중 {formatNumber(summary.enteredCount)}명 입력
          </div>
        </div>

        <div className={labelCard()}>
          <div className="text-sm font-semibold text-zinc-500">업로드 참고자료</div>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="truncate text-sm font-semibold text-zinc-900">
              {referenceFile?.name ?? "업로드된 자료 없음"}
            </div>
            <button
              onClick={() => void handleDownloadReference()}
              disabled={!referenceFile}
              className="h-10 rounded-2xl border border-zinc-300 bg-white px-4 text-sm font-bold whitespace-nowrap disabled:opacity-50"
            >
              다운로드
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="text-sm font-bold text-zinc-900">직원 변동 내역</div>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200">
          <table className="w-max min-w-[760px] text-sm md:min-w-full">
            <thead className="bg-zinc-50">
              <tr>
                <th className={`${headClass()} min-w-[140px]`}>이름</th>
                <th className={`${headClass()} min-w-[140px]`}>사번</th>
                <th className={`${headClass()} min-w-[140px]`}>변동 유형</th>
                <th className={`${headClass()} min-w-[280px]`}>상세 내용</th>
              </tr>
            </thead>
            <tbody>
              {employeeChanges.length ? (
                employeeChanges.map((employee) => {
                  const isNewHire = employee.source_period_id === periodId;
                  const type = isNewHire
                    ? "신규 입사"
                    : employee.change_type === "termination"
                    ? "퇴사"
                    : employee.change_type === "leave"
                    ? "휴직"
                    : employee.change_type === "return"
                    ? "복직"
                    : employee.change_type === "transfer"
                    ? "부서 이동"
                    : "-";

                  const detail = isNewHire
                    ? `${employee.department ?? "-"} / ${employee.position ?? "-"}`
                    : employee.change_type === "termination"
                    ? `퇴사일 ${formatDate(employee.termination_date)}`
                    : employee.change_type === "leave"
                    ? `휴직일 ${formatDate(employee.leave_start_date)}`
                    : employee.change_type === "return"
                    ? `복직일 ${formatDate(employee.return_date)}`
                    : employee.change_type === "transfer"
                    ? `이동 부서 ${employee.department ?? "-"}`
                    : "-";

                  return (
                    <tr key={employee.id} className="border-t border-zinc-100">
                      <td className={`${cellClass()} min-w-[140px]`}>
                        {employee.name ?? "-"}
                      </td>
                      <td className={`${cellClass()} min-w-[140px]`}>
                        {employee.employee_number ?? "-"}
                      </td>
                      <td className={`${cellClass()} min-w-[140px]`}>{type}</td>
                      <td className={`${cellClass()} min-w-[280px]`}>{detail}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-3 text-sm text-zinc-400" colSpan={4}>
                    입력된 직원 변동 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8">
        <div className="text-sm font-bold text-zinc-900">주요 급여 정보 합계</div>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className={labelCard()}>
            <div className="space-y-2 text-sm text-zinc-700">
              <div>기본급: {formatNumber(summary.totals.base_salary)}원</div>
              <div>고정수당: {formatNumber(summary.totals.fixed_allowance)}원</div>
              <div>식대: {formatNumber(summary.totals.meal_allowance)}원</div>
              <div>교통비: {formatNumber(summary.totals.transport_allowance)}원</div>
              <div>상여금: {formatNumber(summary.totals.bonus)}원</div>
            </div>
          </div>

          <div className={labelCard()}>
            <div className="space-y-2 text-sm text-zinc-700">
              <div>인센티브: {formatNumber(summary.totals.incentive)}원</div>
              <div>연차수당: {formatNumber(summary.totals.annual_leave_allowance)}원</div>
              <div>퇴직충당금: {formatNumber(summary.totals.severance_reserve)}원</div>
              <div>비과세수당: {formatNumber(summary.totals.non_taxable_allowance)}원</div>
              <div>조정금액: {formatNumber(summary.totals.adjustment_amount)}원</div>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className={labelCard()}>
              <div className="space-y-2 text-sm text-zinc-700">
                <div>연장근로시간: {formatNumber(summary.totals.overtime_hours)}시간</div>
                <div>야간근로시간: {formatNumber(summary.totals.night_hours)}시간</div>
                <div>휴일근로시간: {formatNumber(summary.totals.holiday_hours)}시간</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}