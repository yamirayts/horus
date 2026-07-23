import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import {
  getEquipo,
  actualizarEquipoConfig,
  darDeBajaEquipo,
  reactivarEquipo,
  eliminarEquipoDefinitivo,
} from "@/lib/db/equipos";
import { listarFallas } from "@/lib/db/fallas";

// GET /api/equipos/[id] — detalle del equipo con su historial (ciclos, mantenimientos, fallas).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const equipo = await getEquipo(params.id);
    if (!equipo) return NextResponse.json({ ok: false, error: "no existe" }, { status: 404 });
    const ciclos = await sql`SELECT * FROM ciclos_uso WHERE equipo_id = ${params.id} ORDER BY inicio DESC LIMIT 50`;
    const mantenimientos = await sql`SELECT * FROM mantenimientos WHERE equipo_id = ${params.id} ORDER BY fecha DESC`;
    const fallas = await listarFallas(params.id);
    return NextResponse.json({ equipo, ciclos, mantenimientos, fallas });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

// PATCH /api/equipos/[id] — edita configuración y datos editables del equipo.
// Body soporta: umbral_horas, pct_alerta, pct_vencido, horas_iniciales,
// marca, modelo, numero_serie, además de acciones especiales:
//   { accion: "baja", motivo?: string } — baja lógica.
//   { accion: "reactivar" } — revierte la baja.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  try {
    if (body.accion === "baja") {
      await darDeBajaEquipo(params.id, body.motivo);
      return NextResponse.json({ ok: true });
    }
    if (body.accion === "reactivar") {
      await reactivarEquipo(params.id);
      return NextResponse.json({ ok: true });
    }
    await actualizarEquipoConfig(params.id, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

// DELETE /api/equipos/[id] — eliminación DEFINITIVA. Falla si tiene actividad.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await eliminarEquipoDefinitivo(params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 409 });
  }
}
