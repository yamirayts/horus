/**
 * Reglas puras para dos situaciones en que el instante de un evento no coincide con el
 * momento en que llega al servidor:
 *
 * 1. Escaneos encolados sin conexión. El cliente informa cuánto tiempo estuvo esperando el
 *    envío (demora) y el servidor la resta a SU propia hora. Así la hora registrada es la del
 *    escaneo, sin depender del reloj del celular (que puede estar desfasado).
 *
 * 2. Correcciones manuales de Ingeniería Clínica ante un olvido de escaneo: activar con hora
 *    pasada, cerrar el ciclo abierto con hora pasada, o cargar un ciclo completo.
 */

/** Demora máxima aceptada para un escaneo encolado (72 h). Más allá, se usa el tope. */
export const DEMORA_MAXIMA_MS = 72 * 60 * 60 * 1000;

/**
 * Instante real de un escaneo a partir de la hora del servidor y la demora que informa el
 * cliente. Nunca devuelve un instante anterior a `limiteInferior` (el último evento del
 * equipo), para no generar ciclos superpuestos ni de duración negativa.
 */
export function momentoDelEscaneo(ahora: Date, demoraMs: unknown, limiteInferior?: Date | null): Date {
  const d = typeof demoraMs === "number" && Number.isFinite(demoraMs) && demoraMs > 0
    ? Math.min(demoraMs, DEMORA_MAXIMA_MS)
    : 0;
  const t = ahora.getTime() - d;
  if (limiteInferior && t < limiteInferior.getTime()) return new Date(limiteInferior);
  return new Date(t);
}

export type AccionCorreccion = "activar" | "cerrar" | "ciclo";

export interface Correccion {
  accion: AccionCorreccion;
  inicio?: Date | null;
  fin?: Date | null;
  motivo: string;
  /** Cama del ciclo; obligatoria al activar o cargar un ciclo completo. */
  ubicacion?: string | null;
  ahora: Date;
  /** Último evento del equipo (fin del último ciclo o último mantenimiento). */
  limiteInferior: Date | null;
  /** Inicio del ciclo abierto, si el equipo está en uso. */
  inicioAbierto: Date | null;
}

const esFecha = (d: Date | null | undefined): d is Date => d instanceof Date && !Number.isNaN(d.getTime());

/** Devuelve un mensaje de error legible, o null si la corrección es válida. */
export function validarCorreccion(c: Correccion): string | null {
  if (!c.motivo || !c.motivo.trim()) return "Indicá el motivo de la corrección.";
  const ahora = c.ahora.getTime();
  const anteriorAlLimite = (d: Date) => c.limiteInferior != null && d.getTime() < c.limiteInferior.getTime();

  if (c.accion === "cerrar") {
    if (!c.inicioAbierto) return "El equipo no está en uso: no hay ciclo abierto para cerrar.";
    if (!esFecha(c.fin)) return "Falta la fecha y hora de fin.";
    if (c.fin.getTime() > ahora) return "La hora de fin no puede ser futura.";
    if (c.fin.getTime() < c.inicioAbierto.getTime()) return "La hora de fin es anterior al inicio del ciclo abierto.";
    return null;
  }

  if (c.inicioAbierto) return "El equipo está en uso: primero cerrá el ciclo abierto.";
  if (!c.ubicacion || !c.ubicacion.trim()) return "Indicá la cama.";
  if (!esFecha(c.inicio)) return "Falta la fecha y hora de inicio.";
  if (c.inicio.getTime() > ahora) return "La hora de inicio no puede ser futura.";
  if (anteriorAlLimite(c.inicio)) return "La hora de inicio es anterior al último evento registrado del equipo.";

  if (c.accion === "ciclo") {
    if (!esFecha(c.fin)) return "Falta la fecha y hora de fin.";
    if (c.fin.getTime() > ahora) return "La hora de fin no puede ser futura.";
    if (c.fin.getTime() <= c.inicio.getTime()) return "La hora de fin debe ser posterior a la de inicio.";
  }
  return null;
}
