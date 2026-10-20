import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, sameOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
const schema = z.object({ destinationId: z.string().min(1).max(100) });
const responseHeaders = { "Cache-Control": "no-store" };

async function purchaseFor(userId: string, destinationId: string) {
  const sql = await db();
  if (!sql) return null;
  const found = await sql.execute({
    sql: "SELECT id,amount,created_at AS createdAt FROM demo_purchases WHERE user_id=? AND destination_id=?",
    args: [userId,destinationId]
  });
  return found.rows[0] || null;
}

export async function GET(request: Request) {
  const parsed = schema.safeParse({ destinationId: new URL(request.url).searchParams.get("destinationId") });
  if (!parsed.success) return NextResponse.json({ error: "Địa điểm không hợp lệ." }, { status: 400 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ authenticated: false, purchase: null }, { headers: responseHeaders });
  const sql = await db();
  if (!sql) return NextResponse.json({ authenticated: true, available: false, purchase: null }, { headers: responseHeaders });
  return NextResponse.json({ authenticated: true, available: true, purchase: await purchaseFor(user.id,parsed.data.destinationId) }, { headers: responseHeaders });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  const limited = rateLimit(request,"demo-purchase",20);
  if (limited) return limited;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Địa điểm không hợp lệ." }, { status: 400 });
  const sql = await db();
  if (!sql) return NextResponse.json({ error: "Chưa có nơi lưu biên nhận." }, { status: 503 });
  const found = await sql.execute({ sql: "SELECT id,price FROM destinations WHERE id=?", args: [parsed.data.destinationId] });
  if (!found.rows.length) return NextResponse.json({ error: "Địa điểm không tồn tại." }, { status: 404 });
  const id = `TG-DEMO-${randomUUID()}`;
  // The amount is illustrative and never sent to a payment provider.
  const amount = Math.max(10_000,Number(found.rows[0].price || 0));
  await sql.execute({
    sql: "INSERT OR IGNORE INTO demo_purchases(id,user_id,destination_id,amount,created_at) VALUES(?,?,?,?,?)",
    args: [id,user.id,parsed.data.destinationId,amount,new Date().toISOString()]
  });
  return NextResponse.json({ purchase: await purchaseFor(user.id,parsed.data.destinationId), simulated: true }, { headers: responseHeaders });
}
