import { NextResponse } from "next/server";
import { hasApiSession, isSameOriginMutation, unauthorizedResponse } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";
import { mapNameEntry } from "@/lib/name-entry-mapper";
import { prisma } from "@/lib/prisma";
import {
  parseNameInput,
  parsePositiveInteger,
  ValidationError,
} from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!hasApiSession(request)) return unauthorizedResponse();
  try {
    const url = new URL(request.url);
    const page = parsePositiveInteger(url.searchParams.get("page"), 1, 1_000_000);
    const pageSize = parsePositiveInteger(url.searchParams.get("pageSize"), 25, 100);
    const search = (url.searchParams.get("search") ?? "").trim().slice(0, 200);
    const skip = (page - 1) * pageSize;

    const where: Prisma.NameEntryWhereInput = search
      ? {
          OR: [
            { nameOne: { contains: search, mode: "insensitive" } },
            { nameTwo: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const [total, rows] = await Promise.all([
      prisma.nameEntry.count({ where }),
      prisma.nameEntry.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      items: rows.map(mapNameEntry),
      page,
      pageSize,
      total,
      totalPages,
    });
  } catch (error) {
    console.error("Failed to list names", error);
    return NextResponse.json(
      { message: "Could not load names." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!hasApiSession(request)) return unauthorizedResponse();
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  }
  try {
    const input = parseNameInput(await request.json());
    const row = await prisma.nameEntry.create({
      data: {
        nameOne: input.nameOne,
        nameTwo: input.nameTwo,
      },
    });

    return NextResponse.json(mapNameEntry(row), { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof SyntaxError) {
      return NextResponse.json(
        { message: error instanceof Error ? error.message : "Invalid request." },
        { status: 400 },
      );
    }

    console.error("Failed to create name", error);
    return NextResponse.json(
      { message: "Could not save the name." },
      { status: 500 },
    );
  }
}
