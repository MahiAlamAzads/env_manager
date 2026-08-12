import ExcelJS from "exceljs";
import { hasApiSession, unauthorizedResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!hasApiSession(request)) return unauthorizedResponse();
  try {
    const rows = await prisma.nameEntry.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Name Table App";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Names", {
      views: [{ state: "frozen", ySplit: 1 }],
      properties: { defaultRowHeight: 21 },
    });

    worksheet.columns = [
      { header: "ID", key: "id", width: 12 },
      { header: "Name 1", key: "nameOne", width: 34 },
      { header: "Name 2", key: "nameTwo", width: 34 },
      { header: "Created At", key: "createdAt", width: 24 },
      { header: "Updated At", key: "updatedAt", width: 24 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: "middle" };
    worksheet.autoFilter = { from: "A1", to: "E1" };

    for (const row of rows) {
      worksheet.addRow({
        id: row.id.toString(),
        nameOne: row.nameOne,
        nameTwo: row.nameTwo,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    }

    worksheet.getColumn("createdAt").numFmt = "yyyy-mm-dd hh:mm:ss";
    worksheet.getColumn("updatedAt").numFmt = "yyyy-mm-dd hh:mm:ss";

    const buffer = await workbook.xlsx.writeBuffer();
    const date = new Date().toISOString().slice(0, 10);

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="name-database-${date}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to export names", error);
    return Response.json(
      { message: "Could not export the database." },
      { status: 500 },
    );
  }
}
