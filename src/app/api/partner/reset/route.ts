import { NextResponse } from "next/server";
import { demoWritesAllowed, resetDemo } from "@/lib/db";
export const runtime = "nodejs";
export function POST() {
  if (!demoWritesAllowed()) return NextResponse.json({ error: "Demo writes disabled in production." }, { status: 403 });
  resetDemo();
  return NextResponse.json({ reset: true });
}
