import { describe, it, expect } from "vitest";
import { contarFallasRecientes, contarFallasRecientesPorEquipo } from "@/lib/fallasRecientes";
import type { Falla } from "@/lib/db/fallas";

/**
 * Conteo de "fallas recientes" (dentro de la ventana de 30 días del tablero) que alimenta
 * el chip de la card de equipo y el banner del detalle. Lógica pura, sin base de datos.
 */

function falla(over: Partial<Falla>): Falla {
  return {
    id: 1, equipo_id: "X", fecha: "2026-08-15",
    tipo: "otra", descripcion: null, origen: "sintetico", ...over,
  };
}

describe("fallasRecientes", () => {
  const desde = new Date("2026-07-21T00:00:00Z"); // ~30 días antes de 2026-08-20

  it("contarFallasRecientesPorEquipo agrupa por equipo y excluye las previas a `desde`", () => {
    const fallas: Falla[] = [
      falla({ id: 1, equipo_id: "VEN-18", fecha: "2026-08-15" }),
      falla({ id: 2, equipo_id: "VEN-18", fecha: "2026-08-10" }),
      falla({ id: 3, equipo_id: "BIC-01", fecha: "2026-08-01" }),
      falla({ id: 4, equipo_id: "BIC-01", fecha: "2026-06-01" }), // fuera de ventana
    ];
    const m = contarFallasRecientesPorEquipo(fallas, desde);
    expect(m.get("VEN-18")).toBe(2);
    expect(m.get("BIC-01")).toBe(1);
  });

  it("contarFallasRecientes cuenta solo las fallas dentro de la ventana", () => {
    const fallas: Falla[] = [
      falla({ id: 1, fecha: "2026-08-15" }),
      falla({ id: 2, fecha: "2026-08-19" }),
      falla({ id: 3, fecha: "2026-05-01" }), // fuera de ventana
    ];
    expect(contarFallasRecientes(fallas, desde)).toBe(2);
  });

  it("sin fallas devuelve mapa vacío y cero", () => {
    expect(contarFallasRecientesPorEquipo([], desde).size).toBe(0);
    expect(contarFallasRecientes([], desde)).toBe(0);
  });
});
