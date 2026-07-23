/**
 * Exportador del cronograma de ejecución (Tarea 5.3).
 *
 * Llama a `generarCronograma` (lib/cronograma.ts) con una semilla fija para
 * que el resultado sea reproducible entre corridas, y vuelca el resultado en
 * dos formatos dentro de `tfi/`:
 *   - cronograma.md  → libreto legible/imprimible, agrupado por día → turno.
 *   - cronograma.csv → mismos eventos en formato tabular (una fila por evento).
 *
 * También (re)genera `tfi/planilla-registro.csv`, la planilla vacía donde se
 * vuelcan a mano los resultados de las 4 etapas del protocolo (Fase 5 del
 * spec) durante la ejecución de la prueba de concepto.
 *
 * Uso: npm run cronograma
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { generarCronograma, Evento, Turno } from "../lib/cronograma";

// Semilla fija: cualquier valor sirve, lo importante es que quede documentado
// y no cambie. 42 es el mismo valor usado en test/cronograma.test.ts.
const SEED = 42;
const DIAS = 14;

const TURNOS: Turno[] = ["mañana", "tarde", "noche"];

const DIR_SALIDA = path.join(__dirname, "..", "tfi");

/** Devuelve el prefijo de tipo de un ID de equipo ('BIC-023' → 'BIC'). */
function prefijo(equipoId: string): string {
  return equipoId.split("-")[0];
}

/**
 * Agrupa los eventos de un turno por (acción, cama, tipo de equipo) para
 * poder imprimir "ACTIVAR BIC-023, BIC-045, BIC-011 (cama 7)" en vez de una
 * línea por bomba. Se preserva el orden de aparición: como los eventos ya
 * vienen ordenados (monitor, luego bombas, luego ventilador al ingresar; o
 * monitor, ventilador, bombas al egresar), cada grupo queda contiguo.
 */
function agruparEventos(eventos: Evento[]): { accion: string; cama: number; ids: string[] }[] {
  const grupos: { clave: string; accion: string; cama: number; ids: string[] }[] = [];
  const indicePorClave = new Map<string, number>();

  for (const e of eventos) {
    const clave = `${e.accion}|${e.cama}|${prefijo(e.equipoId)}`;
    const idx = indicePorClave.get(clave);
    if (idx === undefined) {
      indicePorClave.set(clave, grupos.length);
      grupos.push({ clave, accion: e.accion, cama: e.cama, ids: [e.equipoId] });
    } else {
      grupos[idx].ids.push(e.equipoId);
    }
  }

  return grupos;
}

/** Arma el contenido completo de tfi/cronograma.md. */
function generarMarkdown(eventos: Evento[]): string {
  const lineas: string[] = [];
  lineas.push(`# Cronograma de ejecución — Protocolo de carga dinámica (${DIAS} días)`);
  lineas.push("");
  lineas.push(`> Generado con seed=${SEED} desde el escenario SATI-Q 2025. Determinístico y reproducible.`);
  lineas.push("> Este archivo es tu libreto diario para las 2 semanas de prueba.");
  lineas.push("");

  for (let dia = 1; dia <= DIAS; dia++) {
    lineas.push(`## Día ${dia}`);
    lineas.push("");

    for (const turno of TURNOS) {
      lineas.push(`### Turno ${turno}`);
      lineas.push("");

      const eventosTurno = eventos.filter((e) => e.dia === dia && e.turno === turno);
      if (eventosTurno.length === 0) {
        lineas.push("- (sin eventos)");
      } else {
        for (const grupo of agruparEventos(eventosTurno)) {
          const accionTxt = grupo.accion.toUpperCase();
          lineas.push(`- ${accionTxt} ${grupo.ids.join(", ")} (cama ${grupo.cama})`);
        }
      }
      lineas.push("");
    }
  }

  return lineas.join("\n").trimEnd() + "\n";
}

/** Arma el contenido completo de tfi/cronograma.csv. */
function generarCsv(eventos: Evento[]): string {
  const filas = ["dia,turno,accion,equipoId,cama"];
  for (const e of eventos) {
    filas.push(`${e.dia},${e.turno},${e.accion},${e.equipoId},${e.cama}`);
  }
  return filas.join("\n") + "\n";
}

/**
 * Filas guía de la planilla de registro: una por métrica a completar durante
 * cada etapa del protocolo (spec §9, Fase 5). `valorObtenido` y `observacion`
 * quedan vacíos: se llenan a mano durante la ejecución real de la prueba.
 * `valorEsperado` es el criterio de referencia con el que se compara.
 */
const FILAS_PLANILLA: { etapa: string; metrica: string; valorEsperado: string }[] = [
  // Etapa 2 — Carga dinámica (días 1-14).
  { etapa: "2", metrica: "tasa de lectura correcta del QR (% escaneos exitosos)", valorEsperado: "≥95%" },
  { etapa: "2", metrica: "duración media del escaneo (segundos)", valorEsperado: "≤3 s" },
  { etapa: "2", metrica: "errores por condición de luz", valorEsperado: "0 en luz adecuada" },
  // Etapa 3 — Red y persistencia (días 3, 7, 11).
  { etapa: "3", metrica: "registros perdidos por corte de red", valorEsperado: "0 (reintento automático por diseño)" },
  { etapa: "3", metrica: "latencia de sincronización (ms)", valorEsperado: "<2000 ms" },
  { etapa: "3", metrica: "exactitud de acumulación de horas (diferencia horas-QR vs tiempo real)", valorEsperado: "≈0 (redondeo de minutos)" },
  // Etapa 4 — Stress y alertas (días 12-13).
  { etapa: "4", metrica: "alerta AMP disparada al 80% (sí/no)", valorEsperado: "sí (pct_alerta=0.800)" },
  { etapa: "4", metrica: "umbral en horas al momento del disparo", valorEsperado: "umbral_horas × 0.800 del equipo" },
  { etapa: "4", metrica: "MTBF calculado con fallas sintéticas", valorEsperado: "calculable (dato sintético, no representa confiabilidad real)" },
];

/** Arma el contenido completo de tfi/planilla-registro.csv. */
function generarPlanilla(): string {
  const filas = ["etapa,fecha,metrica,valor_esperado,valor_obtenido,observacion"];
  for (const f of FILAS_PLANILLA) {
    // fecha, valor_obtenido y observacion se completan a mano durante la prueba.
    filas.push(`${f.etapa},,"${f.metrica}","${f.valorEsperado}",,`);
  }
  return filas.join("\n") + "\n";
}

function main(): void {
  mkdirSync(DIR_SALIDA, { recursive: true });

  const eventos = generarCronograma(DIAS, SEED);

  const rutaMd = path.join(DIR_SALIDA, "cronograma.md");
  const rutaCsv = path.join(DIR_SALIDA, "cronograma.csv");
  const rutaPlanilla = path.join(DIR_SALIDA, "planilla-registro.csv");

  writeFileSync(rutaMd, generarMarkdown(eventos), "utf8");
  writeFileSync(rutaCsv, generarCsv(eventos), "utf8");
  writeFileSync(rutaPlanilla, generarPlanilla(), "utf8");

  console.log(`Cronograma generado (seed=${SEED}, ${DIAS} días, ${eventos.length} eventos):`);
  console.log(`  ${rutaMd}`);
  console.log(`  ${rutaCsv}`);
  console.log(`  ${rutaPlanilla}`);
}

main();
