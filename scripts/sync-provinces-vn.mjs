import fs from "node:fs";
import path from "node:path";

const API_URL = "https://provinces.open-api.vn/api/v2/?depth=2";
const OUT_SQL = path.join(process.cwd(), "data", "provinces-vn-v2.sql");

function sqlStr(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

async function main() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${API_URL}`);
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Invalid data from provinces API");
  }

  const lines = [
    "-- Vietnam administrative units v2 (34 provinces/cities, 3321 wards/communes)",
    "DELETE FROM wards;",
    "DELETE FROM provinces;",
    "CREATE INDEX IF NOT EXISTS idx_wards_province ON wards(province_code, name);",
  ];

  // Batch inserts (50 rows per statement) for fast Cloudflare D1 execution
  const provValues = data.map((p) => {
    const code = String(p.code).padStart(2, "0");
    return `(${sqlStr(code)}, ${sqlStr(p.name)})`;
  });
  lines.push(`INSERT INTO provinces (code, name) VALUES\n${provValues.join(",\n")};`);

  const allWards = [];
  for (const p of data) {
    const pCode = String(p.code).padStart(2, "0");
    for (const w of p.wards || []) {
      const wCode = String(w.code).padStart(5, "0");
      allWards.push(`(${sqlStr(wCode)}, ${sqlStr(pCode)}, ${sqlStr(w.name)})`);
    }
  }

  const CHUNK = 100;
  for (let i = 0; i < allWards.length; i += CHUNK) {
    const slice = allWards.slice(i, i + CHUNK);
    lines.push(`INSERT INTO wards (code, province_code, name) VALUES\n${slice.join(",\n")};`);
  }

  fs.mkdirSync(path.dirname(OUT_SQL), { recursive: true });
  fs.writeFileSync(OUT_SQL, lines.join("\n\n") + "\n", "utf8");
  console.log(`Generated ${OUT_SQL}: ${data.length} provinces, ${allWards.length} wards.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
