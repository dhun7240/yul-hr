"use client";

import { formatPhone, onlyDigits } from "@/lib/utils/formatters";

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export default function InputPhone({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = "010-1234-5678",
  className,
}: Props) {
  function handleChange(raw: string) {
    const digits = onlyDigits(raw).slice(0, 11);

    if (!digits) {
      onChange("010");
      return;
    }

    if (!digits.startsWith("010")) {
      const merged = `010${digits}`.slice(0, 11);
      onChange(merged);
      return;
    }

    onChange(digits);
  }

  return (
    <label className="block text-sm">
      {label ? (
        <span className="mb-1 block font-medium text-zinc-700">
          {label} {required ? "*" : ""}
        </span>
      ) : null}

      <input
        value={formatPhone(value || "010")}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        inputMode="numeric"
        className={
          className ??
          "w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 disabled:bg-zinc-50"
        }
      />
    </label>
  );
}