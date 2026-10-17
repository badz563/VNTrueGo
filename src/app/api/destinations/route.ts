import { NextResponse } from "next/server";
import { allDestinations } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json({ destinations: allDestinations(), checkedAt: new Date().toISOString(), mode: "demo" },
    { headers: { "Cache-Control": "no-store, max-age=0" } });
}
