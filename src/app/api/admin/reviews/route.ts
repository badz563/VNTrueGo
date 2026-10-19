import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { openEvidence } from "@/lib/evidence";
export const runtime="nodejs";
export async function GET(){
  const user=await currentUser();if(user?.role!=="admin")return NextResponse.json({error:"Không có quyền."},{status:403});
  const sql=await db();if(!sql)return NextResponse.json({error:"Database chưa khả dụng."},{status:503});
  const found=await sql.execute(`SELECT r.id,r.body,r.created_at AS createdAt,p.name AS destinationName,
    u.email AS userEmail,d.rating_tenths AS ratingTenths,d.experienced_on AS experiencedOn,
    d.evidence_kind AS evidenceKind,d.evidence_ciphertext AS evidenceCiphertext,d.status
    FROM reviews r JOIN review_details d ON d.review_id=r.id JOIN users u ON u.id=d.user_id
    JOIN destinations p ON p.id=r.destination_id WHERE d.status='pending' ORDER BY r.id LIMIT 100`);
  let reviews;
  try{reviews=found.rows.map(row=>({id:row.id,body:row.body,createdAt:row.createdAt,destinationName:row.destinationName,userEmail:row.userEmail,ratingTenths:row.ratingTenths,experiencedOn:row.experiencedOn,evidenceKind:row.evidenceKind,status:row.status,evidence:openEvidence(String(row.evidenceCiphertext))}));}
  catch{return NextResponse.json({error:"Không thể giải mã bằng chứng. Kiểm tra khóa mã hóa."},{status:503});}
  return NextResponse.json({reviews},{headers:{"Cache-Control":"no-store"}});
}
