"use client";

import { ChangeEvent, InputHTMLAttributes, useEffect, useMemo, useState } from "react";

type InputCurrencyProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value: string;
  onChange: (value: string) => void;
};

function toDigits(value: string | null | undefined) {
  return (value ?? "").replace(/[^\d]/g, "");
}

function formatCurrency(value: string | null | undefined) {
  const digits = toDigits(value);
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

export default function InputCurrency({
  value,
  onChange,
  className = "",
  disabled,
  readOnly,
  placeholder = "0",
  ...rest
}: InputCurrencyProps) {
  const externalDigits = useMemo(() => toDigits(value), [value]);
  const [displayValue, setDisplayValue] = useState(formatCurrency(value));

  useEffect(() => {
    const currentDigits = toDigits(displayValue);
    if (currentDigits !== externalDigits) {
      setDisplayValue(formatCurrency(externalDigits));
    }
  }, [externalDigits, displayValue]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const nextDigits = toDigits(e.target.value);
    setDisplayValue(formatCurrency(nextDigits));
    onChange(nextDigits);
  }

  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      disabled={disabled}
      readOnly={readOnly}
      placeholder={placeholder}
      className={[
        "h-12 w-full rounded-2xl border border-zinc-200 px-4 text-[15px] font-medium leading-none text-zinc-900 placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none",
        disabled ? "bg-zinc-50 text-zinc-500" : "bg-white",
        className,
      ].join(" ")}
    />
  );
}