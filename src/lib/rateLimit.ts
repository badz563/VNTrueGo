import "server-only";
import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(request: Request, action: string, maximum: number, windowMs = 15 * 60_000) {
  const now = Date.now();
  const visitor = request.headers.get("cf-connecting-ip") || "unknown";
  const key = `${action}:${visitor}`;
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  bucket.count++;
  buckets.set(key, bucket);
  if (buckets.size > 5000) {
    for (const [name, item] of buckets) if (item.resetAt <= now) buckets.delete(name);
    while (buckets.size > 5000) buckets.delete(buckets.keys().next().value!);
  }
  if (bucket.count <= maximum) return null;
  return NextResponse.json({ error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." }, {
    status: 429,
    headers: { "Retry-After": String(Math.ceil((bucket.resetAt - now) / 1000)) }
  });
}
