import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { getEquipo } from "@/lib/db/equipos";
import { abrirCiclo, cerrarCicloAbierto } from "@/lib/db/ciclos";
import { decidirAccion } from "@/lib/alertas";

// El estado del equipo cambia con cada escaneo: nunca cachear.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const HEADERS_SIN_CACHE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
};

// GET /api/scan?id= — previsualiza la acción que tomaría el toggle sin ejecutarla.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "falta id" }, { status: 400, headers: HEADERS_SIN_CACHE });
  }
  const equipo = await getEquipo(id);
  if (!equipo) {
    return NextResponse.json({ ok: false, error: "equipo desconocido" }, { status: 404, headers: HEADERS_SIN_CACHE });
  }
  if (!equipo.activo) {
    return NextResponse.json(
      { ok: false, error: "equipo dado de baja" },
      { status: 410, headers: HEADERS_SIN_CACHE }
    );
  }
  return NextResponse.json(
    { ok: true, equipo, accion: decidirAccion(equipo.estado) },
    { headers: HEADERS_SIN_CACHE }
  );
}

// POST /api/scan { id, ubicacion? } — ejecuta el toggle: abre o cierra el ciclo de uso.
export async function POST(req: NextRequest) {
  const { id, ubicacion } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "falta id" }, { status: 400 });
  const equipo = await getEquipo(id);
  if (!equipo) return NextResponse.json({ ok: false, error: "equipo desconocido" }, { status: 404 });
  if (!equipo.activo) return NextResponse.json({ ok: false, error: "equipo dado de baja" }, { status: 410 });
  const accion = decidirAccion(equipo.estado);
  try {
    if (accion === "activar") {
      await abrirCiclo(id, ubicacion ?? equipo.ubicacion ?? null, "real");
      return NextResponse.json({ ok: true, accion, equipo: { ...equipo, estado: "en_uso" } });
    }
    if (accion === "desactivar") {
      const horas = await cerrarCicloAbierto(id);
      // Al cerrar, chequear si el equipo superó el umbral de vencido.
      // Si sí, apartarlo automáticamente: pasa a estado 'mantenimiento' para que salga
      // del pool y no se pueda reasignar hasta que Ingeniería Clínica lo intervenga.
      const eqActualizado = await getEquipo(id);
      const horasAcum = Number(eqActualizado?.horas_acumuladas ?? 0);
      const umbral = Number(eqActualizado?.umbral_horas ?? 0);
      const pctVencido = Number(eqActualizado?.pct_vencido ?? 1);
      const requiereRetiro = umbral > 0 && horasAcum >= umbral * pctVencido;
      if (requiereRetiro) {
        await sql`UPDATE equipos SET estado = 'mantenimiento' WHERE id = ${id}`;
      }
      return NextResponse.json({
        ok: true,
        accion,
        horas,
        requiereRetiro,
        horasAcumuladas: horasAcum,
        umbral,
        equipo: {
          ...equipo,
          estado: requiereRetiro ? "mantenimiento" : "disponible",
          horas_acumuladas: horasAcum,
        },
      });
    }
    return NextResponse.json({ ok: false, error: "equipo en mantenimiento" }, { status: 409 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
