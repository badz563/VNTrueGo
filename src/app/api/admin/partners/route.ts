import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, sameOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
export const runtime="nodejs";
const schema=z.object({userId:z.string().uuid(),destinationId:z.string().min(1),role:z.enum(["partner_manager","partner_staff"])});
export async function GET(){
  const admin=await currentUser();if(admin?.role!=="admin")return NextResponse.json({error:"Không có quyền."},{status:403});
  const sql=await db();if(!sql)return NextResponse.json({error:"Database chưa khả dụng."},{status:503});
  const [users,destinations,members]=await Promise.all([
    sql.execute("SELECT id,email,display_name AS displayName,role FROM users ORDER BY created_at DESC LIMIT 200"),
    sql.execute("SELECT id,name FROM destinations ORDER BY name"),
    sql.execute("SELECT user_id AS userId,destination_id AS destinationId,role FROM partner_members")
  ]);
  return NextResponse.json({users:users.rows,destinations:destinations.rows,members:members.rows},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:"Nguồn yêu cầu không hợp lệ."},{status:403});
  const admin=await currentUser();if(admin?.role!=="admin")return NextResponse.json({error:"Không có quyền."},{status:403});
  const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Thông tin cấp quyền không hợp lệ."},{status:400});
  const sql=await db();if(!sql)return NextResponse.json({error:"Database chưa khả dụng."},{status:503});
  const {userId,destinationId,role}=parsed.data;
  const found=await sql.execute({sql:"SELECT role FROM users WHERE id=?",args:[userId]});
  if(!found.rows.length||found.rows[0].role==="admin")return NextResponse.json({error:"Tài khoản không hợp lệ."},{status:400});
  const place=await sql.execute({sql:"SELECT id FROM destinations WHERE id=?",args:[destinationId]});if(!place.rows.length)return NextResponse.json({error:"Địa điểm không tồn tại."},{status:404});
  const now=new Date().toISOString();
  await sql.batch([
    {sql:"INSERT INTO partner_members(user_id,destination_id,role) VALUES(?,?,?) ON CONFLICT(user_id,destination_id) DO UPDATE SET role=excluded.role",args:[userId,destinationId,role]},
    {sql:"UPDATE users SET role=? WHERE id=?",args:[role,userId]},
    {sql:"INSERT INTO audit_logs(actor_id,action,target_type,target_id,after_json,created_at) VALUES(?,?,?,?,?,?)",args:[admin.id,"partner_grant","destination",destinationId,JSON.stringify({userId,role}),now]}
  ],"write");
  return NextResponse.json({granted:true});
}
