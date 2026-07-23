import { NextResponse } from "next/server";

// Endpoint de diagnóstico: reporta si DATABASE_URL llegó al runtime,
// sin exponer el valor completo. Se puede eliminar cuando la app esté estable.
export async function GET() {
  const url = process.env.DATABASE_URL;
  return NextResponse.json({
    definida: typeof url === "string" && url.length > 0,
    largo: url?.length ?? 0,
    empiezaCon: url ? url.slice(0, 15) : null,
    esNeon: url?.includes("neon.tech") ?? false,
    node: process.version,
    vercelEnv: process.env.VERCEL_ENV ?? "no-vercel",
  });
}
