"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";

type PeriodInfo = {
  id: string;
  status: string;
  rejection_reason?: string;
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

type UploadedFile = {
  name: string;
  path: string;
  size: number;
  updated_at?: string;
};

function cardClass() {
  return "rounded-[28px] border border-zinc-200 bg-white px-8 py-6 shadow-sm max-w-[860px]";
}

function inputClass() {
  return "h-11 w-full rounded-2xl border border-zinc-200 px-4 text-sm focus:border-orange-400 focus:outline-none";
}

function detailInputClass() {
  return "h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-700";
}

function detailTextareaClass() {
  return "min-h-[96px] w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700";
}

function toStringValue(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatCurrency(value: unknown) {
  const num = toNumber(value);
  if (!num) return "-";
  return `${num.toLocaleString("ko-KR")}원`;
}

function displayValue(value: unknown) {
  const text = toStringValue(value).trim();
  return text || "-";
}

function labelClass() {
  return "mb-2 block text-sm font-semibold text-zinc-700";
}

function getSearchText(employee: EmployeeItem) {
  return [employee.name ?? "", employee.department ?? "", employee.position ?? ""]
    .join(" ")
    .toLowerCase();
}

function excelCell(value: unknown) {
  const text = toStringValue(value).trim();
  return text || "-";
}

export default function InputDetailPanel({
  periodId,
  employees,
  inputs,
  companyExcelFile,
  referenceFile,
  period,
}: {
  periodId: string;
  employees: EmployeeItem[];
  inputs: PayrollInputItem[];
  companyExcelFile: UploadedFile | null;
  referenceFile: UploadedFile | null;
  period: PeriodInfo | null;
}) {
  const [listOpen, setListOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const filteredEmployees = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return employees;
    return employees.filter((employee) => getSearchText(employee).includes(keyword));
  }, [employees, search]);

  const selectedInputRow =
    inputs.find((row) => row.employee_id === selectedEmployeeId) ?? null;

  const selectedEmployee =
    employees.find((employee) => employee.id === selectedEmployeeId) ?? null;

  const selectedPayload = selectedInputRow?.payload ?? null;

  function handleSelectEmployee(employeeId: string) {
    setSelectedEmployeeId((prev) => (prev === employeeId ? "" : employeeId));
  }

  function handleDownloadExcel() {
    const rows = employees.map((employee) => {
      const inputRow = inputs.find((row) => row.employee_id === employee.id);
      const payload = inputRow?.payload ?? {};

      return {
        기간ID: periodId || "-",
        이름: excelCell(employee.name),
        사번: excelCell(employee.employee_number),
        부서: excelCell(employee.department),
        직책: excelCell(employee.position),
        기본급: excelCell(payload.base_salary),
        시급: excelCell(payload.hourly_wage),
        주_소정_근로시간: excelCell(payload.weekly_hours),
        주_소정_근로일수: excelCell(payload.weekly_days),
        고정수당: excelCell(payload.fixed_allowance),
        식대: excelCell(payload.meal_allowance),
        교통비: excelCell(payload.transport_allowance),
        연장근로시간: excelCell(payload.overtime_hours),
        야간근로시간: excelCell(payload.night_hours),
        휴일근로시간: excelCell(payload.holiday_hours),
        유급휴가일수: excelCell(payload.paid_leave_days),
        무급결근일수: excelCell(payload.unpaid_leave_days),
        상여금: excelCell(payload.bonus),
        인센티브: excelCell(payload.incentive),
        연차수당: excelCell(payload.annual_leave_allowance),
        퇴직충당금: excelCell(payload.severance_reserve),
        비과세수당: excelCell(payload.non_taxable_allowance),
        조정금액: excelCell(payload.adjustment_amount),
        근태메모: excelCell(payload.attendance_note),
        회사메모: excelCell(payload.company_note),
        메모: excelCell(payload.memo),
      };
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const fileName = `회사급여입력내역_${period?.id || periodId || "period"}.xlsx`;

    XLSX.utils.book_append_sheet(workbook, worksheet, "급여입력내역");
    XLSX.writeFile(workbook, fileName);
  }

  return (
    <section className={cardClass()}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-extrabold tracking-wide text-orange-500">
            INPUT DETAIL
          </div>
          <h2 className="mt-2 text-2xl font-extrabold text-zinc-900">
            직원별 급여 입력 상세
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            회사가 입력한 급여 정보를 직원별로 확인할 수 있습니다.
          </p>
          {companyExcelFile || referenceFile ? (
            <div className="mt-3 space-y-1 text-xs text-zinc-500">
              <div>회사 입력 엑셀: {companyExcelFile?.name ?? "-"}</div>
              <div>회사 참고자료: {referenceFile?.name ?? "-"}</div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setListOpen((prev) => !prev)}
            className="inline-flex h-11 items-center rounded-2xl border border-zinc-300 bg-white px-5 text-sm font-bold text-zinc-700"
          >
            {listOpen ? "직원 목록 닫기" : "직원 목록 보기"}
          </button>

          <button
            type="button"
            onClick={handleDownloadExcel}
            className="inline-flex h-11 items-center rounded-2xl border border-orange-200 bg-orange-50 px-5 text-sm font-bold text-orange-600"
          >
            급여 입력 엑셀 저장
          </button>
        </div>
      </div>

      {listOpen ? (
        <>
          <div className="mt-6 max-w-[420px]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={inputClass()}
              placeholder="이름 / 부서 / 직책 검색"
            />
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="w-[21%] px-4 py-3 text-left font-bold text-zinc-700">이름</th>
                  <th className="w-[18%] px-4 py-3 text-left font-bold text-zinc-700">사번</th>
                  <th className="w-[21%] px-4 py-3 text-left font-bold text-zinc-700">부서</th>
                  <th className="w-[18%] px-4 py-3 text-left font-bold text-zinc-700">직책</th>
                  <th className="w-[22%] px-4 py-3 text-left font-bold text-zinc-700">
                    기본급
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length ? (
                  filteredEmployees.map((employee) => {
                    const inputRow = inputs.find((row) => row.employee_id === employee.id);
                    const payload = inputRow?.payload ?? {};
                    const active = selectedEmployeeId === employee.id;

                    return (
                      <tr
                        key={employee.id}
                        onClick={() => handleSelectEmployee(employee.id)}
                        className={`cursor-pointer border-t border-zinc-100 ${
                          active ? "bg-orange-50" : "hover:bg-zinc-50"
                        }`}
                      >
                        <td className="px-4 py-3 font-semibold text-zinc-900">
                          <div className="truncate">{employee.name ?? "-"}</div>
                        </td>
                        <td className="px-4 py-3 text-zinc-600">
                          <div className="truncate">{employee.employee_number ?? "-"}</div>
                        </td>
                        <td className="px-4 py-3 text-zinc-600">
                          <div className="truncate">{employee.department ?? "-"}</div>
                        </td>
                        <td className="px-4 py-3 text-zinc-600">
                          <div className="truncate">{employee.position ?? "-"}</div>
                        </td>
                        <td className="px-4 py-3 text-zinc-600">
                          <div className="whitespace-nowrap">
                            {formatCurrency(payload.base_salary)}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-zinc-400" colSpan={5}>
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {selectedEmployee ? (
        <div className="mt-8 border-t border-zinc-200 pt-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-extrabold text-zinc-900">
                {selectedEmployee.name ?? "-"} 입력 상세
              </div>
              <div className="mt-1 text-sm text-zinc-500">
                {selectedEmployee.department ?? "-"} / {selectedEmployee.position ?? "-"}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedEmployeeId("")}
              className="inline-flex h-10 items-center rounded-2xl border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-700"
            >
              상세 닫기
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div>
              <label className={labelClass()}>기본급</label>
              <input
                readOnly
                value={displayValue(selectedPayload?.base_salary)}
                className={detailInputClass()}
              />
            </div>
            <div>
              <label className={labelClass()}>시급</label>
              <input
                readOnly
                value={displayValue(selectedPayload?.hourly_wage)}
                className={detailInputClass()}
              />
            </div>
            <div>
              <label className={labelClass()}>주 소정 근로시간</label>
              <input
                readOnly
                value={displayValue(selectedPayload?.weekly_hours)}
                className={detailInputClass()}
              />
            </div>
            <div>
              <label className={labelClass()}>주 소정 근로일수</label>
              <input
                readOnly
                value={displayValue(selectedPayload?.weekly_days)}
                className={detailInputClass()}
              />
            </div>

            <div>
              <label className={labelClass()}>고정수당</label>
              <input
                readOnly
                value={displayValue(selectedPayload?.fixed_allowance)}
                className={detailInputClass()}
              />
            </div>
            <div>
              <label className={labelClass()}>식대</label>
              <input
                readOnly
                value={displayValue(selectedPayload?.meal_allowance)}
                className={detailInputClass()}
              />
            </div>
            <div>
              <label className={labelClass()}>교통비</label>
              <input
                readOnly
                value={displayValue(selectedPayload?.transport_allowance)}
                className={detailInputClass()}
              />
            </div>
            <div>
              <label className={labelClass()}>연장근로시간</label>
              <input
                readOnly
                value={displayValue(selectedPayload?.overtime_hours)}
                className={detailInputClass()}
              />
            </div>

            <div>
              <label className={labelClass()}>야간근로시간</label>
              <input
                readOnly
                value={displayValue(selectedPayload?.night_hours)}
                className={detailInputClass()}
              />
            </div>
            <div>
              <label className={labelClass()}>휴일근로시간</label>
              <input
                readOnly
                value={displayValue(selectedPayload?.holiday_hours)}
                className={detailInputClass()}
              />
            </div>
            <div>
              <label className={labelClass()}>유급휴가일수</label>
              <input
                readOnly
                value={displayValue(selectedPayload?.paid_leave_days)}
                className={detailInputClass()}
              />
            </div>
            <div>
              <label className={labelClass()}>무급결근일수</label>
              <input
                readOnly
                value={displayValue(selectedPayload?.unpaid_leave_days)}
                className={detailInputClass()}
              />
            </div>

            <div>
              <label className={labelClass()}>상여금</label>
              <input
                readOnly
                value={displayValue(selectedPayload?.bonus)}
                className={detailInputClass()}
              />
            </div>
            <div>
              <label className={labelClass()}>인센티브</label>
              <input
                readOnly
                value={displayValue(selectedPayload?.incentive)}
                className={detailInputClass()}
              />
            </div>
            <div>
              <label className={labelClass()}>연차수당</label>
              <input
                readOnly
                value={displayValue(selectedPayload?.annual_leave_allowance)}
                className={detailInputClass()}
              />
            </div>
            <div>
              <label className={labelClass()}>퇴직충당금</label>
              <input
                readOnly
                value={displayValue(selectedPayload?.severance_reserve)}
                className={detailInputClass()}
              />
            </div>

            <div>
              <label className={labelClass()}>비과세수당</label>
              <input
                readOnly
                value={displayValue(selectedPayload?.non_taxable_allowance)}
                className={detailInputClass()}
              />
            </div>
            <div>
              <label className={labelClass()}>조정금액</label>
              <input
                readOnly
                value={displayValue(selectedPayload?.adjustment_amount)}
                className={detailInputClass()}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass()}>근태 메모</label>
              <textarea
                readOnly
                value={displayValue(selectedPayload?.attendance_note)}
                className={detailTextareaClass()}
              />
            </div>
            <div>
              <label className={labelClass()}>회사 메모</label>
              <textarea
                readOnly
                value={displayValue(selectedPayload?.company_note)}
                className={detailTextareaClass()}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className={labelClass()}>메모</label>
            <textarea
              readOnly
              value={displayValue(selectedPayload?.memo)}
              className={detailTextareaClass()}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}