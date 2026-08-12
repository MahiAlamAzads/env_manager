import type { NameEntry as PrismaNameEntry } from "@/generated/prisma/client";
import type { NameEntry } from "@/types/name-entry";

export function mapNameEntry(row: PrismaNameEntry): NameEntry {
  return {
    id: row.id.toString(),
    nameOne: row.nameOne,
    nameTwo: row.nameTwo,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
