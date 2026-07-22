import { NextRequest, NextResponse } from "next/server";
import { registrarFalla } from "@/lib/db/fallas";

// POST /api/prueba/fallas { equipo_id, cantidad, dias_rango? }
// Modo prueba: inserta `cantidad` fallas sintéticas (origen='sintetico') con fechas
// repartidas en los últimos `dias_rango` días, para poder demostrar el cálculo de MTBF.
export async function POST(req: NextRequest) {
  const { equipo_id, cantidad, dias_rango } = await req.json();
  const n = Number(cantidad);
  const rango = Number(dias_rango) || 90;
  if (!equipo_id || !n || n <= 0) {
    return NextResponse.json({ ok: false, error: "datos inválidos" }, { status: 400 });
  }
  try {
    for (let k = 0; k < n; k++) {
      const diasAtras = Math.round((rango / n) * k);
      const fecha = new Date(Date.now() - diasAtras * 86400 * 1000);
      await registrarFalla({
        equipo_id,
        tipo: "otra",
        descripcion: "falla sintética (demo MTBF)",
        origen: "sintetico",
        fecha,
        ponerEnMantenimiento: false,
      });
    }
    return NextResponse.json({ ok: true, insertadas: n });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
