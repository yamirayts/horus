import { NextRequest, NextResponse } from "next/server";
import { registrarMantenimiento } from "@/lib/db/mantenimientos";

// POST /api/mantenimiento — registra un mantenimiento y resetea el contador de horas del equipo.
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.equipo_id) return NextResponse.json({ ok: false, error: "falta equipo_id" }, { status: 400 });
  try {
    await registrarMantenimiento(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
