import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  // No lanzar en import para permitir build sin DB; las funciones fallarán en runtime si falta.
  console.warn("DATABASE_URL no está seteada. Configurala en .env.local para operar.");
}

export const sql = postgres(process.env.DATABASE_URL ?? "", { ssl: "require" });
