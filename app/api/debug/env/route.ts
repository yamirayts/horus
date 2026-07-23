import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Endpoint de diagnóstico: reporta env vars e intenta una query mínima.
export async function GET() {
  const url = process.env.DATABASE_URL;
  const info: Record<string, unknown> = {
    definida: typeof url === "string" && url.length > 0,
    largo: url?.length ?? 0,
    empiezaCon: url ? url.slice(0, 15) : null,
    esNeon: url?.includes("neon.tech") ?? false,
    node: process.version,
    vercelEnv: process.env.VERCEL_ENV ?? "no-vercel",
  };

  try {
    const { sql } = await import("@/lib/db/client");
    const res = await sql`SELECT COUNT(*)::int AS n FROM equipos`;
    info.dbOk = true;
    info.equipos = res[0]?.n ?? null;
  } catch (e) {
    info.dbOk = false;
    info.dbError = (e as Error).message;
  }

  return NextResponse.json(info);
}
