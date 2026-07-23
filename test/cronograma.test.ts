import { describe, it, expect } from "vitest";
import { generarCronograma, Evento } from "@/lib/cronograma";

function validarCoherencia(eventos: Evento[]) {
  const enUso = new Set<string>();
  for (const e of eventos) {
    if (e.accion === "activar") {
      expect(enUso.has(e.equipoId)).toBe(false); // no activar algo ya en uso
      enUso.add(e.equipoId);
    } else {
      expect(enUso.has(e.equipoId)).toBe(true);  // no desactivar algo libre
      enUso.delete(e.equipoId);
    }
  }
}

describe("generarCronograma", () => {
  it("es coherente con el estado del pool", () => {
    validarCoherencia(generarCronograma(14, 42));
  });
  it("es determinístico por seed", () => {
    expect(generarCronograma(14, 42)).toEqual(generarCronograma(14, 42));
  });
  it("distribuye entre muchas bombas (no siempre la misma)", () => {
    const eventos = generarCronograma(14, 42);
    const bombas = new Set(eventos.filter(e => e.equipoId.startsWith("BIC")).map(e => e.equipoId));
    expect(bombas.size).toBeGreaterThan(20); // usa muchas bombas distintas
  });
  it("genera un volumen razonable de escaneos", () => {
    const eventos = generarCronograma(14, 42);
    const porDia = eventos.length / 14;
    expect(porDia).toBeGreaterThan(20);
    expect(porDia).toBeLessThan(120);
  });
});
