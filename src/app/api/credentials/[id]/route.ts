import { NextResponse } from "next/server";
import { hasApiSession, isSameOriginMutation, unauthorizedResponse } from "@/lib/auth";
import { encryptVaultPayload } from "@/lib/vault-crypto";
import { prisma } from "@/lib/prisma";
import { parseAdminCredentialInput, VaultValidationError } from "@/lib/vault-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const CONTEXT = "admin-credential-v1";
type RouteContext = { params: Promise<{ id: string }> };

function parseId(value: string): bigint | null {
  if (!/^\d+$/.test(value) || value === "0") return null;
  try { return BigInt(value); } catch { return null; }
}

function mapRow(row: { id: bigint; softwareName: string; adminUrl: string; createdAt: Date; updatedAt: Date }) {
  return {
    id: row.id.toString(),
    softwareName: row.softwareName,
    adminUrl: row.adminUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!hasApiSession(request)) return unauthorizedResponse();
  if (!isSameOriginMutation(request)) return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });

  try {
    const id = parseId((await context.params).id);
    if (!id) return NextResponse.json({ message: "Invalid credential ID." }, { status: 400 });
    const input = parseAdminCredentialInput(await request.json());
    const encrypted = encryptVaultPayload(
      { email: input.email, username: input.username, password: input.password },
      CONTEXT,
    );
    const updated = await prisma.adminCredential.updateMany({
      where: { id },
      data: { softwareName: input.softwareName, adminUrl: input.adminUrl, ...encrypted, updatedAt: new Date() },
    });
    if (!updated.count) return NextResponse.json({ message: "Credential not found." }, { status: 404 });
    const row = await prisma.adminCredential.findUniqueOrThrow({ where: { id } });
    return NextResponse.json(mapRow(row), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof VaultValidationError || error instanceof SyntaxError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Failed to update admin credential", error);
    return NextResponse.json({ message: "Could not update the credential." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!hasApiSession(request)) return unauthorizedResponse();
  if (!isSameOriginMutation(request)) return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });

  try {
    const id = parseId((await context.params).id);
    if (!id) return NextResponse.json({ message: "Invalid credential ID." }, { status: 400 });
    const result = await prisma.adminCredential.deleteMany({ where: { id } });
    if (!result.count) return NextResponse.json({ message: "Credential not found." }, { status: 404 });
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to delete admin credential", error);
    return NextResponse.json({ message: "Could not delete the credential." }, { status: 500 });
  }
}
