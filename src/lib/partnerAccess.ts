import "server-only";
import type { Client } from "@libsql/client";
import type { AuthUser } from "./auth";
export async function canManageDestination(sql:Client,user:AuthUser,destinationId:string,managerOnly=false){
  if(user.role==="admin")return true;
  const member=await sql.execute({sql:"SELECT role FROM partner_members WHERE user_id=? AND destination_id=?",args:[user.id,destinationId]});
  return member.rows.length>0&&(!managerOnly||member.rows[0].role==="partner_manager");
}
