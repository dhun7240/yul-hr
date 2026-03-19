"use client";

import { useEffect, useMemo, useState } from "react";

type Employee = {
  id: string;
  name?: string;
  employee_number?: string;
  department?: string;
  position?: string;
  status?: string;
  hire_date?: string;
  leave_start_date?: string;
  return_date?: string;
  termination_date?: string;
  resident_registration_number?: string;
  email?: string;
  phone?: string;
  employment_type?: string;
  pay_type?: string;
  base_salary?: number | null;
  hourly_wage?: number | null;
  weekly_hours?: number | null;
  weekly_days?: number | null;
  contract_end_date?: string;
  source_period_id?: string;
  change_period_id?: string;
  change_type?: string;
};

type PeriodInfo = {
  id: string;
  status: string;
  rejection_reason?: string;
};

type NewEmployeeForm = {
  id?: string;
  name: string;
  resident_registration_number: string;
  email: string;
  phone: string;
  employee_number: string;
  department: string;
  position: string;
  employment_type: string;
  pay_type: string;
  base_salary: string;
  hourly_wage: string;
  weekly_hours: string;
  weekly_days: string;
  hire_date: string;
  contract_end_date: string;
};

type ChangeForm = {
  type: string;
  effective_date: string;
  new_department: string;
};

function card() {
  return "rounded-[28px] border border-zinc-200 bg-white px-8 py-6 shadow-sm max-w-[1180px]";
}

function inputClass(disabled = false) {
  return `h-11 w-full rounded-2xl border border-zinc-200 px-4 text-sm focus:border-orange-400 focus:outline-none ${
    disabled ? "bg-zinc-50 text-zinc-400" : ""
  }`;
}

function dateInputWrapClass() {
  return "relative w-[260px]";
}

function dateHintClass() {
  return "pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 text-xs text-zinc-400";
}

function formatResidentRegistrationNumber(value: string) {
  const digits = value.replace(/[^\d]/g, "").slice(0, 13);
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 6)}-${digits.slice(6)}`;
}

function formatPhoneNumber(value: string) {
  const digits = value.replace(/[^\d]/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function emptyNewEmployeeForm(): NewEmployeeForm {
  return {
    id: "",
    name: "",
    resident_registration_number: "",
    email: "",
    phone: "",
    employee_number: "",
    department: "",
    position: "",
    employment_type: "",
    pay_type: "",
    base_salary: "",
    hourly_wage: "",
    weekly_hours: "",
    weekly_days: "",
    hire_date: "",
    contract_end_date: "",
  };
}

function employeeToNewHireForm(employee: Employee): NewEmployeeForm {
  return {
    id: employee.id ?? "",
    name: employee.name ?? "",
    resident_registration_number: employee.resident_registration_number ?? "",
    email: employee.email ?? "",
    phone: employee.phone ?? "",
    employee_number: employee.employee_number ?? "",
    department: employee.department ?? "",
    position: employee.position ?? "",
    employment_type: employee.employment_type ?? "",
    pay_type: employee.pay_type ?? "",
    base_salary:
      employee.base_salary === null || employee.base_salary === undefined
        ? ""
        : String(employee.base_salary),
    hourly_wage:
      employee.hourly_wage === null || employee.hourly_wage === undefined
        ? ""
        : String(employee.hourly_wage),
    weekly_hours:
      employee.weekly_hours === null || employee.weekly_hours === undefined
        ? ""
        : String(employee.weekly_hours),
    weekly_days:
      employee.weekly_days === null || employee.weekly_days === undefined
        ? ""
        : String(employee.weekly_days),
    hire_date: employee.hire_date ?? "",
    contract_end_date: employee.contract_end_date ?? "",
  };
}

function emptyChangeForm(): ChangeForm {
  return {
    type: "",
    effective_date: "",
    new_department: "",
  };
}

function getEmployeeChangeForm(employee: Employee): ChangeForm {
  if (employee.status === "휴직") {
    return {
      type: "휴직",
      effective_date: employee.leave_start_date ?? "",
      new_department: "",
    };
  }

  if (employee.status === "퇴사") {
    return {
      type: "퇴사",
      effective_date: employee.termination_date ?? "",
      new_department: "",
    };
  }

  if (employee.status === "재직" && employee.return_date) {
    return {
      type: "복직",
      effective_date: employee.return_date ?? "",
      new_department: "",
    };
  }

  if (employee.change_type === "transfer") {
    return {
      type: "부서이동",
      effective_date: "",
      new_department: employee.department ?? "",
    };
  }

  return emptyChangeForm();
}

export default function EmployeeChangePanel({ periodId }: { periodId: string }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Employee | null>(null);
  const [selectedNewHire, setSelectedNewHire] = useState<Employee | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [period, setPeriod] = useState<PeriodInfo | null>(null);

  const [changeForm, setChangeForm] = useState<ChangeForm>(emptyChangeForm());
  const [savingChange, setSavingChange] = useState(false);
  const [editingExisting, setEditingExisting] = useState(false);

  const [showNewEmployee, setShowNewEmployee] = useState(false);
  const [newEmployee, setNewEmployee] = useState<NewEmployeeForm>(emptyNewEmployeeForm());
  const [savingNewEmployee, setSavingNewEmployee] = useState(false);
  const [updatingNewHire, setUpdatingNewHire] = useState(false);
  const [deletingNewHireId, setDeletingNewHireId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const canEdit = ["draft", "needs_revision"].includes(period?.status ?? "draft");

  async function load() {
    const [employeesRes, periodRes] = await Promise.all([
      fetch("/api/employees", {
        cache: "no-store",
        credentials: "include",
      }),
      fetch(`/api/payroll/periods/${encodeURIComponent(periodId)}`, {
        cache: "no-store",
        credentials: "include",
      }),
    ]);

    const employeesJson = await employeesRes.json().catch(() => null);
    const periodJson = await periodRes.json().catch(() => null);

    setEmployees(employeesJson?.employees ?? []);
    setPeriod(periodJson?.period ?? null);
  }

  useEffect(() => {
    void load();
  }, [periodId]);

  const mainEmployees = useMemo(
    () => employees.filter((employee) => employee.source_period_id !== periodId),
    [employees, periodId]
  );

  const newHireEmployees = useMemo(
    () => employees.filter((employee) => employee.source_period_id === periodId),
    [employees, periodId]
  );

  const filteredMainEmployees = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return mainEmployees;

    return mainEmployees.filter((employee) =>
      [employee.name, employee.employee_number, employee.department, employee.position]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [mainEmployees, search]);

  function handleSelectEmployee(employee: Employee) {
    setSelected(employee);
    setSelectedNewHire(null);
    setEditingExisting(true);
    setShowNewEmployee(false);
    setChangeForm(getEmployeeChangeForm(employee));
    setErrorMessage("");
    setSuccessMessage("");
  }

  function handleSelectNewHire(employee: Employee) {
    setSelectedNewHire(employee);
    setSelected(null);
    setEditingExisting(false);
    setShowNewEmployee(false);
    setNewEmployee(employeeToNewHireForm(employee));
    setErrorMessage("");
    setSuccessMessage("");
  }

  function updateChangeForm(next: Partial<ChangeForm>) {
    setChangeForm((prev) => ({
      ...prev,
      ...next,
    }));
  }

  async function loadAndCloseChangeEditor(message: string) {
    await load();
    setSelected(null);
    setEditingExisting(false);
    setChangeForm(emptyChangeForm());
    setSuccessMessage(message);
  }

  async function saveChange() {
    if (!selected || !changeForm.type || !canEdit) return;

    setSavingChange(true);
    setErrorMessage("");
    setSuccessMessage("");

    const res = await fetch("/api/employees/change", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        employee_id: selected.id,
        type: changeForm.type,
        effective_date: changeForm.effective_date,
        new_department: changeForm.new_department,
        period_id: periodId,
      }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      setErrorMessage(json?.error ?? "직원 변동 저장 실패");
      setSavingChange(false);
      return;
    }

    await loadAndCloseChangeEditor("직원 변동이 저장되었습니다.");
    setSavingChange(false);
  }

  async function resetChangeForm() {
    if (!selected || !canEdit) return;

    if (selected.change_period_id !== periodId) {
      setChangeForm(getEmployeeChangeForm(selected));
      return;
    }

    setSavingChange(true);
    setErrorMessage("");
    setSuccessMessage("");

    const res = await fetch("/api/employees/change", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        employee_id: selected.id,
        action: "cancel",
        period_id: periodId,
      }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      setErrorMessage(json?.error ?? "변동 초기화 실패");
      setSavingChange(false);
      return;
    }

    await loadAndCloseChangeEditor("변동 사항이 초기화되었습니다.");
    setSavingChange(false);
  }

  function cancelChange() {
    setSelected(null);
    setEditingExisting(false);
    setChangeForm(emptyChangeForm());
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function saveNewEmployee() {
    if (!canEdit) return;

    setSavingNewEmployee(true);
    setErrorMessage("");
    setSuccessMessage("");

    const res = await fetch("/api/employees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...newEmployee,
        status: "재직",
        source_period_id: periodId,
      }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      setErrorMessage(json?.error ?? "신규 직원 저장 실패");
      setSavingNewEmployee(false);
      return;
    }

    await load();
    setShowNewEmployee(false);
    setSelectedNewHire(null);
    setNewEmployee(emptyNewEmployeeForm());
    setSuccessMessage("신규 직원이 저장되었습니다.");
    setSavingNewEmployee(false);
  }

  async function updateSelectedNewHire() {
    if (!selectedNewHire?.id || !canEdit) return;

    setUpdatingNewHire(true);
    setErrorMessage("");
    setSuccessMessage("");

    const res = await fetch("/api/employees", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...newEmployee,
        id: selectedNewHire.id,
        status: "재직",
        source_period_id: periodId,
      }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      setErrorMessage(json?.error ?? "신규 입사자 수정 실패");
      setUpdatingNewHire(false);
      return;
    }

    await load();
    setSuccessMessage("신규 입사자 정보가 수정되었습니다.");
    setUpdatingNewHire(false);
  }

  async function deleteSelectedNewHire() {
    if (!selectedNewHire?.id || !canEdit) return;

    setDeletingNewHireId(selectedNewHire.id);
    setErrorMessage("");
    setSuccessMessage("");

    const res = await fetch("/api/employees/change", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        employee_id: selectedNewHire.id,
        action: "cancel",
        period_id: periodId,
      }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      setErrorMessage(json?.error ?? "신규 입사자 삭제 실패");
      setDeletingNewHireId("");
      return;
    }

    await load();
    setSelectedNewHire(null);
    setNewEmployee(emptyNewEmployeeForm());
    setSuccessMessage("신규 입사자가 삭제되었습니다.");
    setDeletingNewHireId("");
  }

  function cancelNewEmployee() {
    setShowNewEmployee(false);
    setSelectedNewHire(null);
    setNewEmployee(emptyNewEmployeeForm());
    setErrorMessage("");
    setSuccessMessage("");
  }

  return (
    <section className={card()}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-extrabold tracking-wide text-orange-500">
            EMPLOYEE STATUS
          </div>
          <h2 className="mt-2 text-2xl font-extrabold">직원 변동 관리</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            신규 입사, 퇴사, 휴직, 복직, 부서 이동 등 직원 변동 사항을 이곳에서 입력해 주세요.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap md:justify-end">
          <button
            onClick={() => setListOpen((prev) => !prev)}
            className="h-11 rounded-2xl border border-zinc-300 bg-white px-6 text-sm font-bold whitespace-nowrap"
          >
            {listOpen ? "직원 목록 닫기" : "직원 목록 보기"}
          </button>

          <button
            onClick={() => {
              if (!canEdit) return;
              setShowNewEmployee((prev) => !prev);
              if (!showNewEmployee) {
                setSelected(null);
                setSelectedNewHire(null);
                setEditingExisting(false);
                setChangeForm(emptyChangeForm());
                setNewEmployee(emptyNewEmployeeForm());
                setErrorMessage("");
                setSuccessMessage("");
              }
            }}
            disabled={!canEdit}
            className="h-11 rounded-2xl bg-orange-500 px-6 font-bold text-white whitespace-nowrap disabled:opacity-50"
          >
            신규 입사
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
              className={inputClass(!canEdit)}
              placeholder="이름 / 사번 / 부서 / 직책 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!canEdit && false}
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
                </tr>
              </thead>

              <tbody>
                {filteredMainEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    className={`cursor-pointer hover:bg-zinc-50 ${
                      selected?.id === employee.id ? "bg-orange-50" : ""
                    } ${
                      employee.status === "휴직"
                        ? "text-zinc-400"
                        : employee.status === "퇴사"
                        ? "text-red-500"
                        : ""
                    }`}
                    onClick={() => handleSelectEmployee(employee)}
                  >
                    <td className="px-4 py-3">
                      {employee.name}
                      {employee.status === "휴직" ? " (휴직)" : ""}
                      {employee.status === "퇴사" ? " (퇴사자)" : ""}
                    </td>
                    <td className="px-4 py-3">{employee.employee_number}</td>
                    <td className="px-4 py-3">{employee.department}</td>
                    <td className="px-4 py-3">{employee.position}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8">
            <div className="text-sm font-bold text-zinc-900">신규 입사자 목록</div>
            <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-4 py-3 text-left">이름</th>
                    <th className="px-4 py-3 text-left">사번</th>
                    <th className="px-4 py-3 text-left">부서</th>
                    <th className="px-4 py-3 text-left">직책</th>
                  </tr>
                </thead>

                <tbody>
                  {newHireEmployees.length ? (
                    newHireEmployees.map((employee) => (
                      <tr
                        key={employee.id}
                        className={`cursor-pointer hover:bg-zinc-50 ${
                          selectedNewHire?.id === employee.id ? "bg-orange-50" : ""
                        }`}
                        onClick={() => handleSelectNewHire(employee)}
                      >
                        <td className="px-4 py-3">{employee.name}</td>
                        <td className="px-4 py-3">{employee.employee_number}</td>
                        <td className="px-4 py-3">{employee.department}</td>
                        <td className="px-4 py-3">{employee.position}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-3 text-zinc-400" colSpan={4}>
                        등록된 신규 입사자 없음
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {selected && editingExisting ? (
        <div className="mt-6 flex flex-wrap items-end gap-4">
          <div className="flex max-w-[200px] flex-col">
            <label className="mb-2 text-sm font-semibold">변동 유형</label>
            <select
              className={inputClass(!canEdit)}
              value={changeForm.type}
              onChange={(e) =>
                updateChangeForm({
                  type: e.target.value,
                  effective_date: "",
                  new_department: "",
                })
              }
              disabled={!canEdit}
            >
              <option value="">선택</option>
              <option value="퇴사">퇴사</option>
              <option value="휴직">휴직</option>
              <option value="복직">복직</option>
              <option value="부서이동">부서 이동</option>
            </select>
          </div>

          {(changeForm.type === "퇴사" ||
            changeForm.type === "휴직" ||
            changeForm.type === "복직") && (
            <div className="flex flex-col">
              <label className="mb-2 text-sm font-semibold">
                {changeForm.type === "퇴사"
                  ? "퇴사일"
                  : changeForm.type === "휴직"
                  ? "휴직일"
                  : "복직일"}
              </label>
              <div className={dateInputWrapClass()}>
                <input
                  type="date"
                  className={inputClass(!canEdit)}
                  value={changeForm.effective_date}
                  onChange={(e) => updateChangeForm({ effective_date: e.target.value })}
                  disabled={!canEdit}
                />
                <span className={dateHintClass()}>
                  {changeForm.type === "퇴사"
                    ? "퇴사일"
                    : changeForm.type === "휴직"
                    ? "휴직일"
                    : "복직일"}
                </span>
              </div>
            </div>
          )}

          {changeForm.type === "부서이동" && (
            <div className="flex max-w-[220px] flex-col">
              <label className="mb-2 text-sm font-semibold">이동 부서</label>
              <input
                className={inputClass(!canEdit)}
                value={changeForm.new_department}
                onChange={(e) => updateChangeForm({ new_department: e.target.value })}
                disabled={!canEdit}
              />
            </div>
          )}

          <button
            onClick={() => void saveChange()}
            disabled={!canEdit || savingChange}
            className="h-11 rounded-2xl bg-orange-500 px-6 font-bold text-white disabled:opacity-50"
          >
            {savingChange ? "저장 중..." : "저장"}
          </button>

          <button
            onClick={() => void resetChangeForm()}
            disabled={!canEdit || savingChange}
            className="h-11 rounded-2xl border border-zinc-300 bg-white px-6 font-bold disabled:opacity-50"
          >
            초기화
          </button>

          <button
            onClick={cancelChange}
            className="h-11 rounded-2xl border border-zinc-300 bg-white px-6 font-bold"
          >
            취소
          </button>
        </div>
      ) : null}

      {showNewEmployee || selectedNewHire ? (
        <div className="mt-8 border-t border-zinc-200 pt-6">
          <h3 className="mb-4 text-lg font-bold">
            {selectedNewHire ? "신규 입사자 수정" : "신규 직원 등록"}
          </h3>

          <div className="grid max-w-[900px] grid-cols-3 gap-4">
            <input
              className={inputClass(!canEdit)}
              placeholder="이름"
              value={newEmployee.name}
              onChange={(e) => setNewEmployee((prev) => ({ ...prev, name: e.target.value }))}
              disabled={!canEdit}
            />
            <input
              className={inputClass(!canEdit)}
              placeholder="사번"
              value={newEmployee.employee_number}
              onChange={(e) =>
                setNewEmployee((prev) => ({ ...prev, employee_number: e.target.value }))
              }
              disabled={!canEdit}
            />
            <div className={dateInputWrapClass()}>
              <input
                type="date"
                className={inputClass(!canEdit)}
                value={newEmployee.hire_date}
                onChange={(e) =>
                  setNewEmployee((prev) => ({ ...prev, hire_date: e.target.value }))
                }
                disabled={!canEdit}
              />
              <span className={dateHintClass()}>입사일</span>
            </div>

            <input
              className={inputClass(!canEdit)}
              placeholder="부서"
              value={newEmployee.department}
              onChange={(e) =>
                setNewEmployee((prev) => ({ ...prev, department: e.target.value }))
              }
              disabled={!canEdit}
            />
            <input
              className={inputClass(!canEdit)}
              placeholder="직책"
              value={newEmployee.position}
              onChange={(e) =>
                setNewEmployee((prev) => ({ ...prev, position: e.target.value }))
              }
              disabled={!canEdit}
            />
            <input
              className={inputClass(!canEdit)}
              placeholder="주민등록번호"
              value={newEmployee.resident_registration_number}
              onChange={(e) =>
                setNewEmployee((prev) => ({
                  ...prev,
                  resident_registration_number: formatResidentRegistrationNumber(
                    e.target.value
                  ),
                }))
              }
              disabled={!canEdit}
            />

            <input
              className={inputClass(!canEdit)}
              placeholder="이메일"
              value={newEmployee.email}
              onChange={(e) => setNewEmployee((prev) => ({ ...prev, email: e.target.value }))}
              disabled={!canEdit}
            />
            <input
              className={inputClass(!canEdit)}
              placeholder="010-1234-5678"
              value={newEmployee.phone}
              onChange={(e) =>
                setNewEmployee((prev) => ({
                  ...prev,
                  phone: formatPhoneNumber(e.target.value),
                }))
              }
              disabled={!canEdit}
            />
            <select
              className={inputClass(!canEdit)}
              value={newEmployee.employment_type}
              onChange={(e) =>
                setNewEmployee((prev) => ({ ...prev, employment_type: e.target.value }))
              }
              disabled={!canEdit}
            >
              <option value="">고용형태</option>
              <option value="정규직">정규직</option>
              <option value="계약직">계약직</option>
              <option value="일용직">일용직</option>
              <option value="아르바이트">아르바이트</option>
              <option value="기타">기타</option>
            </select>

            <select
              className={inputClass(!canEdit)}
              value={newEmployee.pay_type}
              onChange={(e) =>
                setNewEmployee((prev) => ({ ...prev, pay_type: e.target.value }))
              }
              disabled={!canEdit}
            >
              <option value="">급여형태</option>
              <option value="월급">월급</option>
              <option value="시급">시급</option>
              <option value="일급">일급</option>
              <option value="연봉">연봉</option>
            </select>

            <input
              className={inputClass(!canEdit)}
              placeholder="기본급"
              value={newEmployee.base_salary}
              onChange={(e) =>
                setNewEmployee((prev) => ({ ...prev, base_salary: e.target.value }))
              }
              disabled={!canEdit}
            />
            <input
              className={inputClass(!canEdit)}
              placeholder="시급"
              value={newEmployee.hourly_wage}
              onChange={(e) =>
                setNewEmployee((prev) => ({ ...prev, hourly_wage: e.target.value }))
              }
              disabled={!canEdit}
            />

            <input
              className={inputClass(!canEdit)}
              placeholder="주 소정 근로시간"
              value={newEmployee.weekly_hours}
              onChange={(e) =>
                setNewEmployee((prev) => ({ ...prev, weekly_hours: e.target.value }))
              }
              disabled={!canEdit}
            />
            <input
              className={inputClass(!canEdit)}
              placeholder="주 소정 근로일수"
              value={newEmployee.weekly_days}
              onChange={(e) =>
                setNewEmployee((prev) => ({ ...prev, weekly_days: e.target.value }))
              }
              disabled={!canEdit}
            />
            <div className={dateInputWrapClass()}>
              <input
                type="date"
                className={inputClass(!canEdit)}
                value={newEmployee.contract_end_date}
                onChange={(e) =>
                  setNewEmployee((prev) => ({ ...prev, contract_end_date: e.target.value }))
                }
                disabled={!canEdit}
              />
              <span className={dateHintClass()}>계약만료일</span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            {selectedNewHire ? (
              <>
                <button
                  onClick={() => void updateSelectedNewHire()}
                  disabled={!canEdit || updatingNewHire}
                  className="h-11 rounded-2xl bg-orange-500 px-6 font-bold text-white disabled:opacity-50"
                >
                  {updatingNewHire ? "수정 중..." : "수정"}
                </button>

                <button
                  onClick={() => void deleteSelectedNewHire()}
                  disabled={!canEdit || deletingNewHireId === selectedNewHire.id}
                  className="h-11 rounded-2xl border border-red-200 bg-red-50 px-6 font-bold text-red-600 disabled:opacity-50"
                >
                  {deletingNewHireId === selectedNewHire.id ? "삭제 중..." : "신규 입사자 삭제"}
                </button>

                <button
                  onClick={cancelNewEmployee}
                  className="h-11 rounded-2xl border border-zinc-300 bg-white px-6 font-bold"
                >
                  취소
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => void saveNewEmployee()}
                  disabled={!canEdit || savingNewEmployee}
                  className="h-11 rounded-2xl bg-orange-500 px-6 font-bold text-white disabled:opacity-50"
                >
                  {savingNewEmployee ? "저장 중..." : "신규 직원 저장"}
                </button>

                <button
                  onClick={cancelNewEmployee}
                  className="h-11 rounded-2xl border border-zinc-300 bg-white px-6 font-bold"
                >
                  취소
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}