import { MAX_NAME_LENGTH } from "./types";

export function normalizeName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeCode(code: unknown): string | null {
  if (typeof code !== "string") return null;
  const upper = code.trim().toUpperCase();
  return /^[A-Z]{4}$/.test(upper) ? upper : null;
}
