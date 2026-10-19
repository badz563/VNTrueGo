import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sameOrigin, startSession, verifyPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
export const runtime="nodejs";
const schema=z.object({email:z.string().email().max(254).transform(v=>v.trim().toLowerCase()),password:z.string().min(1)});
export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:"Nguồn yêu cầu không hợp lệ."},{status:403});
  const limited=rateLimit(request,"login",30);if(limited)return limited;
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Thông tin đăng nhập không hợp lệ."},{status:400});
  const sql=await db();if(!sql)return NextResponse.json({error:"Tài khoản cần database lưu trữ."},{status:503});
  const now=new Date();
  const attempt=await sql.execute({sql:"SELECT failures,locked_until FROM auth_attempts WHERE email=?",args:[parsed.data.email]});
  const state=attempt.rows[0];
  if(state?.locked_until&&new Date(String(state.locked_until))>now)return NextResponse.json({error:"Vui lòng thử lại sau 15 phút."},{status:429});
  const found=await sql.execute({sql:"SELECT id,email,password_hash,display_name,role FROM users WHERE email=?",args:[parsed.data.email]});
  const row=found.rows[0];
  if(!row||!await verifyPassword(parsed.data.password,String(row.password_hash))){
    const failures=state?.locked_until&&new Date(String(state.locked_until))<=now?1:Number(state?.failures||0)+1;
    const lockedUntil=failures>=5?new Date(now.getTime()+15*60*1000).toISOString():null;
    await sql.execute({sql:"INSERT INTO auth_attempts(email,failures,locked_until,updated_at) VALUES(?,?,?,?) ON CONFLICT(email) DO UPDATE SET failures=excluded.failures,locked_until=excluded.locked_until,updated_at=excluded.updated_at",args:[parsed.data.email,failures,lockedUntil,now.toISOString()]});
    return NextResponse.json({error:"Email hoặc mật khẩu không đúng."},{status:401});
  }
  await sql.execute({sql:"DELETE FROM auth_attempts WHERE email=?",args:[parsed.data.email]});
  await startSession(String(row.id));
  return NextResponse.json({user:{id:row.id,email:row.email,displayName:row.display_name,role:row.role}});
}
