import { NextResponse } from "next/server";
import { z } from "zod";
import { allDestinations } from "@/lib/db";
import { makeTrip, tripCost } from "@/lib/planner";
export const runtime = "nodejs";
const schema = z.object({
  region: z.string().min(2).max(80), startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), people: z.number().int().min(1).max(20),
  budget: z.number().int().min(0).max(50_000_000), transport: z.enum(["walk","bike","car"]),
  interests: z.array(z.string().max(40)).max(10), pace: z.enum(["relaxed","balanced","full"]),
  notes: z.string().max(1000), avoid: z.string().max(300)
});
async function addAiReasons(trip: ReturnType<typeof makeTrip>, names: string[]): Promise<typeof trip | null> {
  const key = process.env.AI_API_KEY;
  if (!key) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(process.env.AI_PROVIDER_URL || "https://api.openai.com/v1/chat/completions", {
      method: "POST", signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-4o-mini", temperature: 0.2,
        messages: [
          { role: "system", content: "Write one concise Vietnamese reason for each selected attraction. Return ONLY a JSON array of strings, same order. Use only the names and preferences supplied. Do not invent opening hours, prices, status, distances or facts." },
          { role: "user", content: JSON.stringify({ preferences: trip.input, names }) }
        ]
      })
    });
    if (!response.ok) return null;
    const json = await response.json();
    const raw = json?.choices?.[0]?.message?.content;
    if (typeof raw !== "string") return null;
    const reasons: unknown = JSON.parse(raw.replace(/^\x60\x60\x60json\s*|\x60\x60\x60$/g, ""));
    if (!Array.isArray(reasons) || reasons.length !== names.length || !reasons.every(x => typeof x === "string" && x.length <= 180)) return null;
    let index = 0;
    return { ...trip, mode: "ai", days: trip.days.map(day => ({
      ...day, activities: day.activities.map(activity => ({ ...activity, reason: reasons[index++] as string }))
    })) };
  } catch { return null; } finally { clearTimeout(timeout); }
}
export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Vui lòng kiểm tra thông tin lịch trình.", issues: parsed.error.flatten() }, { status: 400 });
    if (!/hà nội|ha noi|hanoi/i.test(parsed.data.region)) return NextResponse.json({ error: "Bản demo hiện hỗ trợ khu vực Hà Nội." }, { status: 400 });
    const destinations = allDestinations();
    let trip = makeTrip(parsed.data, destinations);
    if (!trip.days.some(day => day.activities.length)) return NextResponse.json({ error: "Không tìm được địa điểm phù hợp với bộ lọc, giờ và ngân sách đã chọn." }, { status: 422 });
    const names = trip.days.flatMap(day => day.activities.map(a => destinations.find(d => d.id === a.destinationId)?.name || ""));
    trip = await addAiReasons(trip, names) || trip;
    return NextResponse.json({ trip, totalCost: tripCost(trip), mode: trip.mode });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không tạo được lịch trình." }, { status: 400 });
  }
}
