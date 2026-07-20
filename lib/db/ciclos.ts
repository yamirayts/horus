import { sql } from "./client";
import { calcularHorasCiclo } from "@/lib/horas";

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
