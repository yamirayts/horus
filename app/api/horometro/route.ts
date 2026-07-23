import { NextRequest, NextResponse } from "next/server";
import { registrarLectura, listarLecturas } from "@/lib/db/horometro";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("equipo_id");
  if (!id) return NextResponse.json({ ok: false, error: "falta equipo_id" }, { status: 400 });
  return NextResponse.json(await listarLecturas(id));
}

export async function POST(req: NextRequest) {
  const { equipo_id, horas_horometro, observacion } = await req.json();
  if (!equipo_id || horas_horometro == null) {
    return NextResponse.json({ ok: false, error: "faltan datos" }, { status: 400 });
  }
  try {
    await registrarLectura({ equipo_id, horas_horometro: Number(horas_horometro), observacion });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
