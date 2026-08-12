import { NextResponse } from "next/server";
import { hasApiSession, isSameOriginMutation, unauthorizedResponse } from "@/lib/auth";
import { encryptVaultPayload } from "@/lib/vault-crypto";
import { prisma } from "@/lib/prisma";
import { parseProjectSecretInput, VaultValidationError } from "@/lib/vault-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const CONTEXT = "project-env-v1";

function mapRow(row: { id: bigint; projectName: string; githubUrl: string; createdAt: Date; updatedAt: Date }) {
  return {
    id: row.id.toString(),
    projectName: row.projectName,
    githubUrl: row.githubUrl,
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
            { projectName: { contains: search, mode: "insensitive" as const } },
            { githubUrl: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.projectSecret.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: 200,
        select: { id: true, projectName: true, githubUrl: true, createdAt: true, updatedAt: true },
      }),
      prisma.projectSecret.count({ where }),
    ]);

    return NextResponse.json(
      { items: items.map(mapRow), total },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to list project secrets", error);
    return NextResponse.json({ message: "Could not load projects." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!hasApiSession(request)) return unauthorizedResponse();
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  }

  try {
    const input = parseProjectSecretInput(await request.json());
    const encrypted = encryptVaultPayload({ envValue: input.envValue }, CONTEXT);
    const row = await prisma.projectSecret.create({
      data: {
        projectName: input.projectName,
        githubUrl: input.githubUrl,
        ...encrypted,
      },
    });
    return NextResponse.json(mapRow(row), { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof VaultValidationError || error instanceof SyntaxError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Failed to create project secret", error);
    return NextResponse.json({ message: "Could not save the project." }, { status: 500 });
  }
}
