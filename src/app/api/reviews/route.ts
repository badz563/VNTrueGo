import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, sameOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
import { sealEvidence } from "@/lib/evidence";
import { ratingSchema, ratingToTenths } from "@/lib/rating";
import { rateLimit } from "@/lib/rateLimit";
export const runtime="nodejs";
const schema=z.object({destinationId:z.string().min(1),rating:ratingSchema,body:z.string().trim().min(20).max(1500),experiencedOn:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),evidenceKind:z.enum(["booking","receipt","checkin"]),evidence:z.string().trim().min(8).max(500)});
export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:"Nguồn yêu cầu không hợp lệ."},{status:403});
  const limited=rateLimit(request,"reviews",20);if(limited)return limited;
  const user=await currentUser();if(!user)return NextResponse.json({error:"Vui lòng đăng nhập."},{status:401});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Thông tin đánh giá không hợp lệ."},{status:400});
  const input=parsed.data;
  if(new Date(input.experiencedOn+"T00:00:00Z").getTime()>Date.now()||!Number.isFinite(new Date(input.experiencedOn).getTime()))return NextResponse.json({error:"Ngày trải nghiệm không hợp lệ."},{status:400});
  const sql=await db();if(!sql)return NextResponse.json({error:"Đánh giá cần database lưu trữ."},{status:503});
  const found=await sql.execute({sql:"SELECT id FROM destinations WHERE id=?",args:[input.destinationId]});
  if(!found.rows.length)return NextResponse.json({error:"Địa điểm không tồn tại."},{status:404});
  let sealed;try{sealed=sealEvidence(input.evidence);}catch{return NextResponse.json({error:"Chưa cấu hình lưu bằng chứng riêng tư."},{status:503});}
  const existing=await sql.execute({sql:"SELECT review_id FROM review_claims WHERE user_id=? AND destination_id=?",args:[user.id,input.destinationId]});
  if(existing.rows.length)return NextResponse.json({error:"Bạn đã có một đánh giá tại địa điểm này; hãy sửa đánh giá hiện có."},{status:409});
  const transaction=await sql.transaction("write");
  try{
    const now=new Date().toISOString();
    const inserted=await transaction.execute({sql:"INSERT INTO reviews(destination_id,author,body,verification,created_at) VALUES(?,?,?,?,?)",args:[input.destinationId,user.displayName,input.body,"pending",now]});
    const id=Number(inserted.lastInsertRowid);
    await transaction.execute({sql:"INSERT INTO review_claims(user_id,destination_id,review_id) VALUES(?,?,?)",args:[user.id,input.destinationId,id]});
    await transaction.execute({sql:`INSERT INTO review_details(review_id,user_id,rating_tenths,experienced_on,evidence_kind,evidence_ciphertext,evidence_hash,status,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?)`,args:[id,user.id,ratingToTenths(input.rating),input.experiencedOn,input.evidenceKind,sealed.ciphertext,sealed.hash,"pending",now]});
    await transaction.commit();return NextResponse.json({id,status:"pending"},{status:201});
  }catch{if(!transaction.closed)await transaction.rollback();return NextResponse.json({error:"Bằng chứng đã được sử dụng hoặc chưa thể lưu đánh giá."},{status:409});}
}
