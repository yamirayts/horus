import { NextResponse } from "next/server";
import { construirTablero } from "@/lib/tablero";

// GET /api/tablero — resumen agregado para el tablero de Ingeniería Clínica.
export async function GET() {
  try {
    const tablero = await construirTablero();
    return NextResponse.json(tablero);
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
