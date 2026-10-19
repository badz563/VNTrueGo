import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, endSession, hashPassword, sameOrigin, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
export const runtime="nodejs";
const schema=z.object({currentPassword:z.string().min(1),newPassword:z.string().min(12).max(128)});
export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:"Nguồn yêu cầu không hợp lệ."},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Vui lòng đăng nhập."},{status:401});
  const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Mật khẩu mới cần tối thiểu 12 ký tự."},{status:400});
  const sql=await db();if(!sql)return NextResponse.json({error:"Database chưa khả dụng."},{status:503});
  const found=await sql.execute({sql:"SELECT password_hash FROM users WHERE id=?",args:[user.id]});
  if(!found.rows.length||!await verifyPassword(parsed.data.currentPassword,String(found.rows[0].password_hash)))return NextResponse.json({error:"Mật khẩu hiện tại không đúng."},{status:403});
  await sql.batch([
    {sql:"UPDATE users SET password_hash=? WHERE id=?",args:[await hashPassword(parsed.data.newPassword),user.id]},
    {sql:"DELETE FROM sessions WHERE user_id=?",args:[user.id]}
  ],"write");
  await endSession();
  return NextResponse.json({updated:true,reauthenticate:true});
}
