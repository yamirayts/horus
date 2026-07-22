/**
 * Redondea a 2 decimales, corrigiendo el ruido de punto flotante que introducen
 * las restas de literales decimales (ej. 100.005 - 100 da 0.0049999999999954525
 * en JS, que un Math.round ingenuo redondearía para abajo en vez de a 0.01).
 */
function round2(n: number): number {
  return Math.round(Number(n.toPrecision(10)) * 100) / 100;
}

/**
 * Desvío entre las horas calculadas por el sistema (QR) y la lectura del
 * horómetro interno del equipo, que actúa como patrón de contraste.
 */
export function calcularDesvio(
  horasQr: number, horasHorometro: number
): { absoluto: number; porcentual: number | null } {
  const absoluto = round2(horasQr - horasHorometro);
  const porcentual = horasHorometro === 0 ? null : round2((absoluto / horasHorometro) * 100);
  return { absoluto, porcentual };
}
