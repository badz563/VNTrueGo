import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("destinationId");
  if (!id) return NextResponse.json({ history: [] });
  const history = db().prepare("SELECT * FROM destination_status_history WHERE destination_id=? ORDER BY id DESC LIMIT 30").all(id);
  return NextResponse.json({ history }, { headers: { "Cache-Control": "no-store" } });
}
