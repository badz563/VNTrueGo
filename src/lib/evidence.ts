import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

function key(){
  const fromEnv=process.env.EVIDENCE_ENCRYPTION_KEY;
  if(fromEnv){if(!/^[a-f0-9]{64}$/i.test(fromEnv))throw new Error("EVIDENCE_ENCRYPTION_KEY phải gồm 64 ký tự hex.");return Buffer.from(fromEnv,"hex");}
  if(process.env.NODE_ENV!=="development"||process.env.VERCEL)throw new Error("Chưa cấu hình EVIDENCE_ENCRYPTION_KEY.");
  const file=path.join(process.cwd(),"data","evidence.key");
  mkdirSync(path.dirname(file),{recursive:true});
  if(!existsSync(file)){try{writeFileSync(file,randomBytes(32).toString("hex"),{flag:"wx"});}catch{/* Another development process created it. */}}
  return Buffer.from(readFileSync(file,"utf8").trim(),"hex");
}
export function sealEvidence(value:string){
  const secret=key(),iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",secret,iv);
  const encrypted=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);
  return {ciphertext:Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString("base64"),hash:createHmac("sha256",secret).update(value.trim().toLowerCase()).digest("hex")};
}
export function openEvidence(ciphertext:string){
  const payload=Buffer.from(ciphertext,"base64"),secret=key();
  const decipher=createDecipheriv("aes-256-gcm",secret,payload.subarray(0,12));
  decipher.setAuthTag(payload.subarray(12,28));
  return Buffer.concat([decipher.update(payload.subarray(28)),decipher.final()]).toString("utf8");
}
