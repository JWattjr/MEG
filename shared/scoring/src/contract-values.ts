/** Preserve exact unsigned integers from GenLayer JSON (small numbers, large decimal strings). */
export function contractInteger(value: unknown, field: string): bigint {
  if (typeof value === "number" && (!Number.isSafeInteger(value) || value < 0)) throw new Error(`Invalid contract integer: ${field}`);
  if (typeof value !== "bigint" && typeof value !== "number" && !(typeof value === "string" && /^\d+$/.test(value))) throw new Error(`Invalid contract integer: ${field}`);
  const integer = BigInt(value as string | number | bigint);
  if (integer < 0n || integer >= 1n << 256n) throw new Error(`Contract integer out of range: ${field}`);
  return integer;
}

export function normalizeContractIntegers<T>(raw: unknown, fields: readonly string[]): T {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid contract record.");
  const result = { ...raw } as Record<string, unknown>;
  for (const field of fields) if (result[field] !== undefined) result[field] = contractInteger(result[field], field);
  return result as T;
}
