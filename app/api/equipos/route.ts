import { NextRequest, NextResponse } from "next/server";
import { listarEquipos, crearEquipo } from "@/lib/db/equipos";

// GET /api/equipos?tipo=&estado=&baja= — lista equipos con filtros opcionales.
// baja=incluir muestra activos + dados de baja. baja=solo muestra solo los dados de baja.
export async function GET(req: NextRequest) {
  const tipo = req.nextUrl.searchParams.get("tipo") ?? undefined;
  const estado = req.nextUrl.searchParams.get("estado") ?? undefined;
  const baja = req.nextUrl.searchParams.get("baja");
  try {
    const equipos = await listarEquipos({
      tipo,
      estado,
      incluirBajas: baja === "incluir",
      soloBajas: baja === "solo",
    });
    return NextResponse.json(equipos);
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/equipos — alta de un equipo nuevo.
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.id || !body.tipo || !body.umbral_horas) {
    return NextResponse.json({ ok: false, error: "faltan campos obligatorios" }, { status: 400 });
  }
  try {
    await crearEquipo(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
