import { NextResponse } from "next/server";
import { currentUser, sameOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseTrip } from "@/lib/storage";
export const runtime="nodejs";
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!sameOrigin(request))return NextResponse.json({error:"Nguồn yêu cầu không hợp lệ."},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Vui lòng đăng nhập."},{status:401});
  const id=(await params).id,raw=await request.text();if(raw.length>200_000)return NextResponse.json({error:"Lịch trình quá lớn."},{status:413});
  let value:unknown;try{value=JSON.parse(raw);}catch{return NextResponse.json({error:"JSON không hợp lệ."},{status:400});}
  const trip=parseTrip(value);if(!trip||trip.id!==id||trip.title.length>120)return NextResponse.json({error:"Lịch trình không hợp lệ."},{status:400});
  const sql=await db();if(!sql)return NextResponse.json({error:"Database chưa khả dụng."},{status:503});
  await sql.execute({sql:"INSERT INTO saved_itineraries(user_id,id,title,trip_json,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,id) DO UPDATE SET title=excluded.title,trip_json=excluded.trip_json,updated_at=excluded.updated_at",args:[user.id,id,trip.title,JSON.stringify(trip),new Date().toISOString()]});
  return NextResponse.json({saved:true,id});
}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!sameOrigin(request))return NextResponse.json({error:"Nguồn yêu cầu không hợp lệ."},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Vui lòng đăng nhập."},{status:401});
  const sql=await db();if(!sql)return NextResponse.json({error:"Database chưa khả dụng."},{status:503});
  await sql.execute({sql:"DELETE FROM saved_itineraries WHERE user_id=? AND id=?",args:[user.id,(await params).id]});
  return NextResponse.json({deleted:true});
}
