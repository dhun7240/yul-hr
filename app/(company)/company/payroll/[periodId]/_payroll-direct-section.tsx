"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Employee = {
  id: string;
  name?: string;
  employee_number?: string;
  department?: string;
  position?: string;
  status?: string;
  base_salary?: number | null;
  hourly_wage?: number | null;
  weekly_hours?: number | null;
  weekly_days?: number | null;
};

type PeriodInfo = {
  id: string;
  status: string;
  rejection_reason?: string;
};

type UploadedFile = {
  name: string;
  path: string;
  size: number;
  updated_at?: string;
};

type PayrollPayload = {
  employee_id: string;
  base_salary: string;
  hourly_wage: string;
  weekly_hours: string;
  weekly_days: string;
  fixed_allowance: string;
  meal_allowance: string;
  transport_allowance: string;
  overtime_hours: string;
  night_hours: string;
  holiday_hours: string;
  paid_leave_days: string;
  unpaid_leave_days: string;
  bonus: string;
  incentive: string;
  annual_leave_allowance: string;
  severance_reserve: string;
  non_taxable_allowance: string;
  adjustment_amount: string;
  attendance_note: string;
  company_note: string;
  memo: string;
};

type PayrollInputRow = {
  id: string;
  employee_id: string;
  payload?: Record<string, unknown>;
};

function card() {
  return "rounded-[28px] border border-zinc-200 bg-white px-8 py-6 shadow-sm max-w-[1180px]";
}

function inputClass(disabled = false) {
  return `h-11 w-full rounded-2xl border border-zinc-200 px-4 text-sm focus:border-orange-400 focus:outline-none ${
    disabled ? "bg-zinc-50 text-zinc-400" : ""
  }`;
}

function textareaClass(disabled = false) {
  return `min-h-[100px] w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm focus:border-orange-400 focus:outline-none ${
    disabled ? "bg-zinc-50 text-zinc-400" : ""
  }`;
}

function labelClass() {
  return "mb-2 block text-sm font-semibold text-zinc-700";
}

function formatCurrencyValue(value: string) {
  const digits = (value ?? "").replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

function parseCurrencyValue(value: string) {
  return (value ?? "").replace(/[^\d]/g, "");
}

function emptyPayrollForm(employeeId = ""): PayrollPayload {
  return {
    employee_id: employeeId,
    base_salary: "",
    hourly_wage: "",
    weekly_hours: "",
    weekly_days: "",
    fixed_allowance: "",
    meal_allowance: "",
    transport_allowance: "",
    overtime_hours: "",
    night_hours: "",
    holiday_hours: "",
    paid_leave_days: "",
    unpaid_leave_days: "",
    bonus: "",
    incentive: "",
    annual_leave_allowance: "",
    severance_reserve: "",
    non_taxable_allowance: "",
    adjustment_amount: "",
    attendance_note: "",
    company_note: "",
    memo: "",
  };
}

function toStringValue(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function payloadToForm(payload?: Record<string, unknown>, employeeId?: string): PayrollPayload {
  return {
    employee_id: employeeId ?? "",
    base_salary: toStringValue(payload?.base_salary),
    hourly_wage: toStringValue(payload?.hourly_wage),
    weekly_hours: toStringValue(payload?.weekly_hours),
    weekly_days: toStringValue(payload?.weekly_days),
    fixed_allowance: toStringValue(payload?.fixed_allowance),
    meal_allowance: toStringValue(payload?.meal_allowance),
    transport_allowance: toStringValue(payload?.transport_allowance),
    overtime_hours: toStringValue(payload?.overtime_hours),
    night_hours: toStringValue(payload?.night_hours),
    holiday_hours: toStringValue(payload?.holiday_hours),
    paid_leave_days: toStringValue(payload?.paid_leave_days),
    unpaid_leave_days: toStringValue(payload?.unpaid_leave_days),
    bonus: toStringValue(payload?.bonus),
    incentive: toStringValue(payload?.incentive),
    annual_leave_allowance: toStringValue(payload?.annual_leave_allowance),
    severance_reserve: toStringValue(payload?.severance_reserve),
    non_taxable_allowance: toStringValue(payload?.non_taxable_allowance),
    adjustment_amount: toStringValue(payload?.adjustment_amount),
    attendance_note: toStringValue(payload?.attendance_note),
    company_note: toStringValue(payload?.company_note),
    memo: toStringValue(payload?.memo),
  };
}

function getEmployeeDefaultForm(employee: Employee): PayrollPayload {
  return {
    ...emptyPayrollForm(employee.id),
    base_salary: employee.base_salary ? String(employee.base_salary) : "",
    hourly_wage: employee.hourly_wage ? String(employee.hourly_wage) : "",
    weekly_hours: employee.weekly_hours ? String(employee.weekly_hours) : "",
    weekly_days: employee.weekly_days ? String(employee.weekly_days) : "",
    fixed_allowance: "0",
    meal_allowance: "0",
    transport_allowance: "0",
    overtime_hours: "0",
    night_hours: "0",
    holiday_hours: "0",
    paid_leave_days: "0",
    unpaid_leave_days: "0",
    bonus: "0",
    incentive: "0",
    annual_leave_allowance: "0",
    severance_reserve: "0",
    non_taxable_allowance: "0",
    adjustment_amount: "0",
    attendance_note: "",
    company_note: "",
    memo: "",
  };
}

function isCompleted(payload?: Record<string, unknown>) {
  if (!payload) return false;

  const baseSalary = toStringValue(payload.base_salary);
  const hourlyWage = toStringValue(payload.hourly_wage);
  const weeklyHours = toStringValue(payload.weekly_hours);
  const weeklyDays = toStringValue(payload.weekly_days);
  const fixedAllowance = toStringValue(payload.fixed_allowance);
  const mealAllowance = toStringValue(payload.meal_allowance);
  const transportAllowance = toStringValue(payload.transport_allowance);
  const overtimeHours = toStringValue(payload.overtime_hours);
  const nightHours = toStringValue(payload.night_hours);
  const holidayHours = toStringValue(payload.holiday_hours);
  const paidLeaveDays = toStringValue(payload.paid_leave_days);
  const unpaidLeaveDays = toStringValue(payload.unpaid_leave_days);
  const bonus = toStringValue(payload.bonus);
  const incentive = toStringValue(payload.incentive);
  const annualLeaveAllowance = toStringValue(payload.annual_leave_allowance);
  const severanceReserve = toStringValue(payload.severance_reserve);
  const nonTaxableAllowance = toStringValue(payload.non_taxable_allowance);
  const adjustmentAmount = toStringValue(payload.adjustment_amount);

  const mainPayCompleted = Boolean(baseSalary || hourlyWage);

  return [
    mainPayCompleted,
    weeklyHours !== "",
    weeklyDays !== "",
    fixedAllowance !== "",
    mealAllowance !== "",
    transportAllowance !== "",
    overtimeHours !== "",
    nightHours !== "",
    holidayHours !== "",
    paidLeaveDays !== "",
    unpaidLeaveDays !== "",
    bonus !== "",
    incentive !== "",
    annualLeaveAllowance !== "",
    severanceReserve !== "",
    nonTaxableAllowance !== "",
    adjustmentAmount !== "",
  ].every(Boolean);
}

function statusBadge(completed: boolean) {
  return completed
    ? "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
    : "inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-600";
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

export default function PayrollDirectSection({ periodId }: { periodId: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rows, setRows] = useState<PayrollInputRow[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedRowId, setSelectedRowId] = useState("");
  const [search, setSearch] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<PayrollPayload>(emptyPayrollForm());
  const [period, setPeriod] = useState<PeriodInfo | null>(null);
  const [uploadedExcelFile, setUploadedExcelFile] = useState<UploadedFile | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingExisting, setEditingExisting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingUploadedFile, setDeletingUploadedFile] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const canEdit = ["draft", "needs_revision"].includes(period?.status ?? "draft");

  async function load() {
    const [employeeJson, inputJson, periodJson, uploadedFileJson] = await Promise.all([
      safeJsonFetch<{ employees?: Employee[]; error?: string }>("/api/employees"),
      safeJsonFetch<{ inputs?: PayrollInputRow[]; error?: string }>(
        `/api/payroll/inputs?period_id=${encodeURIComponent(periodId)}`
      ),
      safeJsonFetch<{ period?: PeriodInfo; error?: string }>(
        `/api/payroll/periods/${encodeURIComponent(periodId)}`
      ),
      safeJsonFetch<{ file?: UploadedFile | null; error?: string }>(
        `/api/payroll/documents?period_id=${encodeURIComponent(
          periodId
        )}&scope=company_input_excel`
      ),
    ]);

    setEmployees(employeeJson?.employees ?? []);
    setRows(inputJson?.inputs ?? []);
    setPeriod(periodJson?.period ?? null);
    setUploadedExcelFile(uploadedFileJson?.file ?? null);
  }

  useEffect(() => {
    void load();
  }, [periodId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return employees;

    return employees.filter((employee) =>
      [employee.name, employee.employee_number, employee.department, employee.position]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [employees, search]);

  function updateField(key: keyof PayrollPayload, value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function openEmployeeForm(employee: Employee) {
    setSelectedEmployee(employee);
    setFormOpen(true);
    setEditingExisting(true);
    setErrorMessage("");
    setSuccessMessage("");

    const currentRow = rows.find((row) => row.employee_id === employee.id);

    if (currentRow) {
      setSelectedRowId(currentRow.id);
      setForm(payloadToForm(currentRow.payload, employee.id));
      return;
    }

    const latestJson = await safeJsonFetch<{ input?: PayrollInputRow | null }>(
      `/api/payroll/inputs?employee_id=${encodeURIComponent(
        employee.id
      )}&latest=1&exclude_period_id=${encodeURIComponent(periodId)}`
    );

    if (latestJson?.input?.payload) {
      setSelectedRowId("");
      setForm(payloadToForm(latestJson.input.payload, employee.id));
      return;
    }

    setSelectedRowId("");
    setForm(getEmployeeDefaultForm(employee));
  }

  function cancelForm() {
    setSelectedEmployee(null);
    setSelectedRowId("");
    setFormOpen(false);
    setEditingExisting(false);
    setForm(emptyPayrollForm());
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleSave() {
    if (!selectedEmployee || !canEdit) {
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const result = await safeJsonFetch<{ input?: PayrollInputRow | null; error?: string }>(
      "/api/payroll/inputs",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          period_id: periodId,
          employee_id: selectedEmployee.id,
          payload: form,
        }),
      }
    );

    if (result?.error) {
      setErrorMessage(result.error);
      setSaving(false);
      return;
    }

    await load();
    setSuccessMessage("급여 정보가 저장되었습니다.");
    setFormOpen(false);

    if (result?.input?.id) {
      setSelectedRowId(result.input.id);
    }

    setSaving(false);
  }

  async function handleDelete(rowId: string) {
    if (!canEdit) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    const result = await safeJsonFetch<{ success?: boolean; error?: string }>(
      `/api/payroll/inputs?id=${encodeURIComponent(rowId)}`,
      {
        method: "DELETE",
      }
    );

    if (result?.error) {
      setErrorMessage(result.error);
      return;
    }

    await load();
    cancelForm();
    setSuccessMessage("입력 내역이 삭제되었습니다.");
  }

  async function uploadOriginalExcel(file: File) {
    const docFormData = new FormData();
    docFormData.append("file", file);
    docFormData.append("period_id", periodId);
    docFormData.append("scope", "company_input_excel");

    return safeJsonFetch<{ file?: UploadedFile | null; error?: string }>(
      "/api/payroll/documents",
      {
        method: "POST",
        body: docFormData,
      }
    );
  }

  async function handleUpload(file: File) {
    if (!canEdit) {
      return;
    }

    setUploading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("period_id", periodId);

    const importResult = await safeJsonFetch<{
      success?: boolean;
      importedCount?: number;
      error?: string;
    }>("/api/payroll/import", {
      method: "POST",
      body: formData,
    });

    if (importResult?.error) {
      setErrorMessage(importResult.error);
      setUploading(false);
      return;
    }

    const uploadResult = await uploadOriginalExcel(file);

    await load();

    if (uploadResult?.error) {
      setSuccessMessage(
        `${importResult?.importedCount ?? 0}건의 급여 정보가 업로드되었습니다. 다만 원본 엑셀 저장은 실패했습니다.`
      );
      setErrorMessage(uploadResult.error);
      setUploading(false);
      setListOpen(true);
      return;
    }

    setSuccessMessage(`${importResult?.importedCount ?? 0}건의 급여 정보가 업로드되었습니다.`);
    setUploading(false);
    setListOpen(true);
  }

  async function handleDownloadTemplate() {
    const res = await fetch("/api/payroll/template", {
      method: "GET",
      credentials: "include",
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "급여입력템플릿.xlsx";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadUploadedFile() {
    if (!uploadedExcelFile?.path) return;

    const result = await safeJsonFetch<{ url?: string }>(
      `/api/payroll/documents?period_id=${encodeURIComponent(
        periodId
      )}&path=${encodeURIComponent(uploadedExcelFile.path)}&download=1`
    );

    if (result?.url) {
      window.open(result.url, "_blank", "noopener,noreferrer");
    }
  }

  async function handleDeleteUploadedFile() {
    if (!uploadedExcelFile?.path || !canEdit) return;

    setDeletingUploadedFile(true);
    setErrorMessage("");
    setSuccessMessage("");

    const result = await safeJsonFetch<{ success?: boolean; error?: string }>(
      `/api/payroll/documents?period_id=${encodeURIComponent(periodId)}&path=${encodeURIComponent(
        uploadedExcelFile.path
      )}`,
      {
        method: "DELETE",
      }
    );

    if (result?.error) {
      setErrorMessage(result.error);
      setDeletingUploadedFile(false);
      return;
    }

    await load();
    setSuccessMessage("업로드 파일이 삭제되었습니다.");
    setDeletingUploadedFile(false);
  }

  return (
    <section className={card()}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-extrabold tracking-wide text-orange-500">
            PAYROLL INPUT
          </div>
          <h2 className="mt-2 text-2xl font-extrabold">급여 정보 입력</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            직원별 급여 관련 항목을 직접 입력하거나 엑셀로 일괄 업로드해 주세요.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap md:justify-end">
          <button
            onClick={() => setListOpen((prev) => !prev)}
            className="h-11 rounded-2xl border border-zinc-300 bg-white px-6 text-sm font-bold whitespace-nowrap"
          >
            {listOpen ? "직원 목록 닫기" : "직원 목록 보기"}
          </button>
        </div>
      </div>

      {(errorMessage || successMessage || period?.rejection_reason) && (
        <div className="mt-4 max-w-[760px] space-y-3">
          {period?.rejection_reason ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
              수정 요청 사유: {period.rejection_reason}
            </div>
          ) : null}

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

      {listOpen ? (
        <>
          <div className="mt-6 max-w-[360px]">
            <input
              className={inputClass()}
              placeholder="이름 / 사번 / 부서 / 직책 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left">이름</th>
                  <th className="px-4 py-3 text-left">사번</th>
                  <th className="px-4 py-3 text-left">부서</th>
                  <th className="px-4 py-3 text-left">직책</th>
                  <th className="px-4 py-3 text-left">상태</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((employee) => {
                  const row = rows.find((item) => item.employee_id === employee.id);
                  const completed = row ? isCompleted(row.payload) : false;

                  return (
                    <tr
                      key={employee.id}
                      className={`cursor-pointer hover:bg-zinc-50 ${
                        selectedEmployee?.id === employee.id ? "bg-orange-50" : ""
                      }`}
                      onClick={() => void openEmployeeForm(employee)}
                    >
                      <td className="px-4 py-3">{employee.name}</td>
                      <td className="px-4 py-3">{employee.employee_number}</td>
                      <td className="px-4 py-3">{employee.department}</td>
                      <td className="px-4 py-3">{employee.position}</td>
                      <td className="px-4 py-3">
                        <span className={statusBadge(completed)}>
                          {completed ? "입력 완료" : "미입력"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {selectedEmployee && formOpen && editingExisting ? (
        <div className="mt-8 border-t border-zinc-200 pt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">{selectedEmployee.name} 급여 입력</h3>

            <button
              onClick={() => setFormOpen((prev) => !prev)}
              className="h-11 rounded-2xl border border-zinc-300 bg-white px-6 text-sm font-bold"
            >
              {formOpen ? "입력 닫기" : "입력 열기"}
            </button>
          </div>

          {formOpen ? (
            <>
              <div className="mt-6 grid max-w-[1080px] grid-cols-4 gap-4">
                <div>
                  <label className={labelClass()}>기본급</label>
                  <input
                    className={inputClass(!canEdit)}
                    value={formatCurrencyValue(form.base_salary)}
                    onChange={(e) => updateField("base_salary", parseCurrencyValue(e.target.value))}
                    placeholder="0"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className={labelClass()}>시급</label>
                  <input
                    className={inputClass(!canEdit)}
                    value={formatCurrencyValue(form.hourly_wage)}
                    onChange={(e) => updateField("hourly_wage", parseCurrencyValue(e.target.value))}
                    placeholder="0"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className={labelClass()}>주 소정 근로시간</label>
                  <input
                    className={inputClass(!canEdit)}
                    value={form.weekly_hours}
                    onChange={(e) => updateField("weekly_hours", e.target.value)}
                    placeholder="0"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className={labelClass()}>주 소정 근로일수</label>
                  <input
                    className={inputClass(!canEdit)}
                    value={form.weekly_days}
                    onChange={(e) => updateField("weekly_days", e.target.value)}
                    placeholder="0"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className={labelClass()}>고정수당</label>
                  <input
                    className={inputClass(!canEdit)}
                    value={formatCurrencyValue(form.fixed_allowance)}
                    onChange={(e) =>
                      updateField("fixed_allowance", parseCurrencyValue(e.target.value))
                    }
                    placeholder="0"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className={labelClass()}>식대</label>
                  <input
                    className={inputClass(!canEdit)}
                    value={formatCurrencyValue(form.meal_allowance)}
                    onChange={(e) =>
                      updateField("meal_allowance", parseCurrencyValue(e.target.value))
                    }
                    placeholder="0"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className={labelClass()}>교통비</label>
                  <input
                    className={inputClass(!canEdit)}
                    value={formatCurrencyValue(form.transport_allowance)}
                    onChange={(e) =>
                      updateField("transport_allowance", parseCurrencyValue(e.target.value))
                    }
                    placeholder="0"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className={labelClass()}>연장근로시간</label>
                  <input
                    className={inputClass(!canEdit)}
                    value={form.overtime_hours}
                    onChange={(e) => updateField("overtime_hours", e.target.value)}
                    placeholder="0"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className={labelClass()}>야간근로시간</label>
                  <input
                    className={inputClass(!canEdit)}
                    value={form.night_hours}
                    onChange={(e) => updateField("night_hours", e.target.value)}
                    placeholder="0"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className={labelClass()}>휴일근로시간</label>
                  <input
                    className={inputClass(!canEdit)}
                    value={form.holiday_hours}
                    onChange={(e) => updateField("holiday_hours", e.target.value)}
                    placeholder="0"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className={labelClass()}>유급휴가일수</label>
                  <input
                    className={inputClass(!canEdit)}
                    value={form.paid_leave_days}
                    onChange={(e) => updateField("paid_leave_days", e.target.value)}
                    placeholder="0"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className={labelClass()}>무급결근일수</label>
                  <input
                    className={inputClass(!canEdit)}
                    value={form.unpaid_leave_days}
                    onChange={(e) => updateField("unpaid_leave_days", e.target.value)}
                    placeholder="0"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className={labelClass()}>상여금</label>
                  <input
                    className={inputClass(!canEdit)}
                    value={formatCurrencyValue(form.bonus)}
                    onChange={(e) => updateField("bonus", parseCurrencyValue(e.target.value))}
                    placeholder="0"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className={labelClass()}>인센티브</label>
                  <input
                    className={inputClass(!canEdit)}
                    value={formatCurrencyValue(form.incentive)}
                    onChange={(e) => updateField("incentive", parseCurrencyValue(e.target.value))}
                    placeholder="0"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className={labelClass()}>연차수당</label>
                  <input
                    className={inputClass(!canEdit)}
                    value={formatCurrencyValue(form.annual_leave_allowance)}
                    onChange={(e) =>
                      updateField(
                        "annual_leave_allowance",
                        parseCurrencyValue(e.target.value)
                      )
                    }
                    placeholder="0"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className={labelClass()}>퇴직충당금</label>
                  <input
                    className={inputClass(!canEdit)}
                    value={formatCurrencyValue(form.severance_reserve)}
                    onChange={(e) =>
                      updateField("severance_reserve", parseCurrencyValue(e.target.value))
                    }
                    placeholder="0"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className={labelClass()}>비과세수당</label>
                  <input
                    className={inputClass(!canEdit)}
                    value={formatCurrencyValue(form.non_taxable_allowance)}
                    onChange={(e) =>
                      updateField(
                        "non_taxable_allowance",
                        parseCurrencyValue(e.target.value)
                      )
                    }
                    placeholder="0"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className={labelClass()}>조정금액</label>
                  <input
                    className={inputClass(!canEdit)}
                    value={formatCurrencyValue(form.adjustment_amount)}
                    onChange={(e) =>
                      updateField("adjustment_amount", parseCurrencyValue(e.target.value))
                    }
                    placeholder="0"
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="mt-4 grid max-w-[1080px] grid-cols-2 gap-4">
                <div>
                  <label className={labelClass()}>근태 메모</label>
                  <textarea
                    className={textareaClass(!canEdit)}
                    value={form.attendance_note}
                    onChange={(e) => updateField("attendance_note", e.target.value)}
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className={labelClass()}>회사 메모</label>
                  <textarea
                    className={textareaClass(!canEdit)}
                    value={form.company_note}
                    onChange={(e) => updateField("company_note", e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="mt-4 max-w-[600px]">
                <label className={labelClass()}>메모</label>
                <textarea
                  className={textareaClass(!canEdit)}
                  value={form.memo}
                  onChange={(e) => updateField("memo", e.target.value)}
                  disabled={!canEdit}
                />
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => void handleSave()}
                  disabled={!canEdit || saving}
                  className="h-11 rounded-2xl bg-orange-500 px-6 font-bold text-white disabled:opacity-50"
                >
                  {saving ? "저장 중..." : "저장"}
                </button>

                {selectedRowId ? (
                  <button
                    onClick={() => void handleDelete(selectedRowId)}
                    disabled={!canEdit}
                    className="h-11 rounded-2xl border border-red-200 bg-red-50 px-6 font-bold text-red-600 disabled:opacity-50"
                  >
                    삭제
                  </button>
                ) : null}

                <button
                  onClick={cancelForm}
                  className="h-11 rounded-2xl border border-zinc-300 bg-white px-6 font-bold"
                >
                  취소
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="mt-10 border-t border-zinc-200 pt-8">
        <div className="text-xs font-extrabold tracking-wide text-orange-500">
          EXCEL INPUT
        </div>
        <h3 className="mt-2 text-xl font-extrabold text-zinc-900">엑셀로 입력하기</h3>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => inputRef.current?.click()}
            disabled={!canEdit || uploading}
            className="h-11 rounded-2xl bg-orange-500 px-6 font-bold text-white disabled:opacity-50"
          >
            {uploading ? "업로드 중..." : "업로드"}
          </button>

          <button
            onClick={() => void handleDownloadTemplate()}
            className="h-11 rounded-2xl border border-zinc-300 bg-white px-6 font-bold"
          >
            엑셀 템플릿 내려받기
          </button>

          {uploadedExcelFile ? (
            <>
              <button
                onClick={() => void handleDownloadUploadedFile()}
                className="h-11 rounded-2xl border border-zinc-300 bg-white px-6 font-bold"
              >
                업로드 파일 다운로드
              </button>

              <button
                onClick={() => replaceInputRef.current?.click()}
                disabled={!canEdit || uploading}
                className="h-11 rounded-2xl border border-zinc-300 bg-white px-6 font-bold disabled:opacity-50"
              >
                파일 수정
              </button>

              <button
                onClick={() => void handleDeleteUploadedFile()}
                disabled={!canEdit || deletingUploadedFile}
                className="h-11 rounded-2xl border border-red-200 bg-red-50 px-6 font-bold text-red-600 disabled:opacity-50"
              >
                {deletingUploadedFile ? "삭제 중..." : "파일 삭제"}
              </button>
            </>
          ) : null}

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void handleUpload(file);
              }
              e.currentTarget.value = "";
            }}
          />

          <input
            ref={replaceInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void handleUpload(file);
              }
              e.currentTarget.value = "";
            }}
          />
        </div>

        {uploadedExcelFile ? (
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            현재 업로드 파일: <span className="font-semibold">{uploadedExcelFile.name}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}