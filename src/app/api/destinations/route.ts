import { NextResponse } from "next/server";
import { allDestinations, databaseMode } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ destinations: await allDestinations(), checkedAt: new Date().toISOString(), mode: "demo", dataSource: databaseMode() },
    { headers: { "Cache-Control": "no-store, max-age=0" } });
}
