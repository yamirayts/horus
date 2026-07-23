import { sql } from "./client";

export interface Equipo {
  id: string; tipo: string; marca: string | null; modelo: string | null;
  numero_serie: string | null;
  fecha_alta: string; umbral_horas: number;
  pct_alerta: number; pct_vencido: number;
  horas_acumuladas: number; horas_iniciales: number;
  estado: "disponible" | "en_uso" | "mantenimiento"; ubicacion: string | null;
  activo: boolean;
  fecha_baja: string | null;
  motivo_baja: string | null;
}
export interface NuevoEquipo {
  id: string; tipo: string; marca?: string; modelo?: string;
  numero_serie?: string;
  umbral_horas: number; pct_alerta?: number; pct_vencido?: number; horas_iniciales?: number;
}

export async function getEquipo(id: string): Promise<Equipo | null> {
  const r = await sql<Equipo[]>`SELECT * FROM equipos WHERE id = ${id}`;
  return r[0] ?? null;
}

/** Por defecto solo equipos activos. Pasar `incluirBajas` para ver los dados de baja. */
export async function listarEquipos(filtro?: {
  tipo?: string; estado?: string; incluirBajas?: boolean; soloBajas?: boolean;
}): Promise<Equipo[]> {
  const tipo = filtro?.tipo ?? null;
  const estado = filtro?.estado ?? null;
  const soloBajas = filtro?.soloBajas === true;
  const incluirBajas = filtro?.incluirBajas === true;
  return sql<Equipo[]>`
    SELECT * FROM equipos
    WHERE (${tipo}::text IS NULL OR tipo = ${tipo})
      AND (${estado}::text IS NULL OR estado = ${estado})
      AND (
        ${soloBajas} = TRUE AND activo = FALSE
        OR ${soloBajas} = FALSE AND (${incluirBajas} = TRUE OR activo = TRUE)
      )
    ORDER BY id`;
}

export async function crearEquipo(e: NuevoEquipo): Promise<void> {
  await sql`
    INSERT INTO equipos (id, tipo, marca, modelo, numero_serie, umbral_horas, pct_alerta, pct_vencido, horas_iniciales, horas_acumuladas)
    VALUES (${e.id}, ${e.tipo}, ${e.marca ?? null}, ${e.modelo ?? null}, ${e.numero_serie ?? null},
            ${e.umbral_horas}, ${e.pct_alerta ?? 0.8}, ${e.pct_vencido ?? 1.0},
            ${e.horas_iniciales ?? 0}, ${e.horas_iniciales ?? 0})`;
}

/** Actualiza configuración y datos editables del equipo. */
export async function actualizarEquipoConfig(id: string, c: {
  umbral_horas?: number; pct_alerta?: number; pct_vencido?: number; horas_iniciales?: number;
  marca?: string; modelo?: string; numero_serie?: string;
}): Promise<void> {
  const actual = await getEquipo(id);
  if (!actual) throw new Error(`Equipo ${id} no existe`);
  const nuevoInicial = c.horas_iniciales ?? actual.horas_iniciales;
  // Si cambian las horas iniciales, ajustar acumuladas por la diferencia.
  const deltaInicial = nuevoInicial - actual.horas_iniciales;
  await sql`
    UPDATE equipos SET
      umbral_horas = ${c.umbral_horas ?? actual.umbral_horas},
      pct_alerta   = ${c.pct_alerta ?? actual.pct_alerta},
      pct_vencido  = ${c.pct_vencido ?? actual.pct_vencido},
      horas_iniciales = ${nuevoInicial},
      horas_acumuladas = horas_acumuladas + ${deltaInicial},
      marca = ${c.marca ?? actual.marca},
      modelo = ${c.modelo ?? actual.modelo},
      numero_serie = ${c.numero_serie ?? actual.numero_serie}
    WHERE id = ${id}`;
}

/** Baja lógica: el equipo sale de listados y tablero, pero el historial queda. */
export async function darDeBajaEquipo(id: string, motivo?: string): Promise<void> {
  const eq = await getEquipo(id);
  if (!eq) throw new Error(`Equipo ${id} no existe`);
  await sql`
    UPDATE equipos SET activo = FALSE, fecha_baja = now(), motivo_baja = ${motivo ?? null}
    WHERE id = ${id}`;
}

/** Revierte una baja lógica. */
export async function reactivarEquipo(id: string): Promise<void> {
  await sql`
    UPDATE equipos SET activo = TRUE, fecha_baja = NULL, motivo_baja = NULL
    WHERE id = ${id}`;
}

/**
 * Elimina el equipo definitivamente junto con TODO su historial.
 * Solo permitido si no tiene actividad registrada (ciclos, mantenimientos,
 * fallas, lecturas). Pensado para corregir un alta errónea.
 */
export async function eliminarEquipoDefinitivo(id: string): Promise<void> {
  await sql.begin(async (tx) => {
    const [{ n }] = await tx<{ n: number }[]>`
      SELECT (
        (SELECT COUNT(*) FROM ciclos_uso WHERE equipo_id = ${id})
        + (SELECT COUNT(*) FROM mantenimientos WHERE equipo_id = ${id})
        + (SELECT COUNT(*) FROM fallas WHERE equipo_id = ${id})
        + (SELECT COUNT(*) FROM lecturas_horometro WHERE equipo_id = ${id})
      )::int AS n`;
    if (n > 0) {
      throw new Error(
        `No se puede eliminar definitivamente: el equipo tiene ${n} registros históricos. Usá "Dar de baja" para preservar el historial.`
      );
    }
    await tx`DELETE FROM equipos WHERE id = ${id}`;
  });
}
