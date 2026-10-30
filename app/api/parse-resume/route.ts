import { NextResponse } from "next/server";
// @ts-ignore
import { PDFParse } from "pdf-parse";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();

    const text = result?.text ?? "";
    const lines = text.split(/\r?\n/).filter(Boolean).length;

    return NextResponse.json({
      ok: true,
      text,
      lines,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to parse PDF" },
      { status: 500 },
    );
  }
}
