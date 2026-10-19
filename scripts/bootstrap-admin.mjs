import { createClient } from "@libsql/client";
import { randomBytes, randomUUID, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import path from "node:path";

const remote=process.argv.includes("--remote");
const email=process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password=process.env.ADMIN_PASSWORD;
if(!email||!password||password.length<16)throw new Error("Cần ADMIN_EMAIL và ADMIN_PASSWORD tối thiểu 16 ký tự trong biến môi trường.");
if(remote&&(!process.env.TURSO_DATABASE_URL||!process.env.TURSO_AUTH_TOKEN))throw new Error("Cần TURSO_DATABASE_URL và TURSO_AUTH_TOKEN.");
const file=process.env.DATABASE_PATH||path.join(process.cwd(),"data","truego.sqlite");
const client=createClient(remote?{url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN}:{url:`file:${file.replaceAll("\\","/")}`});
try{
  const existing=await client.execute({sql:"SELECT id FROM users WHERE email=?",args:[email]});
  if(existing.rows.length)throw new Error("Email đã tồn tại. Script không thay đổi tài khoản hiện có.");
  const salt=randomBytes(16),hash=await promisify(scryptCallback)(password,salt,64);
  await client.execute({sql:"INSERT INTO users(id,email,password_hash,display_name,role,created_at) VALUES(?,?,?,?,?,?)",args:[randomUUID(),email,`scrypt:${salt.toString("hex")}:${hash.toString("hex")}`,"VNTrueGo Admin","admin",new Date().toISOString()]});
  console.log(`Đã tạo tài khoản admin ${email}. Không in mật khẩu.`);
}finally{client.close();}
