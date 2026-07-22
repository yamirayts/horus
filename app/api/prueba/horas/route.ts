import { NextRequest, NextResponse } from "next/server";
import { actualizarEquipoConfig } from "@/lib/db/equipos";

// POST /api/prueba/horas { equipo_id, horas_iniciales }
// Modo prueba: carga horas previas de un equipo para pruebas/demo.
export async function POST(req: NextRequest) {
  const { equipo_id, horas_iniciales } = await req.json();
  if (!equipo_id || horas_iniciales == null) {
    return NextResponse.json({ ok: false, error: "faltan datos" }, { status: 400 });
  }
  try {
    await actualizarEquipoConfig(equipo_id, { horas_iniciales: Number(horas_iniciales) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
