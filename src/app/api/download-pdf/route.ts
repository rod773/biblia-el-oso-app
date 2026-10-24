import { NextResponse } from "next/server";
import * as fs from "fs";
import path from "path";

export async function GET() {
  const filePath = path.join(process.cwd(), "public", "Biblia el oso.pdf");
  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Biblia el oso.pdf"',
    },
  });
}
