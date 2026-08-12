import { NextResponse } from "next/server";
import {
  createSessionToken,
  isSameOriginMutation,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  verifyAccessPassword,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function clientKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const state = attempts.get(key);
  if (!state || state.resetAt <= now) {
    attempts.delete(key);
    return false;
  }
  return state.count >= MAX_ATTEMPTS;
}

function recordFailure(key: string) {
  const now = Date.now();
  const state = attempts.get(key);
  if (!state || state.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  state.count += 1;
}

export async function POST(request: Request) {
  try {
    if (!isSameOriginMutation(request)) {
      return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
    }

    const key = clientKey(request);
    if (isRateLimited(key)) {
      return NextResponse.json(
        { message: "Too many login attempts. Try again later." },
        { status: 429, headers: { "Cache-Control": "no-store" } },
      );
    }

    const body = (await request.json()) as { password?: unknown };
    if (typeof body.password !== "string" || !verifyAccessPassword(body.password)) {
      recordFailure(key);
      return NextResponse.json(
        { message: "Incorrect access password." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    attempts.delete(key);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(), sessionCookieOptions());
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Vault login failed", error);
    return NextResponse.json(
      { message: "Vault authentication is not configured correctly." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
