"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import InputBusinessNumber from "@/components/forms/input-business-number";
import InputPhone from "@/components/forms/input-phone";
import LaborConnectionPanel from "./_labor-connection-panel";

type CompanyRecord = {
  id?: string;
  name?: string | null;
  business_number?: string | null;
  representative_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

type CompanyResponse = {
  company?: CompanyRecord | null;
};

type SaveResponse = {
  company?: CompanyRecord | null;
  error?: string;
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

function parseEmailParts(email?: string | null) {
  if (!email) {
    return {
      emailId: "",
      selectedDomain: "",
      emailDomainInput: "",
    };
  }

  const [emailId = "", domain = ""] = email.split("@");

  if (!domain) {
    return {
      emailId,
      selectedDomain: "",
      emailDomainInput: "",
    };
  }

  const matched = EMAIL_DOMAIN_OPTIONS.find(
    (option) => option !== "" && option !== "direct" && option === domain
  );

  if (matched) {
    return {
      emailId,
      selectedDomain: domain,
      emailDomainInput: "",
    };
  }

  return {
    emailId,
    selectedDomain: "direct",
    emailDomainInput: domain,
  };
}

function getEmailValue(emailId: string, selectedDomain: string, emailDomainInput: string) {
  const id = emailId.trim();
  const domain =
    selectedDomain === "direct" ? emailDomainInput.trim() : selectedDomain.trim();

  if (!id || !domain) return "";
  return `${id}@${domain}`;
}

function isCompanySaved(company: CompanyRecord | null | undefined) {
  return Boolean(
    company?.name ||
      company?.business_number ||
      company?.representative_name ||
      company?.email ||
      company?.phone ||
      company?.address
  );
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

function sectionCardClass() {
  return "rounded-[28px] border border-zinc-200 bg-white px-8 py-8 shadow-sm";
}

function labelClass() {
  return "mb-2 block text-sm font-semibold text-zinc-700";
}

function inputBaseClass(disabled?: boolean) {
  return [
    "h-12 w-full rounded-2xl border border-zinc-200 px-5 text-[15px] font-medium leading-none placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none",
    disabled ? "bg-zinc-50 text-zinc-500" : "bg-white text-zinc-900",
  ].join(" ");
}

function readonlyInputClass(disabled?: boolean) {
  return [
    "h-12 w-full rounded-2xl border border-zinc-200 px-5 text-[15px] font-medium leading-none placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none",
    disabled ? "bg-zinc-50 text-zinc-500" : "bg-zinc-50 text-zinc-900",
  ].join(" ");
}

export default function CompanyOnboardingCompanyPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isEditMode, setIsEditMode] = useState(true);

  const [name, setName] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [emailId, setEmailId] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [emailDomainInput, setEmailDomainInput] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMessage("");
      setSaveMessage("");

      const data = await safeJsonFetch<CompanyResponse>("/api/company/me", {
        method: "GET",
      });

      if (cancelled) return;

      const company = data?.company ?? null;

      setName(company?.name ?? "");
      setBusinessNumber(company?.business_number ?? "");
      setRepresentativeName(company?.representative_name ?? "");
      setPhone(company?.phone ?? "");
      setAddress(company?.address ?? "");

      const emailParts = parseEmailParts(company?.email ?? "");
      setEmailId(emailParts.emailId);
      setSelectedDomain(emailParts.selectedDomain);
      setEmailDomainInput(emailParts.emailDomainInput);

      setIsEditMode(!isCompanySaved(company));
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const emailValue = useMemo(
    () => getEmailValue(emailId, selectedDomain, emailDomainInput),
    [emailId, selectedDomain, emailDomainInput]
  );

  const domainValue = selectedDomain === "direct" ? emailDomainInput : selectedDomain;
  const disabled = loading || saving || !isEditMode;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSaving(true);
    setErrorMessage("");
    setSaveMessage("");

    const payload = {
      name: name.trim(),
      business_number: businessNumber.trim(),
      representative_name: representativeName.trim(),
      email: emailValue,
      phone: phone.trim(),
      address: address.trim(),
    };

    const result = await safeJsonFetch<SaveResponse>("/api/company/me", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (result?.error) {
      setErrorMessage(result.error);
      setSaving(false);
      return;
    }

    const company = result?.company;

    if (company) {
      setName(company.name ?? "");
      setBusinessNumber(company.business_number ?? "");
      setRepresentativeName(company.representative_name ?? "");
      setPhone(company.phone ?? "");
      setAddress(company.address ?? "");

      const emailParts = parseEmailParts(company.email ?? "");
      setEmailId(emailParts.emailId);
      setSelectedDomain(emailParts.selectedDomain);
      setEmailDomainInput(emailParts.emailDomainInput);
    }

    setSaveMessage("회사 정보가 저장되었습니다.");
    setIsEditMode(false);
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 text-sm font-medium text-zinc-400">회사 정보</div>

        <div className="space-y-5">
          <section className={`${sectionCardClass()} max-w-[860px]`}>
            <div className="text-xs font-extrabold tracking-wide text-orange-500">
              COMPANY PROFILE
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900">
              회사 정보 입력 / 수정
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              페이롤 진행에 필요한 회사 기본 정보를 입력합니다.
            </p>
          </section>

          <form onSubmit={handleSubmit} className={`${sectionCardClass()} max-w-[860px]`}>
            <div className="w-full space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-[340px_1fr]">
                <div>
                  <label className={labelClass()}>회사명</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="노무법인 율"
                    className={inputBaseClass(disabled)}
                    disabled={disabled}
                  />
                </div>

                <div>
                  <label className={labelClass()}>사업자등록번호</label>
                  <InputBusinessNumber
                    value={businessNumber}
                    onChange={setBusinessNumber}
                    placeholder="000-00-00000"
                    className={inputBaseClass(disabled)}
                    disabled={disabled}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-[340px_1fr]">
                <div>
                  <label className={labelClass()}>대표자명</label>
                  <input
                    value={representativeName}
                    onChange={(e) => setRepresentativeName(e.target.value)}
                    placeholder="김지형"
                    className={inputBaseClass(disabled)}
                    disabled={disabled}
                  />
                </div>

                <div>
                  <label className={labelClass()}>대표 연락처</label>
                  <InputPhone
                    value={phone}
                    onChange={setPhone}
                    placeholder="010-1234-5678"
                    className={inputBaseClass(disabled)}
                    disabled={disabled}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass()}>회사 이메일</label>
                <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[340px_24px_1fr_160px]">
                  <input
                    value={emailId}
                    onChange={(e) => setEmailId(e.target.value)}
                    placeholder="아이디 입력"
                    className={inputBaseClass(disabled)}
                    disabled={disabled}
                  />

                  <div className="flex h-12 items-center justify-center text-2xl font-bold text-zinc-500">
                    @
                  </div>

                  <input
                    value={domainValue}
                    onChange={(e) => {
                      if (selectedDomain === "direct") {
                        setEmailDomainInput(e.target.value);
                      }
                    }}
                    readOnly={selectedDomain !== "direct"}
                    placeholder="도메인"
                    className={
                      selectedDomain === "direct"
                        ? inputBaseClass(disabled)
                        : readonlyInputClass(disabled)
                    }
                    disabled={disabled}
                  />

                  <select
                    value={selectedDomain}
                    onChange={(e) => {
                      const next = e.target.value;
                      setSelectedDomain(next);
                      if (next !== "direct") {
                        setEmailDomainInput("");
                      }
                    }}
                    className={inputBaseClass(disabled)}
                    disabled={disabled}
                  >
                    <option value="">(선택)</option>
                    <option value="gmail.com">gmail.com</option>
                    <option value="naver.com">naver.com</option>
                    <option value="daum.net">daum.net</option>
                    <option value="kakao.com">kakao.com</option>
                    <option value="outlook.com">outlook.com</option>
                    <option value="hotmail.com">hotmail.com</option>
                    <option value="nate.com">nate.com</option>
                    <option value="hanmail.net">hanmail.net</option>
                    <option value="direct">직접입력</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass()}>주소</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="주소를 입력하세요"
                  className={inputBaseClass(disabled)}
                  disabled={disabled}
                />
              </div>
            </div>

            {(errorMessage || saveMessage) && (
              <div className="mt-6 w-full">
                {errorMessage ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                    {errorMessage}
                  </div>
                ) : null}

                {saveMessage ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    {saveMessage}
                  </div>
                ) : null}
              </div>
            )}

            <div className="mt-8 flex w-full justify-end gap-3">
              {!isEditMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditMode(true);
                    setSaveMessage("");
                    setErrorMessage("");
                  }}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-zinc-300 bg-white px-8 text-base font-bold text-zinc-700 transition hover:bg-zinc-50"
                >
                  수정
                </button>
              ) : null}

              <button
                type="submit"
                disabled={disabled}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-orange-500 bg-orange-500 px-8 text-base font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-200 disabled:text-zinc-500"
              >
                {loading ? "불러오는 중..." : saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </form>
          <LaborConnectionPanel />
        </div>
      </div>
    </div>
  );
}