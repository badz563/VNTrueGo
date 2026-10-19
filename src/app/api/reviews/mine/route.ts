import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
export const runtime="nodejs";
export async function GET(){
  const user=await currentUser();if(!user)return NextResponse.json({error:"Vui lòng đăng nhập."},{status:401});
  const sql=await db();if(!sql)return NextResponse.json({reviews:[]});
  const result=await sql.execute({sql:`SELECT r.id,r.destination_id AS destinationId,r.body,r.created_at AS createdAt,
    d.rating_tenths AS ratingTenths,d.status,d.experienced_on AS experiencedOn,p.name AS destinationName
    FROM reviews r JOIN review_details d ON d.review_id=r.id JOIN destinations p ON p.id=r.destination_id
    WHERE d.user_id=? ORDER BY r.id DESC`,args:[user.id]});
  return NextResponse.json({reviews:result.rows},{headers:{"Cache-Control":"no-store"}});
}
