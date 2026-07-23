import { sql } from "./client";
import { cerrarCicloAbiertoTx } from "./ciclos";

export interface NuevoMantenimiento {
  equipo_id: string; tipo?: string; descripcion?: string; tecnico?: string;
}

export interface Mantenimiento {
  id: number; equipo_id: string; fecha: string; tipo: string | null;
  descripcion: string | null; horas_al_momento: number | string | null; tecnico: string | null;
}

export async function registrarMantenimiento(m: NuevoMantenimiento): Promise<void> {
  await sql.begin(async (tx) => {
    const eq = await tx<{ horas_acumuladas: number | string }[]>`
      SELECT horas_acumuladas FROM equipos WHERE id = ${m.equipo_id}`;
    let horas = Number(eq[0]?.horas_acumuladas ?? 0);

    // Si el equipo estaba en uso, cerrar el ciclo abierto y sumar esas horas antes de
    // registrar horas_al_momento y resetear el acumulado: de lo contrario el ciclo queda
    // huérfano (fin NULL) y las horas del uso en curso se pierden del historial.
    const horasCiclo = await cerrarCicloAbiertoTx(tx, m.equipo_id);
    if (horasCiclo !== null) horas += horasCiclo;

    await tx`INSERT INTO mantenimientos (equipo_id, tipo, descripcion, horas_al_momento, tecnico)
             VALUES (${m.equipo_id}, ${m.tipo ?? null}, ${m.descripcion ?? null}, ${horas}, ${m.tecnico ?? null})`;
    await tx`UPDATE equipos SET horas_acumuladas = 0, horas_iniciales = 0, estado = 'disponible'
             WHERE id = ${m.equipo_id}`;
  });
}

/** Mantenimientos de un equipo, más recientes primero. */
export async function listarMantenimientos(equipoId: string): Promise<Mantenimiento[]> {
  return sql<Mantenimiento[]>`SELECT * FROM mantenimientos WHERE equipo_id = ${equipoId} ORDER BY fecha DESC`;
}
