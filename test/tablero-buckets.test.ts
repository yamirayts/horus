import { describe, it, expect, vi } from "vitest";
import type { Equipo } from "@/lib/db/equipos";
import type { Falla } from "@/lib/db/fallas";

/**
 * El tablero debe distinguir dos poblaciones que antes se mezclaban en una sola
 * tarjeta "En falla o mantenimiento":
 *   - enMantenimiento: equipos con estado = 'mantenimiento' (fuera de servicio).
 *   - conFallas: equipos con al menos una falla en la ventana de 30 días
 *     (incluye las fallas sintéticas del MTBF), sin importar su estado.
 *
 * El bug: la tarjeta contaba (mantenimiento OR falla reciente) pero enlazaba solo
 * a estado=mantenimiento, así que una falla sintética inflaba el número sin
 * aparecer nunca en la lista filtrada. Se mockean los módulos de DB para probar
 * el bucketing puro de construirTablero sin una base real.
 */

function equipoFalso(over: Partial<Equipo>): Equipo {
  return {
    id: "X", tipo: "bomba_infusion", marca: null, modelo: null, numero_serie: null,
    fecha_alta: "2026-01-01", umbral_horas: 1000, pct_alerta: 0.8, pct_vencido: 1.0,
    horas_acumuladas: 0, horas_iniciales: 0, estado: "disponible", ubicacion: null,
    activo: true, fecha_baja: null, motivo_baja: null, ...over,
  };
}

const equipos: Equipo[] = [
  equipoFalso({ id: "MANT-01", estado: "mantenimiento" }), // fuera de servicio, sin fallas
  equipoFalso({ id: "FALLA-01", estado: "disponible" }),   // falla sintética, sigue disponible
  equipoFalso({ id: "OK-01", estado: "en_uso" }),          // ni una cosa ni la otra
];

const fallas: Falla[] = [
  { id: 1, equipo_id: "FALLA-01", fecha: "2026-08-15", tipo: "otra", descripcion: null, origen: "sintetico" },
];

vi.mock("@/lib/db/equipos", () => ({ listarEquipos: async () => equipos }));
vi.mock("@/lib/db/fallas", () => ({ listarFallasDesde: async () => fallas }));
vi.mock("@/lib/db/ciclos", () => ({
  sumarHorasPorEquipoDesde: async () => ({}),
  iniciosDeCiclosAbiertos: async () => ({}),
}));

describe("construirTablero — buckets separados de mantenimiento y fallas", () => {
  it("enMantenimiento solo lista equipos en estado mantenimiento", async () => {
    const { construirTablero } = await import("@/lib/tablero");
    const t = await construirTablero();
    expect(t.enMantenimiento.map((e) => e.id)).toEqual(["MANT-01"]);
  });

  it("conFallas lista equipos con falla reciente aunque no estén en mantenimiento", async () => {
    const { construirTablero } = await import("@/lib/tablero");
    const t = await construirTablero();
    expect(t.conFallas.map((e) => e.id)).toEqual(["FALLA-01"]);
  });

  it("un equipo con falla sintética no aparece como en mantenimiento", async () => {
    const { construirTablero } = await import("@/lib/tablero");
    const t = await construirTablero();
    expect(t.enMantenimiento.map((e) => e.id)).not.toContain("FALLA-01");
  });
});
