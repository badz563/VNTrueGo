import { NextResponse } from "next/server";
import { z } from "zod";
import { db, demoWritesAllowed } from "@/lib/db";
import { currentUser, sameOrigin } from "@/lib/auth";
export const runtime = "nodejs";
const schema = z.object({
  status: z.enum(["unknown","normal","busy","overloaded","limited","closed"]).optional(),
  crowd: z.enum(["unknown","low","moderate","high"]).optional(),
  description: z.string().trim().min(10).max(2000).optional(),
  opening: z.object({ open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) }).optional(),
  announcement: z.string().trim().max(500).optional()
}).refine(v => Object.keys(v).length > 0);
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if(!sameOrigin(request))return NextResponse.json({error:"Nguồn yêu cầu không hợp lệ."},{status:403});
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu cập nhật không hợp lệ." }, { status: 400 });
  const { id } = await params;
  const sql = await db();
  if (!sql) return NextResponse.json({ error: "Database lưu trữ chưa được cấu hình." }, { status: 503 });
  const isDemo=demoWritesAllowed()&&new URL(request.url).pathname.startsWith("/api/partner-demo/");
  const user=isDemo?null:await currentUser();
  if(!isDemo){
    if(!user||!["admin","partner_manager","partner_staff"].includes(user.role))return NextResponse.json({error:"Không có quyền."},{status:403});
    if(user.role!=="admin"){
      const member=await sql.execute({sql:"SELECT role FROM partner_members WHERE user_id=? AND destination_id=?",args:[user.id,id]});
      if(!member.rows.length)return NextResponse.json({error:"Bạn không quản lý địa điểm này."},{status:403});
      if(member.rows[0].role==="partner_staff"&&parsed.data.description!==undefined){
        const current=await sql.execute({sql:"SELECT description FROM destinations WHERE id=?",args:[id]});
        if(parsed.data.description!==current.rows[0]?.description)return NextResponse.json({error:"Nhân viên không được sửa phần giới thiệu."},{status:403});
      }
    }
  }
  const transaction = await sql.transaction("write");
  try {
    const found = await transaction.execute({ sql: "SELECT * FROM destinations WHERE id = ?", args: [id] });
    const previous = found.rows[0];
    if (!previous) { await transaction.rollback(); return NextResponse.json({ error: "Không tìm thấy địa điểm." }, { status: 404 }); }
    const nextStatus = parsed.data.status ?? String(previous.status);
    const nextCrowd = parsed.data.crowd ?? String(previous.crowd);
    const opening = parsed.data.opening ?? JSON.parse(String(previous.opening_json));
    if (opening.open >= opening.close) { await transaction.rollback(); return NextResponse.json({ error: "Giờ đóng cửa phải sau giờ mở cửa." }, { status: 400 }); }
    const announcement = parsed.data.announcement?.trim();
    const description = parsed.data.description ?? String(previous.description);
    const changed = nextStatus !== previous.status || nextCrowd !== previous.crowd ||
      JSON.stringify(opening) !== previous.opening_json || description !== previous.description || !!announcement;
    if (!changed) { await transaction.rollback(); return NextResponse.json({ updated: false, revision: previous.status_rev }); }
    const now = new Date().toISOString();
    const revision = Number(previous.status_rev) + 1;
    await transaction.execute({ sql:`UPDATE destinations SET status=?,crowd=?,opening_json=?,description=?,status_rev=?,status_updated_at=?,
      status_source=?,crowd_updated_at=?,updated_at=? WHERE id=?`,
      args:[nextStatus, nextCrowd, JSON.stringify(opening), description, revision, now, isDemo?"partner-demo":"partner", now, now, id] });
    await transaction.execute({ sql:`INSERT INTO destination_status_history
      (destination_id,status,crowd,note,source,revision,created_at) VALUES (?,?,?,?,?,?,?)`,
      args:[id,nextStatus,nextCrowd,announcement || null,isDemo?"partner-demo":"partner",revision,now] });
    if (announcement) await transaction.execute({ sql:`INSERT INTO destination_announcements
      (destination_id,message,source,created_at) VALUES (?,?,?,?)`,
      args:[id,announcement,isDemo?"partner-demo":"partner",now] });
    if(user)await transaction.execute({sql:"INSERT INTO audit_logs(actor_id,action,target_type,target_id,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?)",args:[user.id,"destination_update","destination",id,JSON.stringify({status:previous.status,crowd:previous.crowd,opening:previous.opening_json,description:previous.description}),JSON.stringify(parsed.data),now]});
    await transaction.commit();
    return NextResponse.json({ updated: true, revision, changedAt: now });
  } catch (error) { if (!transaction.closed) await transaction.rollback(); throw error; }
}
