const ZONA_AR = "America/Argentina/Buenos_Aires";

/**
 * Formatea un instante en hora de Argentina (es-AR, 24 h). Acepta Date, ISO string o epoch.
 * - `timeZone`: el formateo corre en el servidor (SSR), cuyo huso puede no ser el de Argentina;
 *   sin esto los horarios de ciclos/mantenimientos/fallas se mostraban corridos.
 * - `hour12: false`: en varias versiones de ICU el locale es-AR se renderiza en 12 h y omite el
 *   AM/PM, de modo que las 19:44 se mostraban como "07:44". Forzar 24 h corrige ese corrimiento.
 */
export function fechaHoraAR(v: string | number | Date): string {
  return new Date(v).toLocaleString("es-AR", { timeZone: ZONA_AR, hour12: false });
}
