import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Crowd, Destination, Status } from "./types";

type Row = Record<string, unknown>;
let connection: DatabaseSync | null = null;
const root = process.cwd();

export function db(): DatabaseSync {
  if (connection) return connection;
  const dataDir = path.join(root, "data");
  mkdirSync(dataDir, { recursive: true });
  const file = process.env.DATABASE_PATH || path.join(dataDir, "truego.sqlite");
  const sql = new DatabaseSync(file);
  sql.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  sql.exec(readFileSync(path.join(root, "migrations", "001_init.sql"), "utf8"));
  const count = (sql.prepare("SELECT COUNT(*) AS n FROM destinations").get() as { n: number }).n;
  if (!count) seed(sql);
  connection = sql;
  return sql;
}

function seed(sql: DatabaseSync) {
  const rows = JSON.parse(readFileSync(path.join(root, "data", "seed.json"), "utf8")) as Array<Record<string, unknown>>;
  const now = new Date().toISOString();
  const insert = sql.prepare(`INSERT INTO destinations
    (id,slug,name,name_en,category,description,description_en,lat,lng,address,image,tags_json,duration,price,opening_json,closed_days_json,status,status_rev,status_updated_at,status_source,crowd,crowd_updated_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  sql.exec("BEGIN");
  try {
    for (const row of rows) {
      insert.run(
        row.id as string, row.slug as string, row.name as string, row.nameEn as string,
        row.category as string,
        `Điểm tham quan tại ${row.address}. Nội dung giới thiệu và thông tin vận hành trong bản demo chỉ để lập kế hoạch tham khảo.`,
        `An attraction in ${row.address}. Descriptions and operating details in this demo are illustrative only.`,
        row.lat as number, row.lng as number, row.address as string, row.image as string,
        JSON.stringify(row.tags), row.duration as number, row.price as number,
        JSON.stringify({ open: "08:00", close: "17:00" }), JSON.stringify([]),
        "unknown", 1, null, "demo", "unknown", null, now
      );
    }
    sql.prepare("INSERT OR IGNORE INTO partner_organizations (id,name) VALUES (?,?)").run("demo","TrueGo Demo Partner");
    sql.exec("COMMIT");
  } catch (error) { sql.exec("ROLLBACK"); throw error; }
}

export function mapDestination(row: Row): Destination {
  return {
    id: String(row.id), slug: String(row.slug), name: String(row.name),
    nameEn: row.name_en ? String(row.name_en) : null,
    category: String(row.category), description: String(row.description),
    descriptionEn: row.description_en ? String(row.description_en) : null,
    lat: Number(row.lat), lng: Number(row.lng), address: String(row.address),
    image: String(row.image), tags: JSON.parse(String(row.tags_json)),
    duration: Number(row.duration), price: Number(row.price),
    opening: JSON.parse(String(row.opening_json)), closedDays: JSON.parse(String(row.closed_days_json)),
    status: row.status as Status, statusRev: Number(row.status_rev),
    statusUpdatedAt: row.status_updated_at ? String(row.status_updated_at) : null,
    statusSource: String(row.status_source), crowd: row.crowd as Crowd,
    crowdUpdatedAt: row.crowd_updated_at ? String(row.crowd_updated_at) : null,
    updatedAt: String(row.updated_at)
  };
}
export function allDestinations(): Destination[] {
  return (db().prepare("SELECT * FROM destinations ORDER BY id").all() as Row[]).map(mapDestination);
}
export function destinationBySlug(slug: string): Destination | null {
  const row = db().prepare("SELECT * FROM destinations WHERE slug = ?").get(slug) as Row | undefined;
  if (!row) return null;
  const destination = mapDestination(row);
  destination.announcements = (db().prepare("SELECT id,message,created_at AS createdAt,source FROM destination_announcements WHERE destination_id = ? ORDER BY id DESC LIMIT 10").all(destination.id) as Destination["announcements"]) || [];
  destination.reviews = (db().prepare("SELECT id,author,body,verification FROM reviews WHERE destination_id = ? ORDER BY id DESC LIMIT 10").all(destination.id) as Destination["reviews"]) || [];
  return destination;
}
export function resetDemo() {
  const sql = db();
  sql.exec("BEGIN");
  try {
    for (const table of ["destination_status_history","destination_announcements","crowd_forecasts","feedback","reviews","destinations"]) sql.exec(`DELETE FROM ${table}`);
    sql.exec("COMMIT");
  } catch (error) { sql.exec("ROLLBACK"); throw error; }
  seed(sql);
}
export function demoWritesAllowed() {
  return process.env.NODE_ENV !== "production";
}
