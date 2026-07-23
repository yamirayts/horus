import { ESCENARIO, perfilBombas } from "@/lib/escenario";

export type Turno = "mañana" | "tarde" | "noche";

export type Evento = {
  dia: number; // 1..dias
  turno: Turno; // 'mañana' | 'tarde' | 'noche'
  accion: "activar" | "desactivar";
  equipoId: string; // 'VEN-07', 'MON-03', 'BIC-023'
  cama: number; // 1..14
};

const TURNOS: Turno[] = ["mañana", "tarde", "noche"];

/** Hash simple de un número a un entero de 32 bits (para semillar mulberry32). */
function hashSeed(seed: number): number {
  let h = seed | 0;
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h = (h ^ (h >>> 16)) >>> 0;
  return h;
}

/** PRNG determinístico mulberry32: mismo estado inicial → misma secuencia. */
function mulberry32(seed: number): () => number {
  let a = hashSeed(seed);
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Elige un elemento al azar de un array no vacío usando el PRNG dado. */
function elegir<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

/** Sortea la complejidad del paciente con pesos 30/50/20 (baja/media/alta). */
function sortearComplejidad(rand: () => number): "baja" | "media" | "alta" {
  const r = rand();
  if (r < 0.3) return "baja";
  if (r < 0.8) return "media";
  return "alta";
}

function idVentilador(n: number): string {
  return `VEN-${String(n).padStart(2, "0")}`;
}
function idMonitor(n: number): string {
  return `MON-${String(n).padStart(2, "0")}`;
}
function idBomba(n: number): string {
  return `BIC-${String(n).padStart(3, "0")}`;
}

type EstadoCama = { monitor: string; ventilador?: string; bombas: string[] };

/** Estado mutable del pool de equipos durante la generación del cronograma. */
class EstadoPool {
  bombasLibres: string[] = [];
  bombasEnUso = new Map<string, number>(); // equipoId -> cama
  ventiladoresLibres: string[] = [];
  ventiladoresEnUso = new Map<string, number>();
  monitoresLibres: string[] = [];
  monitoresEnUso = new Map<string, number>();
  camasOcupadas = new Map<number, EstadoCama>();
  camasLibres: number[];

  constructor() {
    for (let i = 1; i <= ESCENARIO.bombas; i++) this.bombasLibres.push(idBomba(i));
    for (let i = 1; i <= ESCENARIO.ventiladores; i++) this.ventiladoresLibres.push(idVentilador(i));
    for (let i = 1; i <= ESCENARIO.monitores; i++) this.monitoresLibres.push(idMonitor(i));
    this.camasLibres = [];
    for (let i = 1; i <= ESCENARIO.camas; i++) this.camasLibres.push(i);
  }
}

/**
 * Genera un cronograma determinístico de eventos de activación/desactivación
 * de equipos (monitores, ventiladores, bombas de infusión) a lo largo de
 * `dias` días, simulando ingresos/egresos de pacientes según el escenario
 * de referencia (ESCENARIO). Función pura: mismo (dias, seed) → mismo resultado.
 */
export function generarCronograma(dias: number, seed: number): Evento[] {
  const rand = mulberry32(seed);
  const pool = new EstadoPool();
  const eventos: Evento[] = [];

  // Ocupación inicial: llenamos camas hasta la ocupación esperada del escenario,
  // así hay actividad (egresos, cambios de bomba) desde el primer turno.
  const ocupacionInicial = Math.round(ESCENARIO.camas * ESCENARIO.ocupacion);
  for (let i = 0; i < ocupacionInicial; i++) {
    ingresarPaciente(pool, rand, eventos, 1, "mañana");
  }

  // Acumulador fraccionario de rotación de pacientes/día, repartido en 3 turnos.
  let acumuladorRotacion = 0;

  for (let dia = 1; dia <= dias; dia++) {
    for (const turno of TURNOS) {
      acumuladorRotacion += ESCENARIO.rotacionPacientesDia / TURNOS.length;
      // Cuántos "eventos de rotación" (ingreso o egreso) ocurren en este turno.
      const nEventosRotacion = Math.floor(acumuladorRotacion);
      acumuladorRotacion -= nEventosRotacion;

      for (let k = 0; k < nEventosRotacion; k++) {
        // Alternamos entre ingreso y egreso según disponibilidad y azar,
        // manteniendo la ocupación cerca del objetivo del escenario.
        const ocupacionActual = pool.camasOcupadas.size;
        const objetivo = ESCENARIO.camas * ESCENARIO.ocupacion;
        const puedeIngresar = pool.camasLibres.length > 0;
        const puedeEgresar = pool.camasOcupadas.size > 0;

        let hacerIngreso: boolean;
        if (puedeIngresar && !puedeEgresar) hacerIngreso = true;
        else if (!puedeIngresar && puedeEgresar) hacerIngreso = false;
        else if (!puedeIngresar && !puedeEgresar) continue;
        else hacerIngreso = ocupacionActual < objetivo ? rand() < 0.7 : rand() < 0.3;

        if (hacerIngreso) {
          ingresarPaciente(pool, rand, eventos, dia, turno);
        } else {
          egresarPaciente(pool, rand, eventos, dia, turno);
        }
      }

      // Cambios intra-estadía: a algunas camas ocupadas se les suma o retira
      // una bomba, respetando que las bombas no tienen memoria del paciente.
      aplicarCambiosDeBomba(pool, rand, eventos, dia, turno);
    }
  }

  return eventos;
}

function ingresarPaciente(
  pool: EstadoPool,
  rand: () => number,
  eventos: Evento[],
  dia: number,
  turno: Turno
): void {
  if (pool.camasLibres.length === 0) return;
  const idxCama = Math.floor(rand() * pool.camasLibres.length);
  const cama = pool.camasLibres[idxCama];
  pool.camasLibres.splice(idxCama, 1);

  const estado: EstadoCama = { monitor: "", bombas: [] };

  // Activar monitor de la cama.
  if (pool.monitoresLibres.length > 0) {
    const monitor = pool.monitoresLibres.shift()!;
    pool.monitoresEnUso.set(monitor, cama);
    estado.monitor = monitor;
    eventos.push({ dia, turno, accion: "activar", equipoId: monitor, cama });
  }

  // Decidir complejidad y activar bombas correspondientes.
  const complejidad = sortearComplejidad(rand);
  const nBombas = perfilBombas(complejidad);
  for (let i = 0; i < nBombas && pool.bombasLibres.length > 0; i++) {
    const idxBomba = Math.floor(rand() * pool.bombasLibres.length);
    const bomba = pool.bombasLibres[idxBomba];
    pool.bombasLibres.splice(idxBomba, 1);
    pool.bombasEnUso.set(bomba, cama);
    estado.bombas.push(bomba);
    eventos.push({ dia, turno, accion: "activar", equipoId: bomba, cama });
  }

  // Con probabilidad fraccionVentilados, activar un ventilador (si hay libre).
  if (rand() < ESCENARIO.fraccionVentilados && pool.ventiladoresLibres.length > 0) {
    const idxVen = Math.floor(rand() * pool.ventiladoresLibres.length);
    const ventilador = pool.ventiladoresLibres[idxVen];
    pool.ventiladoresLibres.splice(idxVen, 1);
    pool.ventiladoresEnUso.set(ventilador, cama);
    estado.ventilador = ventilador;
    eventos.push({ dia, turno, accion: "activar", equipoId: ventilador, cama });
  }

  pool.camasOcupadas.set(cama, estado);
}

function egresarPaciente(
  pool: EstadoPool,
  rand: () => number,
  eventos: Evento[],
  dia: number,
  turno: Turno
): void {
  const camas = Array.from(pool.camasOcupadas.keys());
  if (camas.length === 0) return;
  const cama = elegir(rand, camas);
  const estado = pool.camasOcupadas.get(cama)!;

  if (estado.monitor) {
    pool.monitoresEnUso.delete(estado.monitor);
    pool.monitoresLibres.push(estado.monitor);
    eventos.push({ dia, turno, accion: "desactivar", equipoId: estado.monitor, cama });
  }
  if (estado.ventilador) {
    pool.ventiladoresEnUso.delete(estado.ventilador);
    pool.ventiladoresLibres.push(estado.ventilador);
    eventos.push({ dia, turno, accion: "desactivar", equipoId: estado.ventilador, cama });
  }
  for (const bomba of estado.bombas) {
    pool.bombasEnUso.delete(bomba);
    pool.bombasLibres.push(bomba);
    eventos.push({ dia, turno, accion: "desactivar", equipoId: bomba, cama });
  }

  pool.camasOcupadas.delete(cama);
  pool.camasLibres.push(cama);
}

/**
 * Simula cambios de bomba intra-estadía: a algunas camas ocupadas se les
 * retira una bomba (vuelve al pool) o se les suma una bomba libre. No hay
 * memoria bomba-paciente: cualquier bomba libre puede asignarse a cualquiera.
 */
function aplicarCambiosDeBomba(
  pool: EstadoPool,
  rand: () => number,
  eventos: Evento[],
  dia: number,
  turno: Turno
): void {
  const camas = Array.from(pool.camasOcupadas.keys());
  for (const cama of camas) {
    // Baja probabilidad por cama y turno de que ocurra un cambio de bomba.
    if (rand() >= 0.15) continue;
    const estado = pool.camasOcupadas.get(cama)!;
    const retirar = estado.bombas.length > 0 && rand() < 0.5;

    if (retirar) {
      const idx = Math.floor(rand() * estado.bombas.length);
      const bomba = estado.bombas[idx];
      estado.bombas.splice(idx, 1);
      pool.bombasEnUso.delete(bomba);
      pool.bombasLibres.push(bomba);
      eventos.push({ dia, turno, accion: "desactivar", equipoId: bomba, cama });
    } else if (pool.bombasLibres.length > 0) {
      const idx = Math.floor(rand() * pool.bombasLibres.length);
      const bomba = pool.bombasLibres[idx];
      pool.bombasLibres.splice(idx, 1);
      pool.bombasEnUso.set(bomba, cama);
      estado.bombas.push(bomba);
      eventos.push({ dia, turno, accion: "activar", equipoId: bomba, cama });
    }
  }
}
