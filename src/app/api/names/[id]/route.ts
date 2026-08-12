import { NextResponse } from "next/server";
import { hasApiSession, isSameOriginMutation, unauthorizedResponse } from "@/lib/auth";
import { mapNameEntry } from "@/lib/name-entry-mapper";
import { prisma } from "@/lib/prisma";
import { parseNameInput, ValidationError } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseId(value: string): bigint | null {
  if (!/^\d+$/.test(value) || value === "0") return null;

  try {
    const id = BigInt(value);
    return id > 0n ? id : null;
  } catch {
    return null;
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!hasApiSession(request)) return unauthorizedResponse();
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  }
  try {
    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json({ message: "Invalid record ID." }, { status: 400 });
    }

    const input = parseNameInput(await request.json());
    const updateResult = await prisma.nameEntry.updateMany({
      where: { id },
      data: {
        nameOne: input.nameOne,
        nameTwo: input.nameTwo,
        updatedAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      return NextResponse.json({ message: "Record not found." }, { status: 404 });
    }

    const row = await prisma.nameEntry.findUnique({ where: { id } });
    if (!row) {
      return NextResponse.json({ message: "Record not found." }, { status: 404 });
    }

    return NextResponse.json(mapNameEntry(row));
  } catch (error) {
    if (error instanceof ValidationError || error instanceof SyntaxError) {
      return NextResponse.json(
        { message: error instanceof Error ? error.message : "Invalid request." },
        { status: 400 },
      );
    }

    console.error("Failed to update name", error);
    return NextResponse.json(
      { message: "Could not update the name." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!hasApiSession(request)) return unauthorizedResponse();
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  }
  try {
    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json({ message: "Invalid record ID." }, { status: 400 });
    }

    const result = await prisma.nameEntry.deleteMany({ where: { id } });
    if (result.count === 0) {
      return NextResponse.json({ message: "Record not found." }, { status: 404 });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete name", error);
    return NextResponse.json(
      { message: "Could not delete the record." },
      { status: 500 },
    );
  }
}
