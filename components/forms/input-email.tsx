"use client";

import { useEffect, useState } from "react";

const DOMAIN_OPTIONS = [
  "naver.com",
  "gmail.com",
  "daum.net",
  "kakao.com",
  "hotmail.com",
  "nate.com",
  "직접입력",
] as const;

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
};

export default function InputEmail({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
}: Props) {
  const [localPart, setLocalPart] = useState("");
  const [domainMode, setDomainMode] = useState<string>("naver.com");
  const [customDomain, setCustomDomain] = useState("");

  useEffect(() => {
    const safe = value || "";
    const [local = "", domain = ""] = safe.split("@");

    setLocalPart(local);

    if (!domain) {
      setDomainMode("naver.com");
      setCustomDomain("");
      return;
    }

    if (
      domain !== "직접입력" &&
      DOMAIN_OPTIONS.includes(domain as (typeof DOMAIN_OPTIONS)[number])
    ) {
      setDomainMode(domain);
      setCustomDomain("");
      return;
    }

    setDomainMode("직접입력");
    setCustomDomain(domain);
  }, [value]);

  function buildEmail(nextLocal: string, nextMode: string, nextCustom: string) {
    const trimmedLocal = nextLocal.trim();

    if (!trimmedLocal) return "";

    if (nextMode === "직접입력") {
      const trimmedCustom = nextCustom.trim();
      return trimmedCustom ? `${trimmedLocal}@${trimmedCustom}` : trimmedLocal;
    }

    return `${trimmedLocal}@${nextMode}`;
  }

  function handleLocalChange(next: string) {
    const cleaned = next.replace(/\s/g, "");
    setLocalPart(cleaned);
    onChange(buildEmail(cleaned, domainMode, customDomain));
  }

  function handleDomainModeChange(next: string) {
    setDomainMode(next);
    onChange(buildEmail(localPart, next, customDomain));
  }

  function handleCustomDomainChange(next: string) {
    const cleaned = next.replace(/\s/g, "");
    setCustomDomain(cleaned);
    onChange(buildEmail(localPart, "직접입력", cleaned));
  }

  return (
    <div className="text-sm">
      <span className="mb-1 block font-medium text-zinc-700">
        {label} {required ? "*" : ""}
      </span>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <input
          value={localPart}
          onChange={(e) => handleLocalChange(e.target.value)}
          disabled={disabled}
          placeholder="id"
          className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 disabled:bg-zinc-50"
        />

        <span className="text-zinc-500">@</span>

        {domainMode === "직접입력" ? (
          <input
            value={customDomain}
            onChange={(e) => handleCustomDomainChange(e.target.value)}
            disabled={disabled}
            placeholder="example.com"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 disabled:bg-zinc-50"
          />
        ) : (
          <input
            value={domainMode}
            readOnly
            disabled={disabled}
            className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 outline-none"
          />
        )}
      </div>

      <div className="mt-2">
        <select
          value={domainMode}
          onChange={(e) => handleDomainModeChange(e.target.value)}
          disabled={disabled}
          className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 disabled:bg-zinc-50"
        >
          {DOMAIN_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}