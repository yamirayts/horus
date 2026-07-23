import { sql } from "./client";
import { cerrarCicloAbiertoTx } from "./ciclos";

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
    if (!f.ponerEnMantenimiento) return;

    // Si el equipo estaba en uso, cerrar el ciclo abierto ANTES de pasarlo a mantenimiento:
    // la falla se detectó en pleno uso, esas horas cuentan y el ciclo no debe quedar huérfano
    // (fin NULL para siempre).
    const eq = await tx<{ estado: string }[]>`SELECT estado FROM equipos WHERE id = ${f.equipo_id}`;
    let horasCiclo = 0;
    if (eq[0]?.estado === "en_uso") {
      horasCiclo = (await cerrarCicloAbiertoTx(tx, f.equipo_id, f.fecha ?? new Date())) ?? 0;
    }
    await tx`UPDATE equipos SET estado = 'mantenimiento',
             horas_acumuladas = horas_acumuladas + ${horasCiclo} WHERE id = ${f.equipo_id}`;
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
