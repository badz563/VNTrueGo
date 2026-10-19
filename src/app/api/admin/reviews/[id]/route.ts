import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, sameOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
export const runtime="nodejs";
const schema=z.object({decision:z.enum(["approved","rejected"]),note:z.string().trim().max(500).default("")});
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!sameOrigin(request))return NextResponse.json({error:"Nguồn yêu cầu không hợp lệ."},{status:403});
  const user=await currentUser();if(user?.role!=="admin")return NextResponse.json({error:"Không có quyền."},{status:403});
  const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Quyết định không hợp lệ."},{status:400});
  const id=Number((await params).id);if(!Number.isSafeInteger(id)||id<1)return NextResponse.json({error:"ID không hợp lệ."},{status:400});
  const sql=await db();if(!sql)return NextResponse.json({error:"Database chưa khả dụng."},{status:503});
  const transaction=await sql.transaction("write");
  try{
    const found=await transaction.execute({sql:"SELECT status FROM review_details WHERE review_id=?",args:[id]});
    if(!found.rows.length){await transaction.rollback();return NextResponse.json({error:"Không tìm thấy đánh giá."},{status:404});}
    if(found.rows[0].status!=="pending"){await transaction.rollback();return NextResponse.json({error:"Đánh giá này đã được xử lý."},{status:409});}
    const now=new Date().toISOString();
    await transaction.execute({sql:"UPDATE review_details SET status=?,decided_by=?,decided_at=?,decision_note=?,updated_at=? WHERE review_id=?",args:[parsed.data.decision,user.id,now,parsed.data.note,now,id]});
    await transaction.execute({sql:"UPDATE reviews SET verification=? WHERE id=?",args:[parsed.data.decision,id]});
    if(parsed.data.decision==="rejected")await transaction.execute({sql:"DELETE FROM review_claims WHERE review_id=?",args:[id]});
    await transaction.execute({sql:"INSERT INTO audit_logs(actor_id,action,target_type,target_id,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?)",args:[user.id,"review_moderation","review",String(id),JSON.stringify({status:"pending"}),JSON.stringify({status:parsed.data.decision,note:parsed.data.note}),now]});
    await transaction.commit();return NextResponse.json({id,status:parsed.data.decision});
  }catch(error){if(!transaction.closed)await transaction.rollback();throw error;}
}
