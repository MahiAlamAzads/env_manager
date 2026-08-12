export const NAME_MAX_LENGTH = 200;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export type NameInput = {
  nameOne: string;
  nameTwo: string;
};

export function parseNameInput(input: unknown): NameInput {
  if (!input || typeof input !== "object") {
    throw new ValidationError("Invalid request body.");
  }

  const record = input as Record<string, unknown>;
  const nameOne = normalizeName(record.nameOne);
  const nameTwo = normalizeName(record.nameTwo);

  if (!nameOne && !nameTwo) {
    throw new ValidationError("Enter at least one name.");
  }

  return { nameOne, nameTwo };
}

function normalizeName(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") {
    throw new ValidationError("Names must be text.");
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length > NAME_MAX_LENGTH) {
    throw new ValidationError(`Each name must be ${NAME_MAX_LENGTH} characters or fewer.`);
  }

  return normalized;
}

export function parsePositiveInteger(
  value: string | null,
  fallback: number,
  maximum: number,
): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

