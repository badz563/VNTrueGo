import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, sameOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
export const runtime="nodejs";
const schema=z.object({displayName:z.string().trim().min(2).max(60)});
export async function PATCH(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:"Nguồn yêu cầu không hợp lệ."},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Vui lòng đăng nhập."},{status:401});
  const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Tên hiển thị không hợp lệ."},{status:400});
  const sql=await db();if(!sql)return NextResponse.json({error:"Database chưa khả dụng."},{status:503});
  await sql.execute({sql:"UPDATE users SET display_name=? WHERE id=?",args:[parsed.data.displayName,user.id]});
  return NextResponse.json({updated:true,displayName:parsed.data.displayName});
}
