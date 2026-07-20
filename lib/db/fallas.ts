import { sql } from "./client";

export interface Falla {
  id: number; equipo_id: string; fecha: string;
  tipo: string | null; descripcion: string | null; origen: "real" | "sintetico";
}
export interface NuevaFalla {
  equipo_id: string; tipo?: string; descripcion?: string;
  origen?: "real" | "sintetico"; fecha?: Date; ponerEnMantenimiento?: boolean;
}

export async function registrarFalla(f: NuevaFalla): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`INSERT INTO fallas (equipo_id, tipo, descripcion, origen, fecha)
             VALUES (${f.equipo_id}, ${f.tipo ?? null}, ${f.descripcion ?? null},
                     ${f.origen ?? "real"}, ${f.fecha ?? new Date()})`;
    if (f.ponerEnMantenimiento) {
      await tx`UPDATE equipos SET estado = 'mantenimiento' WHERE id = ${f.equipo_id}`;
    }
  });
}

export async function listarFallas(equipoId?: string): Promise<Falla[]> {
  if (equipoId) return sql<Falla[]>`SELECT * FROM fallas WHERE equipo_id = ${equipoId} ORDER BY fecha DESC`;
  return sql<Falla[]>`SELECT * FROM fallas ORDER BY fecha DESC`;
}

/** Fallas recientes (fecha >= desde), para MTBF y bucket "en falla" del tablero (misma ventana que TUE). */
export async function listarFallasDesde(desde: Date): Promise<Falla[]> {
  return sql<Falla[]>`SELECT * FROM fallas WHERE fecha >= ${desde} ORDER BY fecha DESC`;
}
