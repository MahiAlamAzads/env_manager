export class VaultValidationError extends Error {}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new VaultValidationError("Invalid request body.");
  }
  return value as Record<string, unknown>;
}

function text(
  value: unknown,
  field: string,
  maxLength: number,
  required = false,
): string {
  if (value === undefined || value === null) {
    if (required) throw new VaultValidationError(`${field} is required.`);
    return "";
  }
  if (typeof value !== "string") {
    throw new VaultValidationError(`${field} must be text.`);
  }
  const normalized = value.trim();
  if (required && !normalized) {
    throw new VaultValidationError(`${field} is required.`);
  }
  if (normalized.length > maxLength) {
    throw new VaultValidationError(`${field} is too long.`);
  }
  return normalized;
}

function multilineText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string") {
    throw new VaultValidationError(`${field} must be text.`);
  }
  if (value.length > maxLength) {
    throw new VaultValidationError(`${field} is too long.`);
  }
  return value.replace(/\r\n/g, "\n");
}

function optionalUrl(value: unknown, field: string, githubOnly = false): string {
  const normalized = text(value, field, 500, false);
  if (!normalized) return "";

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new VaultValidationError(`${field} must be a valid URL.`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new VaultValidationError(`${field} must use http or https.`);
  }

  if (githubOnly && !["github.com", "www.github.com"].includes(url.hostname.toLowerCase())) {
    throw new VaultValidationError("GitHub URL must point to github.com.");
  }

  return url.toString();
}

export function parseProjectSecretInput(value: unknown) {
  const body = asObject(value);
  return {
    projectName: text(body.projectName, "Project name", 200, true),
    githubUrl: optionalUrl(body.githubUrl, "GitHub URL", true),
    envValue: multilineText(body.envValue, ".env value", 100_000),
  };
}

export function parseAdminCredentialInput(value: unknown) {
  const body = asObject(value);
  const email = text(body.email, "Email", 320, false);
  const username = text(body.username, "Username", 200, false);
  if (!email && !username) {
    throw new VaultValidationError("Enter an email or username.");
  }

  return {
    softwareName: text(body.softwareName, "Software name", 200, true),
    adminUrl: optionalUrl(body.adminUrl, "Admin URL"),
    email,
    username,
    password: text(body.password, "Password", 1_000, true),
  };
}
