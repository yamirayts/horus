import postgres from "postgres";
import { sql } from "./client";
import { calcularHorasCiclo } from "@/lib/horas";

export interface CicloUso {
  id: number; equipo_id: string; inicio: string; fin: string | null;
  horas_ciclo: number | string | null; ubicacion: string | null; origen: "real" | "sintetico";
  correccion_manual: boolean; motivo_correccion: string | null;
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
    // Al liberar el equipo se limpia la cama: la ubicación solo tiene sentido en uso.
    // El historial de camas queda preservado en ciclos_uso.ubicacion.
    await tx`UPDATE equipos SET estado = 'disponible', ubicacion = NULL,
             horas_acumuladas = horas_acumuladas + ${horas} WHERE id = ${equipoId}`;
    return horas;
  });
}

/**
 * Último evento registrado del equipo: el instante más reciente entre inicios y fines de
 * ciclos y mantenimientos. Ningún evento nuevo con hora pasada puede quedar antes de este
 * límite, para no superponer ciclos ni sumar horas previas a un mantenimiento (que reinicia
 * el contador).
 */
export async function ultimoEventoEquipo(equipoId: string): Promise<Date | null> {
  const filas = await sql<{ t: Date | null }[]>`
    SELECT GREATEST(
      (SELECT MAX(GREATEST(inicio, COALESCE(fin, inicio))) FROM ciclos_uso WHERE equipo_id = ${equipoId}),
      (SELECT MAX(fecha) FROM mantenimientos WHERE equipo_id = ${equipoId})
    ) AS t`;
  return filas[0]?.t ? new Date(filas[0].t) : null;
}

/** Inicio del ciclo abierto del equipo, o null si no está en uso. */
export async function inicioCicloAbierto(equipoId: string): Promise<Date | null> {
  const filas = await sql<{ inicio: Date }[]>`
    SELECT inicio FROM ciclos_uso WHERE equipo_id = ${equipoId} AND fin IS NULL
    ORDER BY inicio DESC LIMIT 1`;
  return filas[0] ? new Date(filas[0].inicio) : null;
}

/**
 * Corrección manual de Ingeniería Clínica ante un olvido de escaneo. La validación de las
 * horas (lib/correccion.ts) la hace el llamador; acá solo se persiste en una transacción.
 * - activar: abre un ciclo con inicio pasado (equipo pasa a 'en_uso').
 * - cerrar:  cierra el ciclo abierto con fin pasado (equipo pasa a 'disponible').
 * - ciclo:   inserta un ciclo completo ya cerrado y suma sus horas (equipo sigue 'disponible').
 * En los tres casos el ciclo queda marcado con correccion_manual y su motivo.
 * Devuelve las horas del ciclo cerrado (cerrar / ciclo) o null (activar).
 */
export async function registrarCorreccion(
  equipoId: string, accion: "activar" | "cerrar" | "ciclo",
  inicio: Date | null, fin: Date | null, ubicacion: string | null, motivo: string,
): Promise<number | null> {
  return sql.begin(async (tx) => {
    if (accion === "activar") {
      await tx`INSERT INTO ciclos_uso (equipo_id, inicio, ubicacion, origen, correccion_manual, motivo_correccion)
               VALUES (${equipoId}, ${inicio!}, ${ubicacion}, 'real', TRUE, ${motivo})`;
      await tx`UPDATE equipos SET estado = 'en_uso', ubicacion = ${ubicacion} WHERE id = ${equipoId}`;
      return null;
    }
    if (accion === "cerrar") {
      const abierto = await tx<{ id: number }[]>`
        SELECT id FROM ciclos_uso WHERE equipo_id = ${equipoId} AND fin IS NULL
        ORDER BY inicio DESC LIMIT 1`;
      const horas = await cerrarCicloAbiertoTx(tx, equipoId, fin!);
      if (horas === null) throw new Error(`Equipo ${equipoId} no tiene ciclo abierto`);
      await tx`UPDATE ciclos_uso SET correccion_manual = TRUE, motivo_correccion = ${motivo}
               WHERE id = ${abierto[0].id}`;
      await tx`UPDATE equipos SET estado = 'disponible', ubicacion = NULL,
               horas_acumuladas = horas_acumuladas + ${horas} WHERE id = ${equipoId}`;
      return horas;
    }
    const horas = calcularHorasCiclo(inicio!, fin!);
    await tx`INSERT INTO ciclos_uso (equipo_id, inicio, fin, horas_ciclo, ubicacion, origen, correccion_manual, motivo_correccion)
             VALUES (${equipoId}, ${inicio!}, ${fin!}, ${horas}, ${ubicacion}, 'real', TRUE, ${motivo})`;
    await tx`UPDATE equipos SET horas_acumuladas = horas_acumuladas + ${horas} WHERE id = ${equipoId}`;
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
