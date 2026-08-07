import postgres from "postgres";
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

/**
 * Cierra el ciclo abierto de un equipo (si existe) DENTRO de una transacción ya iniciada
 * por el llamador. No toca el estado del equipo — eso queda a criterio de quien invoca,
 * porque el destino tras cerrar el ciclo varía (disponible, mantenimiento, etc).
 * Devuelve las horas del ciclo cerrado, o null si el equipo no tenía ciclo abierto.
 * Compartida por cerrarCicloAbierto, registrarFalla y registrarMantenimiento para no
 * duplicar el SQL de cierre.
 */
export async function cerrarCicloAbiertoTx(
  tx: postgres.TransactionSql, equipoId: string, fin: Date = new Date()
): Promise<number | null> {
  const abiertos = await tx<{ id: number; inicio: Date }[]>`
    SELECT id, inicio FROM ciclos_uso WHERE equipo_id = ${equipoId} AND fin IS NULL
    ORDER BY inicio DESC LIMIT 1`;
  if (abiertos.length === 0) return null;
  const c = abiertos[0];
  const horas = calcularHorasCiclo(new Date(c.inicio), fin);
  await tx`UPDATE ciclos_uso SET fin = ${fin}, horas_ciclo = ${horas} WHERE id = ${c.id}`;
  return horas;
}

export async function cerrarCicloAbierto(equipoId: string, fin: Date = new Date()): Promise<number> {
  return sql.begin(async (tx) => {
    const horas = await cerrarCicloAbiertoTx(tx, equipoId, fin);
    if (horas === null) throw new Error(`Equipo ${equipoId} no tiene ciclo abierto`);
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

/**
 * Inicio del ciclo abierto actual de cada equipo que esté en uso.
 * Se usa para calcular horas acumuladas "en vivo": las horas_acumuladas del equipo
 * más el tiempo transcurrido desde el inicio del ciclo abierto.
 * Sin esto, un equipo que cruza el umbral durante un ciclo largo no dispararía la
 * alerta hasta que se cerrara ese ciclo, momento inadecuado en la práctica clínica.
 */
export async function iniciosDeCiclosAbiertos(): Promise<Record<string, Date>> {
  const filas = await sql<{ equipo_id: string; inicio: Date }[]>`
    SELECT DISTINCT ON (equipo_id) equipo_id, inicio
    FROM ciclos_uso
    WHERE fin IS NULL
    ORDER BY equipo_id, inicio DESC`;
  const mapa: Record<string, Date> = {};
  for (const f of filas) mapa[f.equipo_id] = new Date(f.inicio);
  return mapa;
}
