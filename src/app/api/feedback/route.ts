import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
export const runtime = "nodejs";
const schema = z.object({ destinationId: z.string().min(1), message: z.string().trim().min(10).max(500) });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Phản hồi cần từ 10 đến 500 ký tự." }, { status: 400 });
  const sql = await db();
  if (!sql) return NextResponse.json({ error: "Phản hồi chưa khả dụng khi chưa kết nối database lưu trữ." }, { status: 503 });
  const destination = await sql.execute({sql:"SELECT id FROM destinations WHERE id=?",args:[parsed.data.destinationId]});
  if (!destination.rows.length) return NextResponse.json({ error: "Địa điểm không tồn tại." }, { status: 404 });
  await sql.execute({sql:"INSERT INTO feedback (destination_id,message,created_at) VALUES (?,?,?)",
    args:[parsed.data.destinationId,parsed.data.message,new Date().toISOString()]});
  return NextResponse.json({ saved: true, verification: "unverified" }, { status: 201 });
}
