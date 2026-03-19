"use client";

import { useMemo } from "react";

export type EmployeeFormValue = {
  id: string;
  name: string;
  resident_registration_number: string;
  emailId: string;
  emailDomain: string;
  emailDomainInput: string;
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

type EmployeeFormCardProps = {
  value: EmployeeFormValue;
  disabled?: boolean;
  submitting?: boolean;
  editing?: boolean;
  errorMessage?: string;
  successMessage?: string;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (next: Partial<EmployeeFormValue>) => void;
  onSubmit: () => void;
  onReset: () => void;
};

const EMAIL_DOMAIN_OPTIONS = [
  "",
  "gmail.com",
  "naver.com",
  "daum.net",
  "kakao.com",
  "outlook.com",
  "hotmail.com",
  "nate.com",
  "hanmail.net",
  "direct",
] as const;

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

function readonlyInputClass(disabled?: boolean) {
  return [
    "h-12 w-full rounded-2xl border border-zinc-200 px-4 text-[15px] font-medium leading-none placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none",
    disabled ? "bg-zinc-50 text-zinc-500" : "bg-zinc-50 text-zinc-900",
  ].join(" ");
}

function sectionWidthClass(size: "xs" | "sm" | "md" | "lg" | "xl" | "full" = "md") {
  if (size === "xs") return "max-w-[180px]";
  if (size === "sm") return "max-w-[220px]";
  if (size === "md") return "max-w-[260px]";
  if (size === "lg") return "max-w-[320px]";
  if (size === "xl") return "max-w-[420px]";
  return "w-full";
}

function formatCurrencyValue(value: string) {
  const digits = (value ?? "").replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

function parseCurrencyValue(value: string) {
  return (value ?? "").replace(/[^\d]/g, "");
}

function formatResidentRegistrationNumber(value: string) {
  const digits = (value ?? "").replace(/[^\d]/g, "").slice(0, 13);
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 6)}-${digits.slice(6)}`;
}

function formatPhoneNumber(value: string) {
  const digits = (value ?? "").replace(/[^\d]/g, "").slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className={labelClass()}>
      <span>{children}</span>
      <span className="text-orange-500">*</span>
    </label>
  );
}

function NormalLabel({ children }: { children: React.ReactNode }) {
  return <label className={labelClass()}>{children}</label>;
}

export default function EmployeeFormCard({
  value,
  disabled,
  submitting,
  editing,
  errorMessage,
  successMessage,
  isOpen,
  onToggle,
  onChange,
  onSubmit,
  onReset,
}: EmployeeFormCardProps) {
  const safeValue: EmployeeFormValue = {
    id: value?.id ?? "",
    name: value?.name ?? "",
    resident_registration_number: value?.resident_registration_number ?? "",
    emailId: value?.emailId ?? "",
    emailDomain: value?.emailDomain ?? "",
    emailDomainInput: value?.emailDomainInput ?? "",
    phone: value?.phone ?? "",
    employee_number: value?.employee_number ?? "",
    department: value?.department ?? "",
    position: value?.position ?? "",
    employment_type: value?.employment_type ?? "",
    pay_type: value?.pay_type ?? "",
    base_salary: value?.base_salary ?? "",
    hourly_wage: value?.hourly_wage ?? "",
    weekly_hours: value?.weekly_hours ?? "",
    weekly_days: value?.weekly_days ?? "",
    hire_date: value?.hire_date ?? "",
    contract_end_date: value?.contract_end_date ?? "",
  };

  const domainValue =
    safeValue.emailDomain === "direct" ? safeValue.emailDomainInput : safeValue.emailDomain;

  const baseSalaryDisplay = useMemo(
    () => formatCurrencyValue(safeValue.base_salary),
    [safeValue.base_salary]
  );

  const hourlyWageDisplay = useMemo(
    () => formatCurrencyValue(safeValue.hourly_wage),
    [safeValue.hourly_wage]
  );

  const contractEndDateDisabled = disabled || safeValue.employment_type !== "계약직";

  return (
    <section className={`${cardClass()} max-w-[1180px]`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-extrabold tracking-wide text-orange-500">DIRECT INPUT</div>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900">
            직원 직접 입력 / 수정
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
            <div className="flex flex-wrap items-end gap-6">
              <div className={sectionWidthClass("sm")}>
                <RequiredLabel>이름</RequiredLabel>
                <input
                  value={safeValue.name}
                  onChange={(e) => onChange({ name: e.target.value })}
                  placeholder="이름"
                  className={inputClass(disabled)}
                  disabled={disabled}
                />
              </div>

              <div className={sectionWidthClass("sm")}>
                <NormalLabel>사번</NormalLabel>
                <input
                  value={safeValue.employee_number}
                  onChange={(e) => onChange({ employee_number: e.target.value })}
                  placeholder="사번"
                  className={inputClass(disabled)}
                  disabled={disabled}
                />
              </div>

              <div className={sectionWidthClass("sm")}>
                <NormalLabel>부서</NormalLabel>
                <input
                  value={safeValue.department}
                  onChange={(e) => onChange({ department: e.target.value })}
                  placeholder="부서"
                  className={inputClass(disabled)}
                  disabled={disabled}
                />
              </div>

              <div className={sectionWidthClass("sm")}>
                <NormalLabel>직책</NormalLabel>
                <input
                  value={safeValue.position}
                  onChange={(e) => onChange({ position: e.target.value })}
                  placeholder="직책"
                  className={inputClass(disabled)}
                  disabled={disabled}
                />
              </div>

              <div className={sectionWidthClass("xs")}>
                <RequiredLabel>입사일</RequiredLabel>
                <input
                  type="date"
                  value={safeValue.hire_date}
                  onChange={(e) => onChange({ hire_date: e.target.value })}
                  className={inputClass(disabled)}
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-6">
              <div className={sectionWidthClass("lg")}>
                <RequiredLabel>주민등록번호</RequiredLabel>
                <input
                  value={safeValue.resident_registration_number}
                  onChange={(e) =>
                    onChange({
                      resident_registration_number: formatResidentRegistrationNumber(e.target.value),
                    })
                  }
                  placeholder="000000-0000000"
                  className={inputClass(disabled)}
                  disabled={disabled}
                  inputMode="numeric"
                />
              </div>

              <div className={sectionWidthClass("lg")}>
                <NormalLabel>휴대폰</NormalLabel>
                <input
                  value={safeValue.phone}
                  onChange={(e) => onChange({ phone: formatPhoneNumber(e.target.value) })}
                  placeholder="010-1234-5678"
                  className={inputClass(disabled)}
                  disabled={disabled}
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="max-w-[760px]">
              <NormalLabel>이메일</NormalLabel>
              <div className="flex flex-wrap items-center gap-4">
                <div className="max-w-[260px] flex-1 min-w-[220px]">
                  <input
                    value={safeValue.emailId}
                    onChange={(e) => onChange({ emailId: e.target.value })}
                    placeholder="아이디 입력"
                    className={inputClass(disabled)}
                    disabled={disabled}
                  />
                </div>

                <div className="flex h-12 w-6 items-center justify-center text-2xl font-bold text-zinc-500">
                  @
                </div>

                <div className="max-w-[260px] flex-1 min-w-[220px]">
                  <input
                    value={domainValue}
                    onChange={(e) => {
                      if (safeValue.emailDomain === "direct") {
                        onChange({ emailDomainInput: e.target.value });
                      }
                    }}
                    placeholder="도메인 입력"
                    readOnly={safeValue.emailDomain !== "direct"}
                    className={
                      safeValue.emailDomain === "direct"
                        ? inputClass(disabled)
                        : readonlyInputClass(disabled)
                    }
                    disabled={disabled}
                  />
                </div>

                <div className="max-w-[180px] w-full">
                  <select
                    value={safeValue.emailDomain}
                    onChange={(e) => {
                      const next = e.target.value;
                      onChange({
                        emailDomain: next,
                        emailDomainInput: next === "direct" ? safeValue.emailDomainInput : "",
                      });
                    }}
                    className={inputClass(disabled)}
                    disabled={disabled}
                  >
                    <option value="">(선택)</option>
                    {EMAIL_DOMAIN_OPTIONS.filter((item) => item && item !== "direct").map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                    <option value="direct">직접입력</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-6">
              <div className={sectionWidthClass("sm")}>
                <RequiredLabel>고용형태</RequiredLabel>
                <select
                  value={safeValue.employment_type}
                  onChange={(e) => {
                    const next = e.target.value;
                    onChange({
                      employment_type: next,
                      contract_end_date: next === "계약직" ? safeValue.contract_end_date : "",
                    });
                  }}
                  className={inputClass(disabled)}
                  disabled={disabled}
                >
                  <option value="">(선택)</option>
                  <option value="정규직">정규직</option>
                  <option value="계약직">계약직</option>
                  <option value="일용직">일용직</option>
                  <option value="아르바이트">아르바이트</option>
                  <option value="기타">기타</option>
                </select>
              </div>

              <div className={sectionWidthClass("xs")}>
                <NormalLabel>계약만료일</NormalLabel>
                <input
                  type="date"
                  value={safeValue.contract_end_date}
                  onChange={(e) => onChange({ contract_end_date: e.target.value })}
                  className={inputClass(contractEndDateDisabled)}
                  disabled={contractEndDateDisabled}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-6">
              <div className={sectionWidthClass("sm")}>
                <RequiredLabel>급여형태</RequiredLabel>
                <select
                  value={safeValue.pay_type}
                  onChange={(e) => onChange({ pay_type: e.target.value })}
                  className={inputClass(disabled)}
                  disabled={disabled}
                >
                  <option value="">(선택)</option>
                  <option value="월급">월급</option>
                  <option value="시급">시급</option>
                  <option value="일급">일급</option>
                  <option value="연봉">연봉</option>
                </select>
              </div>

              <div className={sectionWidthClass("sm")}>
                <NormalLabel>기본급</NormalLabel>
                <input
                  value={baseSalaryDisplay}
                  onChange={(e) => onChange({ base_salary: parseCurrencyValue(e.target.value) })}
                  placeholder="0"
                  className={inputClass(disabled)}
                  disabled={disabled}
                  inputMode="numeric"
                />
              </div>

              <div className={sectionWidthClass("sm")}>
                <NormalLabel>시급</NormalLabel>
                <input
                  value={hourlyWageDisplay}
                  onChange={(e) => onChange({ hourly_wage: parseCurrencyValue(e.target.value) })}
                  placeholder="0"
                  className={inputClass(disabled)}
                  disabled={disabled}
                  inputMode="numeric"
                />
              </div>

              <div className={sectionWidthClass("sm")}>
                <NormalLabel>주 소정 근로시간</NormalLabel>
                <input
                  value={safeValue.weekly_hours}
                  onChange={(e) => onChange({ weekly_hours: e.target.value })}
                  placeholder="예: 40"
                  className={inputClass(disabled)}
                  disabled={disabled}
                  inputMode="decimal"
                />
              </div>

              <div className={sectionWidthClass("sm")}>
                <NormalLabel>주 소정 근로일수</NormalLabel>
                <input
                  value={safeValue.weekly_days}
                  onChange={(e) => onChange({ weekly_days: e.target.value })}
                  placeholder="예: 5"
                  className={inputClass(disabled)}
                  disabled={disabled}
                  inputMode="decimal"
                />
              </div>
            </div>
          </div>

          {(errorMessage || successMessage) && (
            <div className="mt-6 space-y-3 max-w-[520px]">
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
            {editing ? (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-zinc-300 bg-white px-6 text-base font-bold text-zinc-700 transition hover:bg-zinc-50"
              >
                입력 초기화
              </button>
            ) : null}

            <button
              type="button"
              onClick={onSubmit}
              disabled={disabled || submitting}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-orange-500 bg-orange-500 px-6 text-base font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-200 disabled:text-zinc-500"
            >
              {submitting ? "저장 중..." : editing ? "직원 수정" : "직원 등록"}
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}