import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const SESSION_COOKIE_NAME = "company_vault_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function requiredEnv(name: "APP_ACCESS_PASSWORD" | "VAULT_SESSION_SECRET"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function sessionSecret(): Buffer {
  const raw = requiredEnv("VAULT_SESSION_SECRET");
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length < 32) {
    throw new Error("VAULT_SESSION_SECRET must decode to at least 32 bytes.");
  }
  return decoded;
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret())
    .update(payload, "utf8")
    .digest("base64url");
}

export function verifyAccessPassword(candidate: string): boolean {
  const expected = digest(requiredEnv("APP_ACCESS_PASSWORD"));
  const actual = digest(candidate);
  return timingSafeEqual(expected, actual);
}

export function createSessionToken(): string {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const nonce = randomBytes(18).toString("base64url");
  const payload = `${expiresAt}.${nonce}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [expiresRaw, nonce, signature] = parts;
  if (!expiresRaw || !nonce || !signature) return false;

  const expiresAt = Number(expiresRaw);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const payload = `${expiresRaw}.${nonce}`;
  const expected = Buffer.from(sign(payload), "utf8");
  const actual = Buffer.from(signature, "utf8");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function parseCookies(header: string | null): Map<string, string> {
  const values = new Map<string, string>();
  if (!header) return values;

  for (const segment of header.split(";")) {
    const [rawName, ...rawValue] = segment.trim().split("=");
    if (!rawName) continue;
    values.set(rawName, decodeURIComponent(rawValue.join("=")));
  }

  return values;
}

export function hasApiSession(request: Request): boolean {
  const token = parseCookies(request.headers.get("cookie")).get(SESSION_COOKIE_NAME);
  return verifySessionToken(token);
}

export function isSameOriginMutation(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function unauthorizedResponse(): Response {
  return Response.json(
    { message: "Authentication required." },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
