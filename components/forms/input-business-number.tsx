"use client";

import { formatBusinessNumber, onlyDigits } from "@/lib/utils/formatters";

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export default function InputBusinessNumber({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = "123-45-67890",
  className,
}: Props) {
  return (
    <label className="block text-sm">
      {label ? (
        <span className="mb-1 block font-medium text-zinc-700">
          {label} {required ? "*" : ""}
        </span>
      ) : null}

      <input
        value={formatBusinessNumber(value)}
        onChange={(e) => onChange(onlyDigits(e.target.value).slice(0, 10))}
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