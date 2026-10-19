import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, sameOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageDestination } from "@/lib/partnerAccess";
export const runtime="nodejs";
const base={destinationId:z.string().min(1),title:z.string().trim().min(3).max(120)};
const schema=z.discriminatedUnion("type",[
  z.object({...base,type:z.literal("event"),description:z.string().trim().min(10).max(1000),startsAt:z.string().datetime(),endsAt:z.string().datetime(),ticketPrice:z.number().int().min(0).max(50_000_000).nullable()}),
  z.object({...base,type:z.literal("offer"),terms:z.string().trim().min(10).max(1000),startsAt:z.string().datetime(),endsAt:z.string().datetime(),promoCode:z.string().trim().max(50).nullable(),bookingUrl:z.string().url().refine(v=>new URL(v).protocol==="https:").nullable()}),
  z.object({...base,type:z.literal("season"),body:z.string().trim().min(10).max(1000),source:z.string().trim().min(3).max(120)})
]);
export async function GET(request:Request){
  const user=await currentUser();if(!user)return NextResponse.json({error:"Vui lòng đăng nhập."},{status:401});
  const destinationId=new URL(request.url).searchParams.get("destinationId");if(!destinationId)return NextResponse.json({error:"Thiếu địa điểm."},{status:400});
  const sql=await db();if(!sql)return NextResponse.json({error:"Database chưa khả dụng."},{status:503});
  if(!await canManageDestination(sql,user,destinationId))return NextResponse.json({error:"Không có quyền."},{status:403});
  const [events,offers,seasons]=await Promise.all([
    sql.execute({sql:"SELECT id,title,starts_at AS startsAt,ends_at AS endsAt,status FROM events WHERE destination_id=? ORDER BY starts_at DESC LIMIT 50",args:[destinationId]}),
    sql.execute({sql:"SELECT id,title,starts_at AS startsAt,ends_at AS endsAt,status FROM offers WHERE destination_id=? ORDER BY starts_at DESC LIMIT 50",args:[destinationId]}),
    sql.execute({sql:"SELECT id,title,updated_at AS updatedAt FROM seasonal_information WHERE destination_id=? ORDER BY updated_at DESC LIMIT 50",args:[destinationId]})
  ]);
  return NextResponse.json({events:events.rows,offers:offers.rows,seasons:seasons.rows},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:"Nguồn yêu cầu không hợp lệ."},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Vui lòng đăng nhập."},{status:401});
  const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Nội dung không hợp lệ."},{status:400});
  const input=parsed.data,sql=await db();if(!sql)return NextResponse.json({error:"Database chưa khả dụng."},{status:503});
  if(!await canManageDestination(sql,user,input.destinationId,input.type!=="event"))return NextResponse.json({error:"Không có quyền."},{status:403});
  if(input.type!=="season"&&new Date(input.endsAt)<=new Date(input.startsAt))return NextResponse.json({error:"Ngày kết thúc phải sau ngày bắt đầu."},{status:400});
  const id=randomUUID(),now=new Date().toISOString();
  if(input.type==="event")await sql.execute({sql:"INSERT INTO events(id,destination_id,title,description,starts_at,ends_at,ticket_price,status,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",args:[id,input.destinationId,input.title,input.description,input.startsAt,input.endsAt,input.ticketPrice,"active",user.id,now]});
  if(input.type==="offer")await sql.execute({sql:"INSERT INTO offers(id,destination_id,title,terms,starts_at,ends_at,promo_code,booking_url,status,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",args:[id,input.destinationId,input.title,input.terms,input.startsAt,input.endsAt,input.promoCode,input.bookingUrl,"active",user.id,now]});
  if(input.type==="season")await sql.execute({sql:"INSERT INTO seasonal_information(id,destination_id,title,body,source,updated_by,updated_at) VALUES(?,?,?,?,?,?,?)",args:[id,input.destinationId,input.title,input.body,input.source,user.id,now]});
  await sql.execute({sql:"INSERT INTO audit_logs(actor_id,action,target_type,target_id,after_json,created_at) VALUES(?,?,?,?,?,?)",args:[user.id,"content_create",input.type,id,JSON.stringify(input),now]});
  return NextResponse.json({id,type:input.type},{status:201});
}
