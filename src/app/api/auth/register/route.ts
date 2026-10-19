import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, sameOrigin, startSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
export const runtime="nodejs";
const schema=z.object({email:z.string().email().max(254).transform(v=>v.trim().toLowerCase()),password:z.string().min(12).max(128),displayName:z.string().trim().min(2).max(60)});
export async function POST(request:Request){
  if(!sameOrigin(request)) return NextResponse.json({error:"Nguồn yêu cầu không hợp lệ."},{status:403});
  const limited=rateLimit(request,"register",10);if(limited)return limited;
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return NextResponse.json({error:"Kiểm tra email, tên và mật khẩu tối thiểu 12 ký tự."},{status:400});
  const sql=await db();if(!sql)return NextResponse.json({error:"Tài khoản cần database lưu trữ."},{status:503});
  const id=randomUUID();
  try{await sql.execute({sql:"INSERT INTO users(id,email,password_hash,display_name,role,created_at) VALUES(?,?,?,?,?,?)",args:[id,parsed.data.email,await hashPassword(parsed.data.password),parsed.data.displayName,"traveler",new Date().toISOString()]});}
  catch{return NextResponse.json({error:"Email này đã được sử dụng."},{status:409});}
  await startSession(id);
  return NextResponse.json({user:{id,email:parsed.data.email,displayName:parsed.data.displayName,role:"traveler"}},{status:201});
}
