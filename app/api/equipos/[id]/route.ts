import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { getEquipo, actualizarEquipoConfig } from "@/lib/db/equipos";
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

// PATCH /api/equipos/[id] — edita la configuración del equipo (umbrales, horas iniciales, etc).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  try {
    await actualizarEquipoConfig(params.id, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
