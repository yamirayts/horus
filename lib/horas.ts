/** Calcula las horas decimales entre inicio y fin, redondeadas a 2 decimales. */
export function calcularHorasCiclo(inicio: Date, fin: Date): number {
  const ms = fin.getTime() - inicio.getTime();
  if (ms < 0) throw new Error("fin no puede ser anterior a inicio");
  const horas = ms / (1000 * 60 * 60);
  return Math.round(horas * 100) / 100;
}
