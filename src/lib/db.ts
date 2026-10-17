import "server-only";
import { createClient, type Client, type InStatement } from "@libsql/client";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import seedRows from "../../data/seed.json";
import type { Crowd, Destination, Status } from "./types";

type Row = Record<string, unknown>;
const root = process.cwd();
let connection: Promise<Client> | null = null;

export function databaseMode(): "local" | "remote" | "seed" {
  if (Boolean(process.env.TURSO_DATABASE_URL) !== Boolean(process.env.TURSO_AUTH_TOKEN)) {
    throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be configured together.");
  }
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) return "remote";
  return process.env.NODE_ENV === "development" && !process.env.VERCEL ? "local" : "seed";
}

function seedStatements(): InStatement[] {
  const now = new Date().toISOString();
  const statements: InStatement[] = seedRows.map(row => ({
    sql: `INSERT INTO destinations
      (id,slug,name,name_en,category,description,description_en,lat,lng,address,image,tags_json,duration,price,opening_json,closed_days_json,status,status_rev,status_updated_at,status_source,crowd,crowd_updated_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [row.id, row.slug, row.name, row.nameEn, row.category,
      `Điểm tham quan tại ${row.address}. Nội dung giới thiệu và thông tin vận hành trong bản demo chỉ để lập kế hoạch tham khảo.`,
      `An attraction in ${row.address}. Descriptions and operating details in this demo are illustrative only.`,
      row.lat, row.lng, row.address, row.image, JSON.stringify(row.tags), row.duration, row.price,
      JSON.stringify({ open: "08:00", close: "17:00" }), JSON.stringify([]),
      "unknown", 1, null, "demo", "unknown", null, now]
  }));
  statements.push({ sql: "INSERT OR IGNORE INTO partner_organizations (id,name) VALUES (?,?)", args: ["demo", "TrueGo Demo Partner"] });
  return statements;
}

async function connect(): Promise<Client> {
  if (databaseMode() === "remote") {
    // Remote schema and seed are provisioned explicitly; requests never migrate production data.
    return createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! });
  }
  const file = process.env.DATABASE_PATH || path.join(root, "data", "truego.sqlite");
  mkdirSync(path.dirname(file), { recursive: true });
  const client = createClient({ url: `file:${file.replaceAll("\\", "/")}` });
  await client.execute("PRAGMA foreign_keys = ON");
  await client.executeMultiple(readFileSync(path.join(root, "migrations", "001_init.sql"), "utf8"));
  const count = await client.execute("SELECT COUNT(*) AS n FROM destinations");
  if (Number(count.rows[0].n) === 0) await client.batch(seedStatements(), "write");
  return client;
}

export async function db(): Promise<Client | null> {
  if (databaseMode() === "seed") return null;
  if (!connection) connection = connect().catch(error => { connection = null; throw error; });
  return connection;
}

function seedDestination(row: (typeof seedRows)[number]): Destination {
  return {
    id: row.id, slug: row.slug, name: row.name, nameEn: row.nameEn,
    category: row.category,
    description: `Điểm tham quan tại ${row.address}. Nội dung giới thiệu và thông tin vận hành trong bản demo chỉ để lập kế hoạch tham khảo.`,
    descriptionEn: `An attraction in ${row.address}. Descriptions and operating details in this demo are illustrative only.`,
    lat: row.lat, lng: row.lng, address: row.address, image: row.image,
    tags: row.tags, duration: row.duration, price: row.price,
    opening: { open: "08:00", close: "17:00" }, closedDays: [],
    status: "unknown", statusRev: 1, statusUpdatedAt: null, statusSource: "demo",
    crowd: "unknown", crowdUpdatedAt: null, updatedAt: "2026-10-17"
  };
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

export async function allDestinations(): Promise<Destination[]> {
  const client = await db();
  if (!client) return seedRows.map(seedDestination);
  const result = await client.execute("SELECT * FROM destinations ORDER BY id");
  return result.rows.map(row => mapDestination(row as Row));
}

export async function destinationBySlug(slug: string): Promise<Destination | null> {
  const client = await db();
  if (!client) {
    const row = seedRows.find(item => item.slug === slug);
    return row ? { ...seedDestination(row), announcements: [], reviews: [] } : null;
  }
  const result = await client.execute({ sql: "SELECT * FROM destinations WHERE slug = ?", args: [slug] });
  const row = result.rows[0];
  if (!row) return null;
  const destination = mapDestination(row as Row);
  const [announcements, reviews] = await Promise.all([
    client.execute({ sql: "SELECT id,message,created_at AS createdAt,source FROM destination_announcements WHERE destination_id = ? ORDER BY id DESC LIMIT 10", args: [destination.id] }),
    client.execute({ sql: "SELECT id,author,body,verification FROM reviews WHERE destination_id = ? ORDER BY id DESC LIMIT 10", args: [destination.id] })
  ]);
  destination.announcements = announcements.rows as unknown as Destination["announcements"];
  destination.reviews = reviews.rows as unknown as Destination["reviews"];
  return destination;
}

export async function destinationHistory(id: string) {
  const client = await db();
  if (!client) return [];
  const result = await client.execute({ sql: "SELECT * FROM destination_status_history WHERE destination_id=? ORDER BY id DESC LIMIT 30", args: [id] });
  return result.rows;
}

export async function resetDemo() {
  if (!demoWritesAllowed()) throw new Error("Demo reset is disabled outside local development.");
  const client = await db();
  if (!client) throw new Error("Local database unavailable.");
  const deletes = ["destination_status_history", "destination_announcements", "crowd_forecasts", "feedback", "reviews", "destinations"]
    .map(table => `DELETE FROM ${table}`);
  await client.batch([...deletes, ...seedStatements()], "write");
}

export function demoWritesAllowed() {
  return process.env.NODE_ENV === "development" && !process.env.VERCEL && databaseMode() === "local";
}
