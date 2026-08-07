import { listarEquipos, type Equipo } from "@/lib/db/equipos";
import { listarFallasDesde } from "@/lib/db/fallas";
import { sumarHorasPorEquipoDesde, iniciosDeCiclosAbiertos } from "@/lib/db/ciclos";
import { estadoAlerta, pctUmbral, type NivelAlerta } from "@/lib/alertas";
import { calcularTUE, clasificarTUE, calcularMTBF, proyeccionDiasHastaPM } from "@/lib/indicadores";
import { horasTotalesAhora } from "@/lib/horas";

// Período de TUE: últimos 30 días expresados en horas.
export const DIAS_PERIODO_TUE = 30;
export const HORAS_PERIODO_TUE = DIAS_PERIODO_TUE * 24;

export const TIPOS_EQUIPO = ["bomba_infusion", "monitor", "ventilador"] as const;
export type TipoEquipo = (typeof TIPOS_EQUIPO)[number];

export interface EquipoTablero extends Equipo {
  /** Horas totales al momento de la consulta = horas_acumuladas + tiempo del ciclo abierto si el equipo está en uso. */
  horasTotales: number;
  nivel: NivelAlerta;
  pct: number;
  enFalla: boolean;
  indicadores: {
    tue: number;
    tueClase: "sobreexigido" | "normal" | "subutilizado";
    horasUsoPeriodo: number;
    proyeccionDias: number | null;
  };
}

export interface ResumenTipo {
  total: number;
  disponible: number;
  en_uso: number;
  mantenimiento: number;
  horasAcumuladas: number;
}

export interface Tablero {
  resumen: Record<TipoEquipo, ResumenTipo>;
  alertas: EquipoTablero[];
  vencidos: EquipoTablero[];
  enFalla: EquipoTablero[];
  equipos: EquipoTablero[];
  mtbfPorTipo: Record<TipoEquipo, number | null>;
}

/**
 * Arma el resumen agregado del tablero de Ingeniería Clínica: nivel de alerta y % de
 * umbral por equipo, totales por tipo/estado, MTBF por tipo y TUE de los últimos 30 días.
 * Compartido por la página /tablero y el handler /api/tablero para no duplicar lógica.
 */
export async function construirTablero(): Promise<Tablero> {
  const desde = new Date(Date.now() - HORAS_PERIODO_TUE * 60 * 60 * 1000);
  const [equipos, fallas, horasUsoPorEquipo, ciclosAbiertos] = await Promise.all([
    listarEquipos(),
    listarFallasDesde(desde),
    sumarHorasPorEquipoDesde(desde),
    iniciosDeCiclosAbiertos(),
  ]);
  const ahora = new Date();

  const equipoPorId = new Map(equipos.map((e) => [e.id, e]));

  // Cantidad de fallas recientes (últimos 30 días, misma ventana que TUE) por equipo (flag enFalla) y por tipo (MTBF).
  const fallasPorEquipo = new Map<string, number>();
  const fallasPorTipo = new Map<string, number>();
  for (const f of fallas) {
    fallasPorEquipo.set(f.equipo_id, (fallasPorEquipo.get(f.equipo_id) ?? 0) + 1);
    const eq = equipoPorId.get(f.equipo_id);
    if (eq) fallasPorTipo.set(eq.tipo, (fallasPorTipo.get(eq.tipo) ?? 0) + 1);
  }

  const equiposConNivel: EquipoTablero[] = equipos.map((eq) => {
    const horasAcum = Number(eq.horas_acumuladas);
    const umbral = Number(eq.umbral_horas);
    const pctAlertaCfg = Number(eq.pct_alerta);
    const pctVencidoCfg = Number(eq.pct_vencido);

    // Horas "en vivo": suma el tiempo transcurrido del ciclo abierto si el equipo está en uso.
    // Sin esto, un equipo que cruza el umbral durante un ciclo largo no dispararía la alerta
    // hasta que el ciclo se cerrara — momento inadecuado en la práctica clínica.
    const inicioCicloAbierto = ciclosAbiertos[eq.id] ?? null;
    const horasTotales = horasTotalesAhora(horasAcum, inicioCicloAbierto, ahora);

    const nivel = estadoAlerta(horasTotales, umbral, pctAlertaCfg, pctVencidoCfg);
    const pct = pctUmbral(horasTotales, umbral);
    const enFalla = eq.estado === "mantenimiento" || (fallasPorEquipo.get(eq.id) ?? 0) > 0;

    // Para TUE incluimos las horas del ciclo abierto además de las cerradas en el período.
    const horasUsoPeriodo = (horasUsoPorEquipo[eq.id] ?? 0) + (inicioCicloAbierto
      ? Math.max(0, (ahora.getTime() - inicioCicloAbierto.getTime()) / (1000 * 60 * 60))
      : 0);
    const tue = calcularTUE(horasUsoPeriodo, HORAS_PERIODO_TUE);
    const horasPorDia = horasUsoPeriodo / DIAS_PERIODO_TUE;
    const proyeccionDias = proyeccionDiasHastaPM(horasTotales, umbral, pctAlertaCfg, horasPorDia);

    return {
      ...eq,
      horasTotales,
      nivel,
      pct,
      enFalla,
      indicadores: { tue, tueClase: clasificarTUE(tue), horasUsoPeriodo, proyeccionDias },
    };
  });

  // Más urgentes primero: mayor % de umbral consumido.
  equiposConNivel.sort((a, b) => b.pct - a.pct);

  const alertas = equiposConNivel.filter((e) => e.nivel === "aviso");
  const vencidos = equiposConNivel.filter((e) => e.nivel === "vencido");
  const enFalla = equiposConNivel.filter((e) => e.enFalla);

  const resumen = {} as Record<TipoEquipo, ResumenTipo>;
  const mtbfPorTipo = {} as Record<TipoEquipo, number | null>;
  for (const tipo of TIPOS_EQUIPO) {
    const delTipo = equiposConNivel.filter((e) => e.tipo === tipo);
    const r: ResumenTipo = { total: delTipo.length, disponible: 0, en_uso: 0, mantenimiento: 0, horasAcumuladas: 0 };
    for (const e of delTipo) {
      r[e.estado] += 1;
      // Sumar horas "en vivo" para que el resumen por tipo también refleje el estado actual.
      r.horasAcumuladas += e.horasTotales;
    }
    resumen[tipo] = r;
    // MTBF (últimos 30 días): incluye fallas sintéticas cargadas para pruebas — ver informe.
    mtbfPorTipo[tipo] = calcularMTBF(r.horasAcumuladas, fallasPorTipo.get(tipo) ?? 0);
  }

  return { resumen, alertas, vencidos, enFalla, equipos: equiposConNivel, mtbfPorTipo };
}
