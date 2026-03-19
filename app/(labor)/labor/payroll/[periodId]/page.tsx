"use client";

import { useEffect, useMemo, useState } from "react";
import ReviewHeaderPanel from "./_review-header-panel";
import ReviewActionPanel from "./_review-action-panel";
import ResultUploadPanel from "./_result-upload-panel";
import InputDetailPanel from "./_input-detail-panel";

type PeriodInfo = {
  id: string;
  company_id: string;
  company_name: string;
  payroll_year: number | null;
  payroll_month: number | null;
  status: string;
  submitted_at?: string;
  reviewed_at?: string;
  confirmed_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  note?: string;
};

type EmployeeItem = {
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

type PayrollInputItem = {
  id: string;
  employee_id: string;
  payload?: Record<string, unknown>;
};

export type UploadedFile = {
  name: string;
  path: string;
  size: number;
  updated_at?: string;
};

function card(maxWidth = "max-w-[860px]") {
  return `rounded-[28px] border border-zinc-200 bg-white px-8 py-6 shadow-sm ${maxWidth}`;
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatCurrency(value: number) {
  return value.toLocaleString("ko-KR");
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

function getChangeTypeLabel(employee: EmployeeItem, periodId: string) {
  if (employee.source_period_id === periodId) return "신규 입사";
  if (employee.change_period_id !== periodId) return "";
  if (employee.change_type === "termination") return "퇴사";
  if (employee.change_type === "leave") return "휴직";
  if (employee.change_type === "return") return "복직";
  if (employee.change_type === "transfer") return "부서 이동";
  return "";
}

function getChangeDetail(employee: EmployeeItem, periodId: string) {
  if (employee.source_period_id === periodId) {
    return `${employee.department ?? "-"} / ${employee.position ?? "-"}`;
  }
  if (employee.change_period_id !== periodId) return "-";
  if (employee.change_type === "termination") {
    return employee.termination_date ? `퇴사일 ${employee.termination_date}` : "퇴사";
  }
  if (employee.change_type === "leave") {
    return employee.leave_start_date ? `휴직일 ${employee.leave_start_date}` : "휴직";
  }
  if (employee.change_type === "return") {
    return employee.return_date ? `복직일 ${employee.return_date}` : "복직";
  }
  if (employee.change_type === "transfer") {
    return employee.department ? `이동 부서 ${employee.department}` : "부서 이동";
  }
  return "-";
}

export default function LaborPayrollDetailPage({
  params,
}: {
  params: Promise<{ periodId: string }>;
}) {
  const [periodId, setPeriodId] = useState("");
  const [period, setPeriod] = useState<PeriodInfo | null>(null);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [inputs, setInputs] = useState<PayrollInputItem[]>([]);
  const [referenceFile, setReferenceFile] = useState<UploadedFile | null>(null);
  const [companyExcelFile, setCompanyExcelFile] = useState<UploadedFile | null>(null);
  const [registerFile, setRegisterFile] = useState<UploadedFile | null>(null);
  const [payslipFile, setPayslipFile] = useState<UploadedFile | null>(null);

  const [revisionReason, setRevisionReason] = useState("");
  const [submittingRevision, setSubmittingRevision] = useState(false);
  const [submittingComplete, setSubmittingComplete] = useState(false);
  const [submittingReopen, setSubmittingReopen] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function resolveParams() {
      const resolved = await params;
      if (cancelled) return;
      setPeriodId(resolved.periodId);
    }

    void resolveParams();

    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    if (!periodId) return;
    void load();
  }, [periodId]);

  async function load() {
    setErrorMessage("");
    setSuccessMessage("");

    const [
      periodJson,
      employeesJson,
      inputsJson,
      referenceJson,
      companyExcelJson,
      registerJson,
      payslipJson,
    ] = await Promise.all([
      safeJsonFetch<{ period?: PeriodInfo; error?: string }>(
        `/api/payroll/periods/${encodeURIComponent(periodId)}`
      ),
      safeJsonFetch<{ employees?: EmployeeItem[]; error?: string }>("/api/employees"),
      safeJsonFetch<{ inputs?: PayrollInputItem[]; error?: string }>(
        `/api/payroll/inputs?period_id=${encodeURIComponent(periodId)}`
      ),
      safeJsonFetch<{ file?: UploadedFile | null }>(
        `/api/payroll/documents?period_id=${encodeURIComponent(
          periodId
        )}&scope=company_reference`
      ),
      safeJsonFetch<{ file?: UploadedFile | null }>(
        `/api/payroll/documents?period_id=${encodeURIComponent(
          periodId
        )}&scope=company_input_excel`
      ),
      safeJsonFetch<{ file?: UploadedFile | null }>(
        `/api/payroll/documents?period_id=${encodeURIComponent(
          periodId
        )}&scope=labor_register`
      ),
      safeJsonFetch<{ file?: UploadedFile | null }>(
        `/api/payroll/documents?period_id=${encodeURIComponent(
          periodId
        )}&scope=labor_payslip`
      ),
    ]);

    if (periodJson?.error) {
      setErrorMessage(periodJson.error);
      return;
    }

    setPeriod(periodJson?.period ?? null);
    setEmployees(Array.isArray(employeesJson?.employees) ? employeesJson.employees : []);
    setInputs(Array.isArray(inputsJson?.inputs) ? inputsJson.inputs : []);
    setReferenceFile(referenceJson?.file ?? null);
    setCompanyExcelFile(companyExcelJson?.file ?? null);
    setRegisterFile(registerJson?.file ?? null);
    setPayslipFile(payslipJson?.file ?? null);
    setRevisionReason(periodJson?.period?.rejection_reason ?? "");
  }

  const changeRows = useMemo(() => {
    return employees.filter(
      (employee) =>
        employee.source_period_id === periodId || employee.change_period_id === periodId
    );
  }, [employees, periodId]);

  const summary = useMemo(() => {
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

    for (const row of inputs) {
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

    return totals;
  }, [inputs]);

  async function handleRequestRevision() {
    if (!revisionReason.trim()) {
      setErrorMessage("수정 요청 사유를 입력해주세요.");
      return;
    }

    setSubmittingRevision(true);
    setErrorMessage("");
    setSuccessMessage("");

    const result = await safeJsonFetch<{ period?: PeriodInfo; error?: string }>(
      `/api/payroll/periods/${encodeURIComponent(periodId)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "request_revision",
          rejection_reason: revisionReason.trim(),
        }),
      }
    );

    if (result?.error) {
      setErrorMessage(result.error);
      setSubmittingRevision(false);
      return;
    }

    await load();
    setSuccessMessage("수정 요청을 전달했습니다.");
    setSubmittingRevision(false);
  }

  async function handleComplete() {
    setSubmittingComplete(true);
    setErrorMessage("");
    setSuccessMessage("");

    const result = await safeJsonFetch<{ period?: PeriodInfo; error?: string }>(
      `/api/payroll/periods/${encodeURIComponent(periodId)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "complete",
        }),
      }
    );

    if (result?.error) {
      setErrorMessage(result.error);
      setSubmittingComplete(false);
      return;
    }

    await load();
    setSuccessMessage("검토 완료 처리했습니다.");
    setSubmittingComplete(false);
  }

  async function handleReopenReview() {
    setSubmittingReopen(true);
    setErrorMessage("");
    setSuccessMessage("");

    const result = await safeJsonFetch<{ period?: PeriodInfo; error?: string }>(
      `/api/payroll/periods/${encodeURIComponent(periodId)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "reopen_review",
        }),
      }
    );

    if (result?.error) {
      setErrorMessage(result.error);
      setSubmittingReopen(false);
      return;
    }

    await load();
    setSuccessMessage("재검토 상태로 변경했습니다.");
    setSubmittingReopen(false);
  }

  const isCompleted = period?.status === "completed";

  return (
    <div className="space-y-5">
      <ReviewHeaderPanel
        period={period}
        errorMessage={errorMessage}
        successMessage={successMessage}
      />

      <section className={card()}>
        <div className="text-lg font-extrabold text-zinc-900">제출 내역 요약</div>
        <div className="mt-1 text-sm text-zinc-500">
          회사가 입력한 직원 변동 사항과 급여 입력 주요 합계입니다.
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 px-5 py-4">
            <div className="text-sm font-semibold text-zinc-500">급여 입력 현황</div>
            <div className="mt-2 text-lg font-extrabold text-zinc-900">
              총 {employees.length}명 중 {inputs.length}명 입력
            </div>
          </div>

          <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 px-5 py-4">
            <div className="text-sm font-semibold text-zinc-500">회사 첨부 참고자료</div>
            <div className="mt-2 text-sm font-semibold text-zinc-900">
              {referenceFile?.name ?? "업로드된 자료 없음"}
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left">이름</th>
                <th className="px-4 py-3 text-left">사번</th>
                <th className="px-4 py-3 text-left">변동 유형</th>
                <th className="px-4 py-3 text-left">상세</th>
              </tr>
            </thead>
            <tbody>
              {changeRows.length ? (
                changeRows.map((employee) => (
                  <tr key={employee.id} className="border-t border-zinc-100">
                    <td className="px-4 py-3">{employee.name ?? "-"}</td>
                    <td className="px-4 py-3">{employee.employee_number ?? "-"}</td>
                    <td className="px-4 py-3">{getChangeTypeLabel(employee, periodId) || "-"}</td>
                    <td className="px-4 py-3">{getChangeDetail(employee, periodId)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-center text-zinc-400" colSpan={4}>
                    제출된 직원 변동 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm text-zinc-700">
            <div>기본급: {formatCurrency(summary.base_salary)}원</div>
            <div className="mt-2">고정수당: {formatCurrency(summary.fixed_allowance)}원</div>
            <div className="mt-2">식대: {formatCurrency(summary.meal_allowance)}원</div>
            <div className="mt-2">교통비: {formatCurrency(summary.transport_allowance)}원</div>
          </div>

          <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm text-zinc-700">
            <div>상여금: {formatCurrency(summary.bonus)}원</div>
            <div className="mt-2">인센티브: {formatCurrency(summary.incentive)}원</div>
            <div className="mt-2">연차수당: {formatCurrency(summary.annual_leave_allowance)}원</div>
            <div className="mt-2">퇴직충당금: {formatCurrency(summary.severance_reserve)}원</div>
          </div>

          <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm text-zinc-700">
            <div>비과세수당: {formatCurrency(summary.non_taxable_allowance)}원</div>
            <div className="mt-2">조정금액: {formatCurrency(summary.adjustment_amount)}원</div>
            <div className="mt-2">연장근로: {formatCurrency(summary.overtime_hours)}시간</div>
            <div className="mt-2">야간근로: {formatCurrency(summary.night_hours)}시간</div>
            <div className="mt-2">휴일근로: {formatCurrency(summary.holiday_hours)}시간</div>
          </div>
        </div>
      </section>

      <ReviewActionPanel
        revisionReason={revisionReason}
        onChangeRevisionReason={setRevisionReason}
        onRequestRevision={handleRequestRevision}
        onComplete={handleComplete}
        onReopenReview={handleReopenReview}
        submittingRevision={submittingRevision}
        submittingComplete={submittingComplete}
        submittingReopen={submittingReopen}
        isCompleted={isCompleted}
      />

      <ResultUploadPanel
        periodId={periodId}
        registerFile={registerFile}
        payslipFile={payslipFile}
        isCompleted={isCompleted}
        onChanged={load}
        onError={setErrorMessage}
        onSuccess={setSuccessMessage}
      />

      <InputDetailPanel
        periodId={periodId}
        employees={employees}
        inputs={inputs}
        companyExcelFile={companyExcelFile}
        referenceFile={referenceFile}
        period={period}
      />
    </div>
  );
}