import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, sameOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratingSchema, ratingToTenths } from "@/lib/rating";
export const runtime="nodejs";
const schema=z.object({rating:ratingSchema,body:z.string().trim().min(20).max(1500)});
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!sameOrigin(request))return NextResponse.json({error:"Nguồn yêu cầu không hợp lệ."},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Vui lòng đăng nhập."},{status:401});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Nội dung hoặc điểm đánh giá không hợp lệ."},{status:400});
  const id=Number((await params).id);if(!Number.isSafeInteger(id)||id<1)return NextResponse.json({error:"ID không hợp lệ."},{status:400});
  const sql=await db();if(!sql)return NextResponse.json({error:"Database chưa khả dụng."},{status:503});
  const found=await sql.execute({sql:"SELECT status FROM review_details WHERE review_id=? AND user_id=?",args:[id,user.id]});
  if(!found.rows.length)return NextResponse.json({error:"Không tìm thấy đánh giá."},{status:404});
  if(found.rows[0].status==="rejected")return NextResponse.json({error:"Đánh giá đã bị từ chối; hãy gửi đánh giá mới với bằng chứng khác."},{status:409});
  const now=new Date().toISOString();
  await sql.batch([
    {sql:"UPDATE reviews SET body=?,verification='pending' WHERE id=?",args:[parsed.data.body,id]},
    {sql:"UPDATE review_details SET rating_tenths=?,status='pending',decided_by=NULL,decided_at=NULL,decision_note=NULL,updated_at=? WHERE review_id=?",args:[ratingToTenths(parsed.data.rating),now,id]},
    {sql:"INSERT INTO audit_logs(actor_id,action,target_type,target_id,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?)",args:[user.id,"review_edit","review",String(id),JSON.stringify({status:found.rows[0].status}),JSON.stringify({status:"pending",rating:parsed.data.rating}),now]}
  ],"write");
  return NextResponse.json({id,status:"pending"});
}
