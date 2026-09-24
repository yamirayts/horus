import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { getEquipo } from "@/lib/db/equipos";
import { inicioCicloAbierto, registrarCorreccion, ultimoEventoEquipo } from "@/lib/db/ciclos";
import { validarCorreccion, type AccionCorreccion } from "@/lib/correccion";

const ACCIONES: AccionCorreccion[] = ["activar", "cerrar", "ciclo"];

const aFecha = (v: unknown): Date | null => (typeof v === "string" && v ? new Date(v) : null);

// POST /api/correccion { equipo_id, accion, inicio?, fin?, ubicacion?, motivo }
// Corrección manual de Ingeniería Clínica ante un olvido de escaneo (ver lib/correccion.ts).
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { equipo_id, accion, ubicacion, motivo } = body;
  if (!equipo_id || !ACCIONES.includes(accion)) {
    return NextResponse.json({ ok: false, error: "faltan datos" }, { status: 400 });
  }
  const equipo = await getEquipo(equipo_id);
  if (!equipo) return NextResponse.json({ ok: false, error: "equipo desconocido" }, { status: 404 });
  if (!equipo.activo) return NextResponse.json({ ok: false, error: "equipo dado de baja" }, { status: 410 });
  if (equipo.estado === "mantenimiento") {
    return NextResponse.json({ ok: false, error: "equipo en mantenimiento" }, { status: 409 });
  }

  const inicio = aFecha(body.inicio);
  const fin = aFecha(body.fin);
  const [abierto, ultimo] = await Promise.all([inicioCicloAbierto(equipo_id), ultimoEventoEquipo(equipo_id)]);
  const error = validarCorreccion({
    accion, inicio, fin, motivo: String(motivo ?? ""),
    ahora: new Date(), limiteInferior: ultimo, inicioAbierto: abierto,
  });
  if (error) return NextResponse.json({ ok: false, error }, { status: 400 });

  try {
    const horas = await registrarCorreccion(
      equipo_id, accion, inicio, fin, ubicacion || equipo.ubicacion || null, String(motivo).trim(),
    );
    // Igual que al desactivar por escaneo: si al sumar las horas corregidas el equipo quedó
    // vencido y está libre, se aparta a 'mantenimiento' para que no pueda reasignarse.
    const eq = await getEquipo(equipo_id);
    const umbral = Number(eq?.umbral_horas ?? 0);
    const requiereRetiro = eq?.estado === "disponible" && umbral > 0 &&
      Number(eq.horas_acumuladas) >= umbral * Number(eq.pct_vencido ?? 1);
    if (requiereRetiro) await sql`UPDATE equipos SET estado = 'mantenimiento' WHERE id = ${equipo_id}`;
    return NextResponse.json({ ok: true, horas, requiereRetiro });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
