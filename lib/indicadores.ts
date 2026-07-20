export function calcularTUE(horasUsoPeriodo: number, horasPeriodo: number): number {
  if (horasPeriodo <= 0) return 0;
  return Math.round((horasUsoPeriodo / horasPeriodo) * 1000) / 10;
}

export function clasificarTUE(tue: number): "sobreexigido" | "normal" | "subutilizado" {
  if (tue >= 85) return "sobreexigido";
  if (tue <= 30) return "subutilizado";
  return "normal";
}

/** MTBF = horas de operación / cantidad de fallas. null si no hay fallas. */
export function calcularMTBF(horasOperacion: number, cantidadFallas: number): number | null {
  if (cantidadFallas <= 0) return null;
  return Math.round((horasOperacion / cantidadFallas) * 100) / 100;
}

/** Días estimados hasta alcanzar el umbral de aviso, al ritmo de horasPorDia. */
export function proyeccionDiasHastaPM(
  horasAcum: number, umbral: number, pctAlerta: number, horasPorDia: number
): number | null {
  if (horasPorDia <= 0) return null;
  const objetivo = umbral * pctAlerta;
  const faltan = objetivo - horasAcum;
  if (faltan <= 0) return 0;
  return Math.round((faltan / horasPorDia) * 10) / 10;
}
