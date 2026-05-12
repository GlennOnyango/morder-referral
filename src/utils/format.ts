import { isAxiosError } from "axios";

export function formatError(error: unknown): string {
  if (isAxiosError(error)) {
    const payload = error.response?.data;
    if (payload && typeof payload === "object" && "message" in payload) {
      const value = (payload as { message?: unknown }).message;
      if (typeof value === "string") return value;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Request failed. Please try again.";
}

export function formatDateTime(value?: string): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export function formatFieldValue(value?: string | number): string {
  if (typeof value === "number") return value.toString();
  return value ?? "";
}

export function formatDateOfBirthEpoch(value?: number): string {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) return "-";
  if (value >= 1900 && value <= 2100) return value.toString();
  const ms = value < 1_000_000_000_000 ? value * 1000 : value;
  const parsed = new Date(ms);
  if (Number.isNaN(parsed.getTime())) return value.toString();
  return parsed.toLocaleDateString();
}

export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}



export const formatEventType = (value?: string): string => {
  if (!value) return "Notification";
  return value
    .split(/[._-]+/)
    .filter((p) => p.length > 0)
    .map((p) => `${p[0]?.toUpperCase() ?? ""}${p.slice(1).toLowerCase()}`)
    .join(" ");
};