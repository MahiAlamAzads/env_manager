import { NextResponse } from "next/server";
import { hasApiSession, isSameOriginMutation, unauthorizedResponse } from "@/lib/auth";
import { encryptVaultPayload } from "@/lib/vault-crypto";
import { prisma } from "@/lib/prisma";
import { parseAdminCredentialInput, VaultValidationError } from "@/lib/vault-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const CONTEXT = "admin-credential-v1";

function mapRow(row: { id: bigint; softwareName: string; adminUrl: string; createdAt: Date; updatedAt: Date }) {
  return {
    id: row.id.toString(),
    softwareName: row.softwareName,
    adminUrl: row.adminUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  if (!hasApiSession(request)) return unauthorizedResponse();

  try {
    const search = new URL(request.url).searchParams.get("search")?.trim().slice(0, 200) ?? "";
    const where = search
      ? {
          OR: [
            { softwareName: { contains: search, mode: "insensitive" as const } },
            { adminUrl: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.adminCredential.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: 200,
        select: { id: true, softwareName: true, adminUrl: true, createdAt: true, updatedAt: true },
      }),
      prisma.adminCredential.count({ where }),
    ]);

    return NextResponse.json(
      { items: items.map(mapRow), total },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to list admin credentials", error);
    return NextResponse.json({ message: "Could not load credentials." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!hasApiSession(request)) return unauthorizedResponse();
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  }

  try {
    const input = parseAdminCredentialInput(await request.json());
    const encrypted = encryptVaultPayload(
      { email: input.email, username: input.username, password: input.password },
      CONTEXT,
    );
    const row = await prisma.adminCredential.create({
      data: {
        softwareName: input.softwareName,
        adminUrl: input.adminUrl,
        ...encrypted,
      },
    });
    return NextResponse.json(mapRow(row), { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof VaultValidationError || error instanceof SyntaxError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Failed to create admin credential", error);
    return NextResponse.json({ message: "Could not save the credential." }, { status: 500 });
  }
}
