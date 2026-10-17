import { NextResponse } from "next/server";
import { destinationHistory } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("destinationId");
  if (!id) return NextResponse.json({ history: [] });
  const history = await destinationHistory(id);
  return NextResponse.json({ history }, { headers: { "Cache-Control": "no-store" } });
}
