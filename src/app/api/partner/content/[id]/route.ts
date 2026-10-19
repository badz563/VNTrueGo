import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, sameOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageDestination } from "@/lib/partnerAccess";
export const runtime="nodejs";
const schema=z.object({type:z.enum(["event","offer"])});
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!sameOrigin(request))return NextResponse.json({error:"Nguồn yêu cầu không hợp lệ."},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Vui lòng đăng nhập."},{status:401});
  const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Loại nội dung không hợp lệ."},{status:400});
  const id=(await params).id,table=parsed.data.type==="event"?"events":"offers",sql=await db();if(!sql)return NextResponse.json({error:"Database chưa khả dụng."},{status:503});
  const found=await sql.execute({sql:`SELECT destination_id,status FROM ${table} WHERE id=?`,args:[id]});
  if(!found.rows.length)return NextResponse.json({error:"Không tìm thấy nội dung."},{status:404});
  if(!await canManageDestination(sql,user,String(found.rows[0].destination_id),parsed.data.type==="offer"))return NextResponse.json({error:"Không có quyền."},{status:403});
  await sql.batch([
    {sql:`UPDATE ${table} SET status='cancelled' WHERE id=?`,args:[id]},
    {sql:"INSERT INTO audit_logs(actor_id,action,target_type,target_id,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?)",args:[user.id,"content_cancel",parsed.data.type,id,JSON.stringify({status:found.rows[0].status}),JSON.stringify({status:"cancelled"}),new Date().toISOString()]}
  ],"write");
  return NextResponse.json({cancelled:true});
}
