import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
const root = process.cwd();
mkdirSync(path.join(root, "data"), { recursive: true });
const sql = new DatabaseSync(process.env.DATABASE_PATH || path.join(root, "data", "truego.sqlite"));
sql.exec(readFileSync(path.join(root, "migrations", "001_init.sql"), "utf8"));
const count = sql.prepare("SELECT COUNT(*) AS n FROM destinations").get().n;
if (!count) {
  const rows = JSON.parse(readFileSync(path.join(root, "data", "seed.json"), "utf8"));
  const now = new Date().toISOString();
  const insert = sql.prepare(`INSERT INTO destinations
    (id,slug,name,name_en,category,description,description_en,lat,lng,address,image,tags_json,duration,price,opening_json,closed_days_json,status,status_rev,status_updated_at,status_source,crowd,crowd_updated_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  sql.exec("BEGIN");
  try {
    for (const row of rows) insert.run(
      row.id,row.slug,row.name,row.nameEn,row.category,
      `Điểm tham quan tại ${row.address}. Nội dung giới thiệu và thông tin vận hành trong bản demo chỉ để lập kế hoạch tham khảo.`,
      `An attraction in ${row.address}. Descriptions and operating details in this demo are illustrative only.`,
      row.lat,row.lng,row.address,row.image,JSON.stringify(row.tags),row.duration,row.price,
      JSON.stringify({open:"08:00",close:"17:00"}),JSON.stringify([]),
      "unknown",1,null,"demo","unknown",null,now
    );
    sql.prepare("INSERT OR IGNORE INTO partner_organizations (id,name) VALUES (?,?)").run("demo","TrueGo Demo Partner");
    sql.exec("COMMIT");
  } catch (error) { sql.exec("ROLLBACK"); throw error; }
}
console.log(`Database ready: ${sql.prepare("SELECT COUNT(*) AS n FROM destinations").get().n} destinations`);
sql.close();
