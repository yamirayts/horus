import { sql } from "./client";
import { getEquipo } from "./equipos";

export interface Lectura {
  id: number; equipo_id: string; fecha: string;
  horas_horometro: number; horas_qr_al_momento: number | null; observacion: string | null;
}

export async function registrarLectura(l: {
  equipo_id: string; horas_horometro: number; observacion?: string;
}): Promise<void> {
  const eq = await getEquipo(l.equipo_id);
  if (!eq) throw new Error(`Equipo ${l.equipo_id} no existe`);
  await sql`
    INSERT INTO lecturas_horometro (equipo_id, horas_horometro, horas_qr_al_momento, observacion)
    VALUES (${l.equipo_id}, ${l.horas_horometro}, ${eq.horas_acumuladas}, ${l.observacion ?? null})`;
}

export async function listarLecturas(equipoId: string): Promise<Lectura[]> {
  return sql<Lectura[]>`
    SELECT * FROM lecturas_horometro WHERE equipo_id = ${equipoId} ORDER BY fecha DESC`;
}
