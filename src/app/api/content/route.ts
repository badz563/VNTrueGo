import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export const runtime="nodejs";
export async function GET(){
  const sql=await db();if(!sql)return NextResponse.json({events:[],offers:[]});
  const now=new Date().toISOString();
  const [events,offers]=await Promise.all([
    sql.execute({sql:`SELECT e.id,e.title,e.starts_at AS startsAt,d.name AS destinationName,d.slug
      FROM events e JOIN destinations d ON d.id=e.destination_id
      WHERE e.status='active' AND e.ends_at>=? ORDER BY e.starts_at LIMIT 6`,args:[now]}),
    sql.execute({sql:`SELECT o.id,o.title,o.ends_at AS endsAt,d.name AS destinationName,d.slug
      FROM offers o JOIN destinations d ON d.id=o.destination_id
      WHERE o.status='active' AND o.starts_at<=? AND o.ends_at>=? ORDER BY o.ends_at LIMIT 6`,args:[now,now]})
  ]);
  return NextResponse.json({events:events.rows,offers:offers.rows},{headers:{"Cache-Control":"no-store"}});
}
