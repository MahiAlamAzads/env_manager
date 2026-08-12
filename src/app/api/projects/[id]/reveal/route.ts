import { NextResponse } from "next/server";
import { hasApiSession, unauthorizedResponse } from "@/lib/auth";
import { decryptVaultPayload } from "@/lib/vault-crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const CONTEXT = "project-env-v1";
type RouteContext = { params: Promise<{ id: string }> };

function parseId(value: string): bigint | null {
  if (!/^\d+$/.test(value) || value === "0") return null;
  try { return BigInt(value); } catch { return null; }
}

export async function GET(request: Request, context: RouteContext) {
  if (!hasApiSession(request)) return unauthorizedResponse();

  try {
    const id = parseId((await context.params).id);
    if (!id) return NextResponse.json({ message: "Invalid project ID." }, { status: 400 });
    const row = await prisma.projectSecret.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ message: "Project not found." }, { status: 404 });

    const payload = decryptVaultPayload<{ envValue: string }>(row, CONTEXT);
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    console.error("Failed to reveal project secret", error);
    return NextResponse.json({ message: "Could not decrypt this project. Check VAULT_ENCRYPTION_KEY." }, { status: 500 });
  }
}
