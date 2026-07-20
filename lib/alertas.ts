export type EstadoEquipo = "disponible" | "en_uso" | "mantenimiento";
export type NivelAlerta = "ok" | "aviso" | "vencido";
export type Accion = "activar" | "desactivar" | "bloqueado";

/** Nivel de alerta según horas acumuladas y umbrales configurables. */
export function estadoAlerta(
  horasAcum: number, umbral: number, pctAlerta: number, pctVencido: number
): NivelAlerta {
  if (horasAcum >= umbral * pctVencido) return "vencido";
  if (horasAcum >= umbral * pctAlerta) return "aviso";
  return "ok";
}

/** Un mismo escaneo funciona como conmutador (toggle). */
export function decidirAccion(estado: EstadoEquipo): Accion {
  if (estado === "disponible") return "activar";
  if (estado === "en_uso") return "desactivar";
  return "bloqueado";
}

/** Porcentaje del umbral consumido (1 decimal). */
export function pctUmbral(horasAcum: number, umbral: number): number {
  if (umbral <= 0) return 0;
  return Math.round((horasAcum / umbral) * 1000) / 10;
}
