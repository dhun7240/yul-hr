"use client";

import { useMemo, useState } from "react";

type EmployeeLite = {
  id: string;
  name: string;
  employee_number: string;
  department: string;
  position: string;
};

export type PayrollFormValue = {
  employee_id: string;
  base_salary: string;
  hourly_wage: string;
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
  memo: string;
};

export type PayrollRow = {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_number: string;
  department: string;
  position: string;
  payload: PayrollFormValue;
};

type PayrollInputSheetProps = {
  employees: EmployeeLite[];
  rows: PayrollRow[];
  value: PayrollFormValue;
  selectedRowId: string;
  loading?: boolean;
  submitting?: boolean;
  deleting?: boolean;
  errorMessage?: string;
  successMessage?: string;
  isOpen: boolean;
  isListOpen: boolean;
  onToggle: () => void;
  onToggleList: () => void;
  onChange: (next: Partial<PayrollFormValue>) => void;
  onSelectEmployee: (employeeId: string) => void;
  onSubmit: () => void;
  onReset: () => void;
  onSelectRow: (rowId: string) => void;
  onDeleteRow: (rowId: string) => void;
};

function cardClass() {
  return "rounded-[28px] border border-zinc-200 bg-white px-8 py-6 shadow-sm";
}

function labelClass() {
  return "mb-2 flex items-center gap-1 text-sm font-semibold text-zinc-700";
}

function inputClass(disabled?: boolean) {
  return [
    "h-12 w-full rounded-2xl border border-zinc-200 px-4 text-[15px] font-medium leading-none placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none",
    disabled ? "bg-zinc-50 text-zinc-500" : "bg-white text-zinc-900",
  ].join(" ");
}

function sectionWidthClass(size: "xs" | "sm" | "md" | "lg" | "xl" = "sm") {
  if (size === "xs") return "max-w-[160px]";
  if (size === "sm") return "max-w-[200px]";
  if (size === "md") return "max-w-[240px]";
  if (size === "lg") return "max-w-[300px]";
  return "max-w-[420px]";
}

function formatCurrencyValue(value: string) {
  const digits = (value ?? "").replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

function parseCurrencyValue(value: string) {
  return (value ?? "").replace(/[^\d]/g, "");
}

function selectedEmployeeLabel(employees: EmployeeLite[], employeeId: string) {
  const employee = employees.find((item) => item.id === employeeId);
  if (!employee) return "";
  return [employee.name, employee.employee_number].filter(Boolean).join(" / ");
}

function getSearchText(row: PayrollRow) {
  return [
    row.employee_name,
    row.employee_number,
    row.department,
    row.position,
  ]
    .join(" ")
    .toLowerCase();
}

function currencyPreview(value: string) {
  return value ? `${formatCurrencyValue(value)}원` : "-";
}

export default function PayrollInputSheet({
  employees,
  rows,
  value,
  selectedRowId,
  loading,
  submitting,
  deleting,
  errorMessage,
  successMessage,
  isOpen,
  isListOpen,
  onToggle,
  onToggleList,
  onChange,
  onSelectEmployee,
  onSubmit,
  onReset,
  onSelectRow,
  onDeleteRow,
}: PayrollInputSheetProps) {
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((row) => getSearchText(row).includes(keyword));
  }, [rows, search]);

  return (
    <div className="space-y-5">
      <section className={`${cardClass()} max-w-[1180px]`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-extrabold tracking-wide text-orange-500">DIRECT INPUT</div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900">
              직접 입력
            </h2>
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-zinc-300 bg-white px-5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50"
          >
            {isOpen ? "입력 닫기" : "입력하기"}
          </button>
        </div>

        {isOpen ? (
          <>
            <div className="mt-8 space-y-6">
              <div className={sectionWidthClass("lg")}>
                <label className={labelClass()}>대상 직원</label>
                <select
                  value={value.employee_id}
                  onChange={(e) => onSelectEmployee(e.target.value)}
                  className={inputClass(loading || submitting)}
                  disabled={loading || submitting}
                >
                  <option value="">(선택)</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {[employee.name, employee.employee_number, employee.department, employee.position]
                        .filter(Boolean)
                        .join(" / ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-sm font-medium text-zinc-500">
                {selectedEmployeeLabel(employees, value.employee_id)}
              </div>

              <div className="flex flex-wrap items-end gap-6">
                <div className={sectionWidthClass("sm")}>
                  <label className={labelClass()}>기본급</label>
                  <input
                    value={formatCurrencyValue(value.base_salary)}
                    onChange={(e) => onChange({ base_salary: parseCurrencyValue(e.target.value) })}
                    className={inputClass(loading || submitting)}
                    disabled={loading || submitting}
                    inputMode="numeric"
                    placeholder="0"
                  />
                </div>

                <div className={sectionWidthClass("sm")}>
                  <label className={labelClass()}>시급</label>
                  <input
                    value={formatCurrencyValue(value.hourly_wage)}
                    onChange={(e) => onChange({ hourly_wage: parseCurrencyValue(e.target.value) })}
                    className={inputClass(loading || submitting)}
                    disabled={loading || submitting}
                    inputMode="numeric"
                    placeholder="0"
                  />
                </div>

                <div className={sectionWidthClass("sm")}>
                  <label className={labelClass()}>고정수당</label>
                  <input
                    value={formatCurrencyValue(value.fixed_allowance)}
                    onChange={(e) =>
                      onChange({ fixed_allowance: parseCurrencyValue(e.target.value) })
                    }
                    className={inputClass(loading || submitting)}
                    disabled={loading || submitting}
                    inputMode="numeric"
                    placeholder="0"
                  />
                </div>

                <div className={sectionWidthClass("sm")}>
                  <label className={labelClass()}>식대</label>
                  <input
                    value={formatCurrencyValue(value.meal_allowance)}
                    onChange={(e) =>
                      onChange({ meal_allowance: parseCurrencyValue(e.target.value) })
                    }
                    className={inputClass(loading || submitting)}
                    disabled={loading || submitting}
                    inputMode="numeric"
                    placeholder="0"
                  />
                </div>

                <div className={sectionWidthClass("sm")}>
                  <label className={labelClass()}>교통비</label>
                  <input
                    value={formatCurrencyValue(value.transport_allowance)}
                    onChange={(e) =>
                      onChange({ transport_allowance: parseCurrencyValue(e.target.value) })
                    }
                    className={inputClass(loading || submitting)}
                    disabled={loading || submitting}
                    inputMode="numeric"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-6">
                <div className={sectionWidthClass("sm")}>
                  <label className={labelClass()}>연장근로시간</label>
                  <input
                    value={value.overtime_hours}
                    onChange={(e) => onChange({ overtime_hours: e.target.value })}
                    className={inputClass(loading || submitting)}
                    disabled={loading || submitting}
                    inputMode="decimal"
                    placeholder="0"
                  />
                </div>

                <div className={sectionWidthClass("sm")}>
                  <label className={labelClass()}>야간근로시간</label>
                  <input
                    value={value.night_hours}
                    onChange={(e) => onChange({ night_hours: e.target.value })}
                    className={inputClass(loading || submitting)}
                    disabled={loading || submitting}
                    inputMode="decimal"
                    placeholder="0"
                  />
                </div>

                <div className={sectionWidthClass("sm")}>
                  <label className={labelClass()}>휴일근로시간</label>
                  <input
                    value={value.holiday_hours}
                    onChange={(e) => onChange({ holiday_hours: e.target.value })}
                    className={inputClass(loading || submitting)}
                    disabled={loading || submitting}
                    inputMode="decimal"
                    placeholder="0"
                  />
                </div>

                <div className={sectionWidthClass("sm")}>
                  <label className={labelClass()}>유급휴가일수</label>
                  <input
                    value={value.paid_leave_days}
                    onChange={(e) => onChange({ paid_leave_days: e.target.value })}
                    className={inputClass(loading || submitting)}
                    disabled={loading || submitting}
                    inputMode="decimal"
                    placeholder="0"
                  />
                </div>

                <div className={sectionWidthClass("sm")}>
                  <label className={labelClass()}>무급결근일수</label>
                  <input
                    value={value.unpaid_leave_days}
                    onChange={(e) => onChange({ unpaid_leave_days: e.target.value })}
                    className={inputClass(loading || submitting)}
                    disabled={loading || submitting}
                    inputMode="decimal"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-6">
                <div className={sectionWidthClass("sm")}>
                  <label className={labelClass()}>상여금</label>
                  <input
                    value={formatCurrencyValue(value.bonus)}
                    onChange={(e) => onChange({ bonus: parseCurrencyValue(e.target.value) })}
                    className={inputClass(loading || submitting)}
                    disabled={loading || submitting}
                    inputMode="numeric"
                    placeholder="0"
                  />
                </div>

                <div className={sectionWidthClass("sm")}>
                  <label className={labelClass()}>인센티브</label>
                  <input
                    value={formatCurrencyValue(value.incentive)}
                    onChange={(e) => onChange({ incentive: parseCurrencyValue(e.target.value) })}
                    className={inputClass(loading || submitting)}
                    disabled={loading || submitting}
                    inputMode="numeric"
                    placeholder="0"
                  />
                </div>

                <div className={sectionWidthClass("sm")}>
                  <label className={labelClass()}>연차수당</label>
                  <input
                    value={formatCurrencyValue(value.annual_leave_allowance)}
                    onChange={(e) =>
                      onChange({
                        annual_leave_allowance: parseCurrencyValue(e.target.value),
                      })
                    }
                    className={inputClass(loading || submitting)}
                    disabled={loading || submitting}
                    inputMode="numeric"
                    placeholder="0"
                  />
                </div>

                <div className={sectionWidthClass("sm")}>
                  <label className={labelClass()}>퇴직충당금</label>
                  <input
                    value={formatCurrencyValue(value.severance_reserve)}
                    onChange={(e) =>
                      onChange({ severance_reserve: parseCurrencyValue(e.target.value) })
                    }
                    className={inputClass(loading || submitting)}
                    disabled={loading || submitting}
                    inputMode="numeric"
                    placeholder="0"
                  />
                </div>

                <div className={sectionWidthClass("sm")}>
                  <label className={labelClass()}>비과세수당</label>
                  <input
                    value={formatCurrencyValue(value.non_taxable_allowance)}
                    onChange={(e) =>
                      onChange({
                        non_taxable_allowance: parseCurrencyValue(e.target.value),
                      })
                    }
                    className={inputClass(loading || submitting)}
                    disabled={loading || submitting}
                    inputMode="numeric"
                    placeholder="0"
                  />
                </div>

                <div className={sectionWidthClass("sm")}>
                  <label className={labelClass()}>조정금액</label>
                  <input
                    value={formatCurrencyValue(value.adjustment_amount)}
                    onChange={(e) =>
                      onChange({ adjustment_amount: parseCurrencyValue(e.target.value) })
                    }
                    className={inputClass(loading || submitting)}
                    disabled={loading || submitting}
                    inputMode="numeric"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="max-w-[760px]">
                <label className={labelClass()}>메모</label>
                <textarea
                  value={value.memo}
                  onChange={(e) => onChange({ memo: e.target.value })}
                  className="min-h-[120px] w-full rounded-2xl border border-zinc-200 px-4 py-4 text-[15px] font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none"
                  disabled={loading || submitting}
                  placeholder="전달사항 입력"
                />
              </div>
            </div>

            {(errorMessage || successMessage) && (
              <div className="mt-6 space-y-3 max-w-[640px]">
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

            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onReset}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-zinc-300 bg-white px-6 text-base font-bold text-zinc-700 transition hover:bg-zinc-50"
              >
                입력 초기화
              </button>

              <button
                type="button"
                onClick={onSubmit}
                disabled={loading || submitting || !value.employee_id}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-orange-500 bg-orange-500 px-6 text-base font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-200 disabled:text-zinc-500"
              >
                {submitting ? "저장 중..." : "입력 저장"}
              </button>
            </div>
          </>
        ) : null}
      </section>

      <section className={`${cardClass()} max-w-[1180px]`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-extrabold tracking-wide text-orange-500">INPUT LIST</div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900">
              입력 내역
            </h2>
          </div>

          <button
            type="button"
            onClick={onToggleList}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-zinc-300 bg-white px-5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50"
          >
            {isListOpen ? "명단 닫기" : "명단 보기"}
          </button>
        </div>

        {isListOpen ? (
          <>
            <div className="mt-6 max-w-[420px]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={inputClass(false)}
                placeholder="이름 / 사번 / 부서 / 직책 검색"
              />
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-left">
                    <th className="border-b border-zinc-200 px-6 py-4 text-sm font-bold text-zinc-600">
                      이름
                    </th>
                    <th className="border-b border-zinc-200 px-6 py-4 text-sm font-bold text-zinc-600">
                      사번
                    </th>
                    <th className="border-b border-zinc-200 px-6 py-4 text-sm font-bold text-zinc-600">
                      부서
                    </th>
                    <th className="border-b border-zinc-200 px-6 py-4 text-sm font-bold text-zinc-600">
                      직책
                    </th>
                    <th className="border-b border-zinc-200 px-6 py-4 text-sm font-bold text-zinc-600">
                      기본급
                    </th>
                    <th className="border-b border-zinc-200 px-6 py-4 text-sm font-bold text-zinc-600">
                      상여/인센티브
                    </th>
                    <th className="border-b border-zinc-200 px-6 py-4 text-sm font-bold text-zinc-600">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {!filteredRows.length ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-sm font-medium text-zinc-500">
                        등록된 입력 내역 없음
                      </td>
                    </tr>
                  ) : null}

                  {filteredRows.map((row) => {
                    const active = row.id === selectedRowId;
                    const bonusSum =
                      Number(row.payload.bonus || "0") +
                      Number(row.payload.incentive || "0");

                    return (
                      <tr key={row.id} className={active ? "bg-orange-50" : "bg-white"}>
                        <td className="border-b border-zinc-100 px-6 py-4 text-sm font-semibold text-zinc-900">
                          {row.employee_name || "-"}
                        </td>
                        <td className="border-b border-zinc-100 px-6 py-4 text-sm text-zinc-700">
                          {row.employee_number || "-"}
                        </td>
                        <td className="border-b border-zinc-100 px-6 py-4 text-sm text-zinc-700">
                          {row.department || "-"}
                        </td>
                        <td className="border-b border-zinc-100 px-6 py-4 text-sm text-zinc-700">
                          {row.position || "-"}
                        </td>
                        <td className="border-b border-zinc-100 px-6 py-4 text-sm text-zinc-700">
                          {currencyPreview(row.payload.base_salary)}
                        </td>
                        <td className="border-b border-zinc-100 px-6 py-4 text-sm text-zinc-700">
                          {bonusSum ? `${bonusSum.toLocaleString("ko-KR")}원` : "-"}
                        </td>
                        <td className="border-b border-zinc-100 px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onSelectRow(row.id)}
                              className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50"
                            >
                              수정
                            </button>

                            <button
                              type="button"
                              onClick={() => onDeleteRow(row.id)}
                              disabled={deleting}
                              className="inline-flex h-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deleting && selectedRowId === row.id ? "삭제 중..." : "삭제"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}