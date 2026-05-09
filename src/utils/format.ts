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
