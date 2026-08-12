import { NextResponse } from "next/server";
import { hasApiSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return NextResponse.json(
    { authenticated: hasApiSession(request) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
