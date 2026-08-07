/** Calcula las horas decimales entre inicio y fin, redondeadas a 2 decimales. */
export function calcularHorasCiclo(inicio: Date, fin: Date): number {
  const ms = fin.getTime() - inicio.getTime();
  if (ms < 0) throw new Error("fin no puede ser anterior a inicio");
  const horas = ms / (1000 * 60 * 60);
  return Math.round(horas * 100) / 100;
}

/**
 * Horas transcurridas desde el inicio del ciclo hasta el momento actual.
 * Se usa para calcular las horas acumuladas "en vivo" mientras un ciclo
 * está abierto (equipo en uso), sin tener que esperar a que se cierre.
 * Devuelve 0 si el instante actual es anterior al inicio (defensa contra clocks desfasados).
 */
export function horasEnCurso(inicioCiclo: Date, ahora: Date = new Date()): number {
  const ms = ahora.getTime() - inicioCiclo.getTime();
  if (ms <= 0) return 0;
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
}

/**
 * Horas totales del equipo al momento de la consulta: horas acumuladas de ciclos
 * ya cerrados MÁS las horas del ciclo actualmente abierto (si el equipo está en uso).
 * Este es el valor que debe alimentar las alertas en tiempo real: un equipo que
 * cruza el umbral durante un ciclo largo debe dispararlas en el instante, no al
 * cerrar el ciclo.
 */
export function horasTotalesAhora(
  horasAcumuladas: number,
  cicloAbiertoInicio: Date | null,
  ahora: Date = new Date(),
): number {
  if (!cicloAbiertoInicio) return horasAcumuladas;
  const totalMs =
    horasAcumuladas * 60 * 60 * 1000 + Math.max(0, ahora.getTime() - cicloAbiertoInicio.getTime());
  return Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100;
}
