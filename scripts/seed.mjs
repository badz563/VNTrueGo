import { createClient } from "@libsql/client";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const remote = process.argv.includes("--remote");
const schema = readFileSync(path.join(root, "migrations", "001_init.sql"), "utf8")
  .split(";").map(statement => statement.trim()).filter(Boolean);
const rows = JSON.parse(readFileSync(path.join(root, "data", "seed.json"), "utf8"));

if (remote && (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN)) {
  throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required for remote setup.");
}

const localFile = process.env.DATABASE_PATH || path.join(root, "data", "truego.sqlite");
if (!remote) mkdirSync(path.dirname(localFile), { recursive: true });
const client = createClient(remote
  ? { url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN }
  : { url: `file:${localFile.replaceAll("\\", "/")}` });

try {
  let alreadySeeded = false;
  if (remote) {
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    if (tables.rows.length) throw new Error("Remote database already has tables. No schema or data was changed.");
  } else {
    await client.executeMultiple(readFileSync(path.join(root, "migrations", "001_init.sql"), "utf8"));
    const count = await client.execute("SELECT COUNT(*) AS n FROM destinations");
    if (Number(count.rows[0].n) > 0) {
      console.log(`Local database already contains ${count.rows[0].n} destinations; left unchanged.`);
      alreadySeeded = true;
    }
  }
  if (!alreadySeeded) {
    const now = new Date().toISOString();
    const inserts = rows.map(row => ({
    sql: `INSERT INTO destinations
      (id,slug,name,name_en,category,description,description_en,lat,lng,address,image,tags_json,duration,price,opening_json,closed_days_json,status,status_rev,status_updated_at,status_source,crowd,crowd_updated_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [row.id,row.slug,row.name,row.nameEn,row.category,
      `Điểm tham quan tại ${row.address}. Nội dung giới thiệu và thông tin vận hành trong bản demo chỉ để lập kế hoạch tham khảo.`,
      `An attraction in ${row.address}. Descriptions and operating details in this demo are illustrative only.`,
      row.lat,row.lng,row.address,row.image,JSON.stringify(row.tags),row.duration,row.price,
      JSON.stringify({open:"08:00",close:"17:00"}),JSON.stringify([]),
      "unknown",1,null,"demo","unknown",null,now]
    }));
    await client.batch([
      ...(remote ? schema : []),
      ...inserts,
      { sql: "INSERT OR IGNORE INTO partner_organizations (id,name) VALUES (?,?)", args: ["demo", "TrueGo Demo Partner"] }
    ], "write");
    console.log(`${remote ? "Remote" : "Local"} database initialized with ${rows.length} demo destinations.`);
  }
} finally {
  client.close();
}
