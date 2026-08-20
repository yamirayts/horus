import type { Falla } from "@/lib/db/fallas";

/**
 * Helpers de "fallas recientes": fallas con fecha >= `desde` (la ventana de 30 días que usa
 * el tablero). Alimentan el chip de la card de equipo y el banner del detalle. Filtran por
 * fecha además de agrupar, para ser robustos aunque reciban una lista sin pre-filtrar (p. ej.
 * `listarFallas` del detalle, que trae todo el historial del equipo).
 */

/** Cantidad de fallas recientes por equipo, para marcar cada card del listado. */
export function contarFallasRecientesPorEquipo(fallas: Falla[], desde: Date): Map<string, number> {
  const conteo = new Map<string, number>();
  for (const f of fallas) {
    if (new Date(f.fecha) >= desde) {
      conteo.set(f.equipo_id, (conteo.get(f.equipo_id) ?? 0) + 1);
    }
  }
  return conteo;
}

/** Cantidad de fallas recientes en una lista (de un solo equipo), para el banner del detalle. */
export function contarFallasRecientes(fallas: Falla[], desde: Date): number {
  return fallas.reduce((n, f) => (new Date(f.fecha) >= desde ? n + 1 : n), 0);
}
