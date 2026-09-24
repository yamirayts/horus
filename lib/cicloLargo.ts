/**
 * Regla de ciclo atípicamente largo: un equipo que figura "en uso" más tiempo del esperable
 * sugiere una activación sin su desactivación (olvido de escaneo al retirarlo).
 *
 * Umbrales por defecto derivados del escenario de referencia (Informe SATI-Q UCI Adultos 2025),
 * como aproximadamente el doble de la duración media del uso esperado:
 * - bombas de infusión y monitores: 14 días (estadía media en UTI: 6,03 días);
 * - ventiladores: 21 días (duración media del episodio con ARM invasiva: 9,20 días).
 * Cada equipo puede sobrescribir su umbral (equipos.umbral_ciclo_largo_dias).
 */
export const DIAS_CICLO_LARGO_POR_TIPO: Record<string, number> = {
  bomba_infusion: 14,
  monitor: 14,
  ventilador: 21,
};
/** Para tipos sin valor propio (el campo tipo es de texto libre). */
export const DIAS_CICLO_LARGO_DEFECTO = 14;

/** Umbral efectivo en días: el configurado en el equipo o, si no tiene, el de su tipo. */
export function umbralCicloLargoDias(tipo: string, configurado?: number | string | null): number {
  const n = configurado == null || configurado === "" ? NaN : Number(configurado);
  if (Number.isFinite(n) && n > 0) return n;
  return DIAS_CICLO_LARGO_POR_TIPO[tipo] ?? DIAS_CICLO_LARGO_DEFECTO;
}

/** Días (con un decimal) que lleva abierto un ciclo. */
export function diasAbierto(inicio: Date, ahora: Date = new Date()): number {
  const ms = Math.max(0, ahora.getTime() - inicio.getTime());
  return Math.floor((ms / 86_400_000) * 10) / 10;
}

/** true si el ciclo abierto superó el umbral de ciclo largo. */
export function esCicloLargo(inicio: Date | null, umbralDias: number, ahora: Date = new Date()): boolean {
  if (!inicio) return false;
  return ahora.getTime() - inicio.getTime() > umbralDias * 86_400_000;
}
