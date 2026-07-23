import { NextRequest, NextResponse } from "next/server";
import { registrarFalla } from "@/lib/db/fallas";

// POST /api/falla { equipo_id, tipo?, descripcion?, ponerEnMantenimiento? }
// Reporte de falla real desde el escaneo: origen siempre "real" (nunca viene del body).
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.equipo_id) return NextResponse.json({ ok: false, error: "falta equipo_id" }, { status: 400 });
  await registrarFalla({
    equipo_id: body.equipo_id,
    tipo: body.tipo,
    descripcion: body.descripcion,
    origen: "real", // reporte de enfermería: SIEMPRE real
    ponerEnMantenimiento: body.ponerEnMantenimiento ?? true,
  });
  return NextResponse.json({ ok: true });
}
