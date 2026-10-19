import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import PartnerClient from "@/components/PartnerClient";
export const dynamic="force-dynamic";
export const metadata={title:"Cổng đối tác"};
export default async function Page(){
  const user=await currentUser();
  if(!user||!["admin","partner_manager","partner_staff"].includes(user.role))redirect("/account");
  const sql=await db();
  if(!sql)return <div className="container partner-page"><h1>Cần kết nối database</h1></div>;
  const memberships=user.role==="admin"?null:await sql.execute({sql:"SELECT destination_id FROM partner_members WHERE user_id=?",args:[user.id]});
  const allowedIds=memberships?.rows.map(row=>String(row.destination_id))||null;
  return <PartnerClient writable allowedIds={allowedIds} live/>;
}
