"use client";

import { formatCurrency, normalizeCurrency } from "@/lib/utils/formatters";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
};

export default function InputCurrency({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = "0",
}: Props) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-zinc-700">
        {label} {required ? "*" : ""}
      </span>
      <input
        value={formatCurrency(value)}
        onChange={(e) => onChange(normalizeCurrency(e.target.value))}
        disabled={disabled}
        placeholder={placeholder}
        inputMode="numeric"
        className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900 disabled:bg-zinc-50"
      />
    </label>
  );
}