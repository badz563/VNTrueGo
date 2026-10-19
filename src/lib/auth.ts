import "server-only";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { db } from "./db";

const scrypt = promisify(scryptCallback);
const sessionCookie = "truego_session";
const sessionSeconds = 7 * 24 * 60 * 60;
export type AuthUser = { id: string; email: string; displayName: string; role: "traveler" | "partner_manager" | "partner_staff" | "admin" };

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, saved: string) {
  const [algorithm, salt, hash] = saved.split(":");
  if (algorithm !== "scrypt" || !/^[a-f0-9]{32}$/.test(salt || "") || !/^[a-f0-9]{128}$/.test(hash || "")) return false;
  const derived = await scrypt(password, Buffer.from(salt, "hex"), 64) as Buffer;
  return timingSafeEqual(derived, Buffer.from(hash, "hex"));
}

export function hashToken(token: string) { return createHash("sha256").update(token).digest("hex"); }

export async function currentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const sql = await db();
  if (!sql) return null;
  const result = await sql.execute({sql:`SELECT u.id,u.email,u.display_name,u.role FROM sessions s
    JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`,args:[hashToken(token),new Date().toISOString()]});
  const row = result.rows[0];
  return row ? {id:String(row.id),email:String(row.email),displayName:String(row.display_name),role:row.role as AuthUser["role"]} : null;
}

export async function startSession(userId: string) {
  const sql = await db();
  if (!sql) throw new Error("Database lưu trữ chưa được cấu hình.");
  const token = randomBytes(32).toString("hex");
  const now = new Date();
  const expires = new Date(now.getTime() + sessionSeconds * 1000);
  await sql.execute({sql:"DELETE FROM sessions WHERE user_id=? AND expires_at<?",args:[userId,now.toISOString()]});
  await sql.execute({sql:"INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)",args:[hashToken(token),userId,expires.toISOString(),now.toISOString()]});
  (await cookies()).set(sessionCookie,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:sessionSeconds});
}

export async function endSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie)?.value;
  if (token) {
    const sql = await db();
    if (sql) await sql.execute({sql:"DELETE FROM sessions WHERE token_hash=?",args:[hashToken(token)]});
  }
  cookieStore.delete(sessionCookie);
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const source=new URL(origin);
    const host=request.headers.get("host")||new URL(request.url).host;
    return source.host===host&&(process.env.NODE_ENV!=="production"||source.protocol==="https:");
  } catch { return false; }
}
