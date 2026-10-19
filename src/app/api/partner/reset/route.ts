import { NextResponse } from "next/server";
import { demoWritesAllowed, resetDemo } from "@/lib/db";
import { sameOrigin } from "@/lib/auth";
export const runtime = "nodejs";
export async function POST(request:Request) {
  if (!demoWritesAllowed()) return NextResponse.json({ error: "Demo writes disabled in production." }, { status: 403 });
  if(!sameOrigin(request))return NextResponse.json({error:"Nguồn yêu cầu không hợp lệ."},{status:403});
  await resetDemo();
  return NextResponse.json({ reset: true });
}
