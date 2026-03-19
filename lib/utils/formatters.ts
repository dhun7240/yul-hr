export function onlyDigits(value: string) {
  return (value || "").replace(/\D/g, "");
}

export function formatPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (!digits) return "010";
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function normalizePhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (!digits) return "010";
  if (digits.length <= 3) return digits;
  return digits;
}

export function formatBusinessNumber(value: string) {
  const digits = onlyDigits(value).slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export function formatResidentRegistrationNumber(value: string) {
  const digits = onlyDigits(value).slice(0, 13);
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 6)}-${digits.slice(6)}`;
}

export function normalizeResidentRegistrationNumber(value: string) {
  return onlyDigits(value).slice(0, 13);
}

export function formatCurrency(value: string | number) {
  const raw = String(value ?? "").replace(/[^\d-]/g, "");
  if (!raw || raw === "-") return "";
  return Number(raw).toLocaleString("ko-KR");
}

export function normalizeCurrency(value: string | number) {
  const raw = String(value ?? "").replace(/[^\d-]/g, "");
  if (!raw || raw === "-") return "0";
  return raw;
}

export function formatMonthLabel(year: number, month: number) {
  return `${year}년 ${String(month).padStart(2, "0")}월`;
}

export function toNullableString(value: unknown) {
  const v = String(value ?? "").trim();
  return v || null;
}

export function boolFromValue(value: unknown) {
  if (typeof value === "boolean") return value;
  const v = String(value ?? "").trim().toLowerCase();
  return ["true", "1", "y", "yes", "사용", "재직", "active"].includes(v);
}