import { sql } from "./client";
import { calcularHorasCiclo } from "@/lib/horas";

export interface CicloUso {
  id: number; equipo_id: string; inicio: string; fin: string | null;
  horas_ciclo: number | string | null; ubicacion: string | null; origen: "real" | "sintetico";
}

export async function abrirCiclo(
  equipoId: string, ubicacion: string | null,
  origen: "real" | "sintetico" = "real", inicio: Date = new Date()
): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`INSERT INTO ciclos_uso (equipo_id, inicio, ubicacion, origen)
             VALUES (${equipoId}, ${inicio}, ${ubicacion}, ${origen})`;
    await tx`UPDATE equipos SET estado = 'en_uso', ubicacion = ${ubicacion} WHERE id = ${equipoId}`;
  });
}

export async function cerrarCicloAbierto(equipoId: string, fin: Date = new Date()): Promise<number> {
  return sql.begin(async (tx) => {
    const abiertos = await tx<{ id: number; inicio: Date }[]>`
      SELECT id, inicio FROM ciclos_uso WHERE equipo_id = ${equipoId} AND fin IS NULL
      ORDER BY inicio DESC LIMIT 1`;
    if (abiertos.length === 0) throw new Error(`Equipo ${equipoId} no tiene ciclo abierto`);
    const c = abiertos[0];
    const horas = calcularHorasCiclo(new Date(c.inicio), fin);
    await tx`UPDATE ciclos_uso SET fin = ${fin}, horas_ciclo = ${horas} WHERE id = ${c.id}`;
    await tx`UPDATE equipos SET estado = 'disponible',
             horas_acumuladas = horas_acumuladas + ${horas} WHERE id = ${equipoId}`;
    return horas;
  });
}

/** Últimos ciclos de uso de un equipo (los más recientes primero). */
export async function listarCiclos(equipoId: string, limite = 50): Promise<CicloUso[]> {
  return sql<CicloUso[]>`
    SELECT * FROM ciclos_uso WHERE equipo_id = ${equipoId}
    ORDER BY inicio DESC LIMIT ${limite}`;
}

/**
 * Suma de horas de ciclos cerrados por equipo desde una fecha dada (para TUE del tablero).
 * Solo cuenta ciclos con horas_ciclo calculado (cerrados); los abiertos no suman al período.
 */
export async function sumarHorasPorEquipoDesde(desde: Date): Promise<Record<string, number>> {
  const filas = await sql<{ equipo_id: string; total: number }[]>`
    SELECT equipo_id, COALESCE(SUM(horas_ciclo), 0) AS total
    FROM ciclos_uso
    WHERE inicio >= ${desde} AND horas_ciclo IS NOT NULL
    GROUP BY equipo_id`;
  const mapa: Record<string, number> = {};
  for (const f of filas) mapa[f.equipo_id] = Number(f.total);
  return mapa;
}
