import { NextRequest, NextResponse } from "next/server";
import { getEquipo } from "@/lib/db/equipos";
import { abrirCiclo, cerrarCicloAbierto } from "@/lib/db/ciclos";
import { decidirAccion } from "@/lib/alertas";

// GET /api/scan?id= — previsualiza la acción que tomaría el toggle sin ejecutarla.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "falta id" }, { status: 400 });
  const equipo = await getEquipo(id);
  if (!equipo) return NextResponse.json({ ok: false, error: "equipo desconocido" }, { status: 404 });
  return NextResponse.json({ ok: true, equipo, accion: decidirAccion(equipo.estado) });
}

// POST /api/scan { id, ubicacion? } — ejecuta el toggle: abre o cierra el ciclo de uso.
export async function POST(req: NextRequest) {
  const { id, ubicacion } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "falta id" }, { status: 400 });
  const equipo = await getEquipo(id);
  if (!equipo) return NextResponse.json({ ok: false, error: "equipo desconocido" }, { status: 404 });
  const accion = decidirAccion(equipo.estado);
  try {
    if (accion === "activar") {
      await abrirCiclo(id, ubicacion ?? equipo.ubicacion ?? null, "real");
      return NextResponse.json({ ok: true, accion, equipo: { ...equipo, estado: "en_uso" } });
    }
    if (accion === "desactivar") {
      const horas = await cerrarCicloAbierto(id);
      return NextResponse.json({ ok: true, accion, horas, equipo: { ...equipo, estado: "disponible" } });
    }
    return NextResponse.json({ ok: false, error: "equipo en mantenimiento" }, { status: 409 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
