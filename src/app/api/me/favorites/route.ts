import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
export const runtime="nodejs";
export async function GET(){const user=await currentUser();if(!user)return NextResponse.json({error:"Vui lòng đăng nhập."},{status:401});const sql=await db();if(!sql)return NextResponse.json({error:"Database chưa khả dụng."},{status:503});const found=await sql.execute({sql:"SELECT destination_id AS destinationId FROM favorite_destinations WHERE user_id=? ORDER BY created_at DESC",args:[user.id]});return NextResponse.json({favorites:found.rows.map(row=>row.destinationId)},{headers:{"Cache-Control":"no-store"}});}
