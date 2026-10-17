import { NextResponse } from "next/server";
import { destinationBySlug } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await destinationBySlug(slug);
  if (!destination) return NextResponse.json({ error: "Không tìm thấy địa điểm." }, { status: 404 });
  return NextResponse.json({ destination, mode: "demo" }, { headers: { "Cache-Control": "no-store" } });
}
