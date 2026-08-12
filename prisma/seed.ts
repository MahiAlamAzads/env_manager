import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existingCount = await prisma.nameEntry.count();
  if (existingCount > 0) {
    console.log("Seed skipped: name_entries already contains data.");
    return;
  }

  await prisma.nameEntry.createMany({
    data: [
      { nameOne: "Mahi Alam", nameTwo: "মাহি আলম" },
      { nameOne: "TechTeam", nameTwo: "টেকটিম" },
      { nameOne: "Sample Name", nameTwo: "নমুনা নাম" },
    ],
  });

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
