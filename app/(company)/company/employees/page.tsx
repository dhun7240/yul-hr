"use client";

import { useEffect, useMemo, useState } from "react";
import EmployeeFormCard, {
  EmployeeFormValue,
} from "@/components/company/employees/employee-form-card";
import EmployeeImportCard from "@/components/company/employees/employee-import-card";
import EmployeeTable from "@/components/company/employees/employee-table";

type EmployeeItem = {
  id: string;
  name: string;
  resident_registration_number: string;
  email: string;
  phone: string;
  employee_number: string;
  department: string;
  position: string;
  employment_type: string;
  pay_type: string;
  base_salary: number | null;
  hourly_wage: number | null;
  weekly_hours: number | null;
  weekly_days: number | null;
  hire_date: string;
  contract_end_date: string;
};

type EmployeesResponse = {
  employees?: EmployeeItem[];
  error?: string;
};

type EmployeeResponse = {
  employee?: EmployeeItem;
  error?: string;
};

type ImportResponse = {
  success?: boolean;
  importedCount?: number;
  error?: string;
};

function emptyForm(): EmployeeFormValue {
  return {
    id: "",
    name: "",
    resident_registration_number: "",
    emailId: "",
    emailDomain: "",
    emailDomainInput: "",
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

function headerCardClass() {
  return "rounded-[28px] border border-zinc-200 bg-white px-8 py-8 shadow-sm";
}

function parseEmail(email?: string | null) {
  if (!email) {
    return {
      emailId: "",
      emailDomain: "",
      emailDomainInput: "",
    };
  }

  const [emailId = "", domain = ""] = email.split("@");

  if (!domain) {
    return {
      emailId,
      emailDomain: "",
      emailDomainInput: "",
    };
  }

  const knownDomains = [
    "gmail.com",
    "naver.com",
    "daum.net",
    "kakao.com",
    "outlook.com",
    "hotmail.com",
    "nate.com",
    "hanmail.net",
  ];

  if (knownDomains.includes(domain)) {
    return {
      emailId,
      emailDomain: domain,
      emailDomainInput: "",
    };
  }

  return {
    emailId,
    emailDomain: "direct",
    emailDomainInput: domain,
  };
}

function composeEmail(form: EmployeeFormValue) {
  const emailId = form.emailId.trim();
  const domain =
    form.emailDomain === "direct"
      ? form.emailDomainInput.trim()
      : form.emailDomain.trim();

  if (!emailId || !domain) return "";
  return `${emailId}@${domain}`;
}

function toCurrencyString(value: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return String(value);
}

function employeeToForm(employee: EmployeeItem): EmployeeFormValue {
  const email = parseEmail(employee.email);

  return {
    id: employee.id,
    name: employee.name ?? "",
    resident_registration_number: employee.resident_registration_number ?? "",
    emailId: email.emailId,
    emailDomain: email.emailDomain,
    emailDomainInput: email.emailDomainInput,
    phone: employee.phone ?? "",
    employee_number: employee.employee_number ?? "",
    department: employee.department ?? "",
    position: employee.position ?? "",
    employment_type: employee.employment_type ?? "",
    pay_type: employee.pay_type ?? "",
    base_salary: toCurrencyString(employee.base_salary),
    hourly_wage: toCurrencyString(employee.hourly_wage),
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

export default function CompanyEmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [form, setForm] = useState<EmployeeFormValue>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);

  useEffect(() => {
    void loadEmployees();
  }, []);

  const editing = useMemo(() => Boolean(form.id), [form.id]);

  async function loadEmployees() {
    setLoading(true);
    const data = await safeJsonFetch<EmployeesResponse>("/api/employees");
    setEmployees(data?.employees ?? []);
    setLoading(false);
  }

  function updateForm(next: Partial<EmployeeFormValue>) {
    setForm((prev) => ({ ...prev, ...next }));
  }

  function resetForm() {
    setForm(emptyForm());
    setSelectedEmployeeId("");
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function submitEmployee() {
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (!form.name.trim()) {
      setErrorMessage("이름은 필수입니다.");
      setSubmitting(false);
      return;
    }

    if (!form.resident_registration_number.trim()) {
      setErrorMessage("주민등록번호는 필수입니다.");
      setSubmitting(false);
      return;
    }

    if (!form.employment_type.trim()) {
      setErrorMessage("고용형태는 필수입니다.");
      setSubmitting(false);
      return;
    }

    if (!form.pay_type.trim()) {
      setErrorMessage("급여형태는 필수입니다.");
      setSubmitting(false);
      return;
    }

    if (!form.hire_date.trim()) {
      setErrorMessage("입사일은 필수입니다.");
      setSubmitting(false);
      return;
    }

    const payload = {
      id: form.id || undefined,
      name: form.name,
      resident_registration_number: form.resident_registration_number,
      email: composeEmail(form),
      phone: form.phone,
      employee_number: form.employee_number,
      department: form.department,
      position: form.position,
      employment_type: form.employment_type,
      pay_type: form.pay_type,
      base_salary: form.base_salary,
      hourly_wage: form.hourly_wage,
      weekly_hours: form.weekly_hours,
      weekly_days: form.weekly_days,
      hire_date: form.hire_date,
      contract_end_date: form.contract_end_date,
      status: "active",
    };

    const result = await safeJsonFetch<EmployeeResponse>("/api/employees", {
      method: editing ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (result?.error) {
      setErrorMessage(result.error);
      setSubmitting(false);
      return;
    }

    await loadEmployees();
    setSuccessMessage(editing ? "직원 정보가 수정되었습니다." : "직원이 등록되었습니다.");
    resetForm();
    setSubmitting(false);
    setTableOpen(true);
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const formData = new FormData();
    formData.append("file", file);

    const result = await safeJsonFetch<ImportResponse>("/api/employees/import", {
      method: "POST",
      body: formData,
    });

    if (result?.error) {
      setErrorMessage(result.error);
      setUploading(false);
      return;
    }

    await loadEmployees();
    setSuccessMessage(`${result?.importedCount ?? 0}명의 직원 정보가 업로드되었습니다.`);
    setUploading(false);
    setTableOpen(true);
  }

  async function handleDownloadTemplate() {
    const res = await fetch("/api/employees/template", {
      method: "GET",
      credentials: "include",
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "직원등록템플릿.xlsx";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function handleSelectEmployee(id: string) {
    const target = employees.find((item) => item.id === id);
    if (!target) return;

    setForm(employeeToForm(target));
    setSelectedEmployeeId(id);
    setErrorMessage("");
    setSuccessMessage("");
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDeleteEmployee(id: string) {
    setDeletingId(id);
    setErrorMessage("");
    setSuccessMessage("");

    const result = await safeJsonFetch<{ success?: boolean; error?: string }>(
      `/api/employees?id=${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      }
    );

    if (result?.error) {
      setErrorMessage(result.error);
      setDeletingId("");
      return;
    }

    await loadEmployees();

    if (form.id === id) {
      resetForm();
    }

    if (selectedEmployeeId === id) {
      setSelectedEmployeeId("");
    }

    setSuccessMessage("직원이 삭제되었습니다.");
    setDeletingId("");
  }

  function handleEditSelected() {
    if (!selectedEmployeeId) return;
    handleSelectEmployee(selectedEmployeeId);
  }

  async function handleDeleteSelected() {
    if (!selectedEmployeeId) return;
    await handleDeleteEmployee(selectedEmployeeId);
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <div className="mx-auto max-w-[1280px] px-6 py-10">
        <div className="space-y-5">
          <section className={`${headerCardClass()} max-w-[1180px]`}>
            <div className="text-xs font-extrabold tracking-wide text-orange-500">
              EMPLOYEE PROFILE
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900">
              직원 정보 입력 / 수정
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              직원 기본 정보를 직접 입력하거나 엑셀 템플릿으로 등록할 수 있습니다.
            </p>
          </section>

          <EmployeeImportCard
            uploading={uploading}
            hasSelection={Boolean(selectedEmployeeId)}
            onUpload={handleUpload}
            onEditSelected={handleEditSelected}
            onDeleteSelected={handleDeleteSelected}
            onDownloadTemplate={handleDownloadTemplate}
          />

          <EmployeeFormCard
            value={form}
            disabled={loading}
            submitting={submitting}
            editing={editing}
            errorMessage={errorMessage}
            successMessage={successMessage}
            isOpen={formOpen}
            onToggle={() => setFormOpen((prev) => !prev)}
            onChange={updateForm}
            onSubmit={submitEmployee}
            onReset={resetForm}
          />

          <EmployeeTable
            employees={employees.map((item) => ({
              id: item.id,
              name: item.name,
              department: item.department,
              position: item.position,
              employment_type: item.employment_type,
            }))}
            selectedEmployeeId={selectedEmployeeId}
            deletingId={deletingId}
            isOpen={tableOpen}
            onToggle={() => setTableOpen((prev) => !prev)}
            onSelect={handleSelectEmployee}
            onDelete={handleDeleteEmployee}
          />
        </div>
      </div>
    </div>
  );
}