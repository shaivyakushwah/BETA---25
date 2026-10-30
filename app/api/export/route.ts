import { connection } from "next/server";
import { exportAll } from "@/lib/db";

export async function GET() {
  await connection();
  const data = exportAll();
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="shortlist-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
