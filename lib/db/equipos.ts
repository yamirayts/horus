import { sql } from "./client";

export interface Equipo {
  id: string; tipo: string; marca: string | null; modelo: string | null;
  fecha_alta: string; umbral_horas: number;
  pct_alerta: number; pct_vencido: number;
  horas_acumuladas: number; horas_iniciales: number;
  estado: "disponible" | "en_uso" | "mantenimiento"; ubicacion: string | null;
}
export interface NuevoEquipo {
  id: string; tipo: string; marca?: string; modelo?: string;
  umbral_horas: number; pct_alerta?: number; pct_vencido?: number; horas_iniciales?: number;
}

export async function getEquipo(id: string): Promise<Equipo | null> {
  const r = await sql<Equipo[]>`SELECT * FROM equipos WHERE id = ${id}`;
  return r[0] ?? null;
}

export async function listarEquipos(filtro?: { tipo?: string; estado?: string }): Promise<Equipo[]> {
  return sql<Equipo[]>`
    SELECT * FROM equipos
    WHERE (${filtro?.tipo ?? null}::text IS NULL OR tipo = ${filtro?.tipo ?? null})
      AND (${filtro?.estado ?? null}::text IS NULL OR estado = ${filtro?.estado ?? null})
    ORDER BY id`;
}

export async function crearEquipo(e: NuevoEquipo): Promise<void> {
  await sql`
    INSERT INTO equipos (id, tipo, marca, modelo, umbral_horas, pct_alerta, pct_vencido, horas_iniciales, horas_acumuladas)
    VALUES (${e.id}, ${e.tipo}, ${e.marca ?? null}, ${e.modelo ?? null}, ${e.umbral_horas},
            ${e.pct_alerta ?? 0.8}, ${e.pct_vencido ?? 1.0}, ${e.horas_iniciales ?? 0}, ${e.horas_iniciales ?? 0})`;
}

export async function actualizarEquipoConfig(id: string, c: {
  umbral_horas?: number; pct_alerta?: number; pct_vencido?: number; horas_iniciales?: number;
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
      horas_acumuladas = horas_acumuladas + ${deltaInicial}
    WHERE id = ${id}`;
}
