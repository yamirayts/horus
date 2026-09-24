/**
 * Mantenimiento puntual: libera la cama (equipos.ubicacion) de los equipos que ya NO
 * están en uso. Corrige los datos viejos previos al fix del invariante
 * "la cama solo vale en uso" (ver lib/db/ciclos.ts, fallas.ts, mantenimientos.ts).
 *
 * NO toca ciclos_uso: el historial de cama + fechas queda intacto.
 * NO toca equipos en uso: el WHERE los excluye.
 *
 * Uso:
 *   1) Tener DATABASE_URL en .env.local (o en el entorno).
 *   2) npx tsx scripts/limpiar-camas.ts
 *
 * Primero muestra qué filas se limpiarían (preview) y recién después ejecuta el UPDATE.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Cargar .env.local si DATABASE_URL no vino en el entorno (tsx no lo hace solo).
if (!process.env.DATABASE_URL) {
  try {
    const env = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const linea of env.split(/\r?\n/)) {
      const m = linea.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        let v = m[2].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        process.env[m[1]] = v;
      }
    }
  } catch {
    /* sin .env.local: se usa lo que haya en el entorno */
  }
}

if (!process.env.DATABASE_URL) {
  console.error("✗ Falta DATABASE_URL. Ponela en .env.local o en el entorno y reintentá.");
  process.exit(1);
}

// Import relativo (no depende del alias @/ que tsx podría no resolver).
const { sql } = await import("../lib/db/client");

const preview = await sql<{ id: string; estado: string; ubicacion: string }[]>`
  SELECT id, estado, ubicacion FROM equipos
  WHERE estado <> 'en_uso' AND ubicacion IS NOT NULL
  ORDER BY id`;

console.log(`\nEquipos no-en-uso con cama pegada: ${preview.length}`);
for (const e of preview) {
  console.log(`  ${e.id}  [${e.estado}]  cama: ${e.ubicacion}`);
}

if (preview.length === 0) {
  console.log("\nNada para limpiar. ✔");
  await sql.end();
  process.exit(0);
}

const filas = await sql`
  UPDATE equipos SET ubicacion = NULL
  WHERE estado <> 'en_uso' AND ubicacion IS NOT NULL`;

console.log(`\n✔ Camas liberadas: ${filas.count}. (ciclos_uso / historial: intacto)`);
await sql.end();
