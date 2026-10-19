import "server-only";
import { createClient, type Client, type InStatement } from "@libsql/client";
import { createClient as createWebClient } from "@libsql/client/web";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import seedRows from "../../data/seed.json";
import photoCredits from "../../data/photo-credits.json";
import type { Crowd, Destination, Status } from "./types";

type Row = Record<string, unknown>;
function plainRows<T>(rows:Row[]):T[]{return JSON.parse(JSON.stringify(rows)) as T[];}
const root = process.cwd();
let connection: Promise<Client> | null = null;
type SeedRow = (typeof seedRows)[number];
const seedById = new Map(seedRows.map(row => [row.id, row]));
const photoById = new Map(photoCredits.map(credit => [credit.id, credit]));
const oldDemoImages = new Set(["/images/hero.webp", "/images/temple.webp", "/images/bridge.webp", "/images/museum.webp", "/images/hanoi-food.webp", "/images/hanoi-hotel.webp"]);
function photoCredit(id: string) {
  const credit = photoById.get(id);
  return credit && { creator: credit.creator, license: credit.license, sourceUrl: credit.sourceUrl, licenseUrl: credit.licenseUrl, isActualPlace: credit.photoRole === "actual place" };
}
function seedDetails(row: SeedRow) {
  const extra = row as SeedRow & { description?: string; descriptionEn?: string; sourceUrl?: string };
  return {
    description: extra.description || `Điểm tham quan tại ${row.address}. Nội dung giới thiệu và thông tin vận hành trong bản demo chỉ để lập kế hoạch tham khảo.`,
    descriptionEn: extra.descriptionEn || `An attraction in ${row.address}. Descriptions and operating details in this demo are illustrative only.`,
    sourceUrl: extra.sourceUrl
  };
}

export function databaseMode(): "local" | "remote" | "seed" {
  if (process.env.TRUEGO_LOCAL_DEMO === "1" && !process.env.VERCEL) return "local";
  if (Boolean(process.env.TURSO_DATABASE_URL) !== Boolean(process.env.TURSO_AUTH_TOKEN)) {
    throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be configured together.");
  }
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) return "remote";
  return process.env.NODE_ENV === "development" && !process.env.VERCEL ? "local" : "seed";
}

function seedStatements(): InStatement[] {
  const now = new Date().toISOString();
  const statements: InStatement[] = seedRows.map(row => ({
    sql: `INSERT OR IGNORE INTO destinations
      (id,slug,name,name_en,category,description,description_en,lat,lng,address,image,tags_json,duration,price,opening_json,closed_days_json,status,status_rev,status_updated_at,status_source,crowd,crowd_updated_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [row.id, row.slug, row.name, row.nameEn, row.category,
      seedDetails(row).description, seedDetails(row).descriptionEn,
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
    return createWebClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! });
  }
  const file = process.env.DATABASE_PATH || path.join(root, "data", "truego.sqlite");
  mkdirSync(path.dirname(file), { recursive: true });
  const client = createClient({ url: `file:${file.replaceAll("\\", "/")}` });
  await client.execute("PRAGMA foreign_keys = ON");
  await client.executeMultiple(readFileSync(path.join(root, "migrations", "001_init.sql"), "utf8"));
  await client.executeMultiple(readFileSync(path.join(root, "migrations", "002_accounts_reviews.sql"), "utf8"));
  await client.executeMultiple(readFileSync(path.join(root, "migrations", "003_partner_content.sql"), "utf8"));
  await client.executeMultiple(readFileSync(path.join(root, "migrations", "004_saved_data.sql"), "utf8"));
  await client.executeMultiple(readFileSync(path.join(root, "migrations", "005_review_claims.sql"), "utf8"));
  // Add missing demo places without changing existing destinations or user data.
  await client.batch(seedStatements(), "write");
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
    description: seedDetails(row).description,
    descriptionEn: seedDetails(row).descriptionEn,
    sourceUrl: seedDetails(row).sourceUrl,
    lat: row.lat, lng: row.lng, address: row.address, image: row.image, photoCredit: photoCredit(row.id),
    tags: row.tags, duration: row.duration, price: row.price,
    opening: { open: "08:00", close: "17:00" }, closedDays: [],
    status: "unknown", statusRev: 1, statusUpdatedAt: null, statusSource: "demo",
    crowd: "unknown", crowdUpdatedAt: null, updatedAt: "2026-10-17",ratingCount:0,rating:null
  };
}

export function mapDestination(row: Row): Destination {
  const id = String(row.id);
  const seeded = seedById.get(id);
  const storedImage = String(row.image);
  return {
    id, slug: String(row.slug), name: String(row.name),
    nameEn: row.name_en ? String(row.name_en) : null,
    category: String(row.category), description: String(row.description),
    descriptionEn: row.description_en ? String(row.description_en) : null,
    lat: Number(row.lat), lng: Number(row.lng), address: String(row.address),
    image: seeded && oldDemoImages.has(storedImage) ? seeded.image : storedImage,
    photoCredit: seeded && (oldDemoImages.has(storedImage) || storedImage === seeded.image) ? photoCredit(id) : undefined,
    tags: JSON.parse(String(row.tags_json)),
    duration: Number(row.duration), price: Number(row.price),
    opening: JSON.parse(String(row.opening_json)), closedDays: JSON.parse(String(row.closed_days_json)),
    status: row.status as Status, statusRev: Number(row.status_rev),
    statusUpdatedAt: row.status_updated_at ? String(row.status_updated_at) : null,
    statusSource: String(row.status_source), crowd: row.crowd as Crowd,
    crowdUpdatedAt: row.crowd_updated_at ? String(row.crowd_updated_at) : null,
    updatedAt: String(row.updated_at),
    sourceUrl: seeded ? seedDetails(seeded).sourceUrl : undefined,
    ratingCount: row.rating_count == null ? 0 : Number(row.rating_count),
    rating: row.avg_tenths == null ? null : Number(row.avg_tenths)/10
  };
}

export async function allDestinations(): Promise<Destination[]> {
  const client = await db();
  if (!client) return seedRows.map(seedDestination);
  const result = await client.execute(`SELECT p.*,q.rating_count,q.avg_tenths FROM destinations p LEFT JOIN
    (SELECT r.destination_id,COUNT(*) AS rating_count,AVG(d.rating_tenths) AS avg_tenths
      FROM reviews r JOIN review_details d ON d.review_id=r.id WHERE d.status='approved' GROUP BY r.destination_id) q
    ON q.destination_id=p.id ORDER BY p.id`);
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
  const [announcements, reviews, events, offers, seasons] = await Promise.all([
    client.execute({ sql: "SELECT id,message,created_at AS createdAt,source FROM destination_announcements WHERE destination_id = ? ORDER BY id DESC LIMIT 10", args: [destination.id] }),
    client.execute({ sql: `SELECT r.id,r.author,r.body,r.verification,d.rating_tenths AS ratingTenths
      FROM reviews r JOIN review_details d ON d.review_id=r.id
      WHERE r.destination_id=? AND d.status='approved' ORDER BY r.id DESC LIMIT 10`, args: [destination.id] }),
    client.execute({sql:"SELECT id,title,description,starts_at AS startsAt,ends_at AS endsAt,ticket_price AS ticketPrice FROM events WHERE destination_id=? AND status='active' AND ends_at>=? ORDER BY starts_at LIMIT 10",args:[destination.id,new Date().toISOString()]}),
    client.execute({sql:"SELECT id,title,terms,starts_at AS startsAt,ends_at AS endsAt,promo_code AS promoCode,booking_url AS bookingUrl FROM offers WHERE destination_id=? AND status='active' AND starts_at<=? AND ends_at>=? ORDER BY ends_at LIMIT 10",args:[destination.id,new Date().toISOString(),new Date().toISOString()]}),
    client.execute({sql:"SELECT id,title,body,source,updated_at AS updatedAt FROM seasonal_information WHERE destination_id=? ORDER BY updated_at DESC LIMIT 5",args:[destination.id]})
  ]);
  destination.announcements = plainRows<NonNullable<Destination["announcements"]>[number]>(announcements.rows as Row[]);
  destination.reviews = plainRows<NonNullable<Destination["reviews"]>[number]>(reviews.rows as Row[]);
  destination.events=plainRows<NonNullable<Destination["events"]>[number]>(events.rows as Row[]);
  destination.offers=plainRows<NonNullable<Destination["offers"]>[number]>(offers.rows as Row[]);
  destination.seasons=plainRows<NonNullable<Destination["seasons"]>[number]>(seasons.rows as Row[]);
  const rating = await client.execute({sql:`SELECT COUNT(*) AS n, AVG(d.rating_tenths) AS avg_rating
    FROM reviews r JOIN review_details d ON d.review_id=r.id
    WHERE r.destination_id=? AND d.status='approved'`,args:[destination.id]});
  destination.ratingCount=Number(rating.rows[0]?.n||0);
  destination.rating=destination.ratingCount ? Number(rating.rows[0]?.avg_rating)/10 : null;
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
  const restores:InStatement[]=seedRows.map(row=>({sql:`UPDATE destinations SET status='unknown',crowd='unknown',status_rev=status_rev+1,
    status_updated_at=NULL,crowd_updated_at=NULL,status_source='demo',opening_json=?,description=?,updated_at=? WHERE id=?`,
    args:[JSON.stringify({open:"08:00",close:"17:00"}),seedDetails(row).description,new Date().toISOString(),row.id]}));
  await client.batch(["DELETE FROM destination_status_history","DELETE FROM destination_announcements","DELETE FROM crowd_forecasts",...restores],"write");
}

export function demoWritesAllowed() {
  return process.env.NODE_ENV === "development" && !process.env.VERCEL && databaseMode() === "local";
}
