import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import path from "node:path";

const remote=process.argv.includes("--remote");
if(remote&&(!process.env.TURSO_DATABASE_URL||!process.env.TURSO_AUTH_TOKEN))throw new Error("Cần TURSO_DATABASE_URL và TURSO_AUTH_TOKEN.");
const file=process.env.DATABASE_PATH||path.join(process.cwd(),"data","truego.sqlite");
const client=createClient(remote?{url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN}:{url:`file:${file.replaceAll("\\","/")}`});
try{
  const found=await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='destinations'");
  if(!found.rows.length)throw new Error("Database chưa có schema 001. Khởi tạo database mới bằng db:seed hoặc db:setup:remote trước.");
  for(const name of ["002_accounts_reviews.sql","003_partner_content.sql","004_saved_data.sql","005_review_claims.sql","006_demo_purchases.sql"]){
    const source=readFileSync(path.join(process.cwd(),"migrations",name),"utf8");
    if(remote)await client.batch(source.split(";").map(sql=>sql.trim()).filter(Boolean),"write");
    else await client.executeMultiple(source);
  }
  console.log(`Đã áp dụng migrations 002–006 trên ${remote?"remote":"local"}; không xóa hoặc ghi đè dữ liệu.`);
}finally{client.close();}
