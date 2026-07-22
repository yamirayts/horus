import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { getEquipo } from "@/lib/db/equipos";

// POST /api/prueba/stress { equipo_id, horas_objetivo }
// Modo prueba: inserta un ciclo cerrado sintético (origen='sintetico') que lleva
// el acumulado del equipo hasta horas_objetivo, para disparar la alerta de umbral.
export async function POST(req: NextRequest) {
  const { equipo_id, horas_objetivo } = await req.json();
  if (!equipo_id || horas_objetivo == null) {
    return NextResponse.json({ ok: false, error: "faltan datos" }, { status: 400 });
  }
  try {
    const eq = await getEquipo(equipo_id);
    if (!eq) return NextResponse.json({ ok: false, error: "no existe" }, { status: 404 });
    const delta = Number(horas_objetivo) - Number(eq.horas_acumuladas);
    if (delta <= 0) return NextResponse.json({ ok: false, error: "objetivo <= actual" }, { status: 400 });
    const ahora = new Date();
    const inicio = new Date(ahora.getTime() - delta * 3600 * 1000);
    await sql.begin(async (tx) => {
      await tx`INSERT INTO ciclos_uso (equipo_id, inicio, fin, horas_ciclo, origen)
               VALUES (${equipo_id}, ${inicio}, ${ahora}, ${delta}, 'sintetico')`;
      await tx`UPDATE equipos SET horas_acumuladas = horas_acumuladas + ${delta} WHERE id = ${equipo_id}`;
    });
    return NextResponse.json({ ok: true, horas_agregadas: delta });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
