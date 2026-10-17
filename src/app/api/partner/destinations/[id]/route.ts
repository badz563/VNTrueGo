import { NextResponse } from "next/server";
import { z } from "zod";
import { db, demoWritesAllowed } from "@/lib/db";
export const runtime = "nodejs";
const schema = z.object({
  status: z.enum(["unknown","normal","busy","overloaded","limited","closed"]).optional(),
  crowd: z.enum(["unknown","low","moderate","high"]).optional(),
  description: z.string().trim().min(10).max(2000).optional(),
  opening: z.object({ open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) }).optional(),
  announcement: z.string().trim().max(500).optional()
}).refine(v => Object.keys(v).length > 0);
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!demoWritesAllowed()) return NextResponse.json({ error: "Demo writes disabled in production." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu cập nhật không hợp lệ." }, { status: 400 });
  const { id } = await params;
  const sql = db();
  const previous = sql.prepare("SELECT * FROM destinations WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!previous) return NextResponse.json({ error: "Không tìm thấy địa điểm." }, { status: 404 });
  const nextStatus = parsed.data.status ?? previous.status as string;
  const nextCrowd = parsed.data.crowd ?? previous.crowd as string;
  const opening = parsed.data.opening ?? JSON.parse(String(previous.opening_json));
  if (opening.open >= opening.close) return NextResponse.json({ error: "Giờ đóng cửa phải sau giờ mở cửa." }, { status: 400 });
  const announcement = parsed.data.announcement?.trim();
  const description = parsed.data.description ?? String(previous.description);
  const changed = nextStatus !== previous.status || nextCrowd !== previous.crowd ||
    JSON.stringify(opening) !== previous.opening_json || description !== previous.description || !!announcement;
  if (!changed) return NextResponse.json({ updated: false, revision: previous.status_rev });
  const now = new Date().toISOString();
  const revision = Number(previous.status_rev) + 1;
  sql.exec("BEGIN");
  try {
    sql.prepare(`UPDATE destinations SET status=?,crowd=?,opening_json=?,description=?,status_rev=?,status_updated_at=?,
      status_source='partner-demo',crowd_updated_at=?,updated_at=? WHERE id=?`)
      .run(nextStatus, nextCrowd, JSON.stringify(opening), description, revision, now, now, now, id);
    sql.prepare(`INSERT INTO destination_status_history
      (destination_id,status,crowd,note,source,revision,created_at) VALUES (?,?,?,?,?,?,?)`)
      .run(id,nextStatus,nextCrowd,announcement || null,"partner-demo",revision,now);
    if (announcement) sql.prepare(`INSERT INTO destination_announcements
      (destination_id,message,source,created_at) VALUES (?,?,?,?)`)
      .run(id,announcement,"partner-demo",now);
    sql.exec("COMMIT");
  } catch (error) { sql.exec("ROLLBACK"); throw error; }
  return NextResponse.json({ updated: true, revision, changedAt: now });
}
