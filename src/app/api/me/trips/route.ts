import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
export const runtime="nodejs";
export async function GET(){const user=await currentUser();if(!user)return NextResponse.json({error:"Vui lòng đăng nhập."},{status:401});const sql=await db();if(!sql)return NextResponse.json({error:"Database chưa khả dụng."},{status:503});const found=await sql.execute({sql:"SELECT id,title,trip_json AS tripJson,updated_at AS updatedAt FROM saved_itineraries WHERE user_id=? ORDER BY updated_at DESC LIMIT 100",args:[user.id]});return NextResponse.json({trips:found.rows.map(row=>({id:row.id,title:row.title,trip:JSON.parse(String(row.tripJson)),updatedAt:row.updatedAt}))},{headers:{"Cache-Control":"no-store"}});}
