import { describe, it, expect } from "vitest";
import { calcularHorasCiclo } from "@/lib/horas";

describe("calcularHorasCiclo", () => {
  it("2 horas exactas → 2.00", () => {
    const i = new Date("2026-07-16T10:00:00Z");
    const f = new Date("2026-07-16T12:00:00Z");
    expect(calcularHorasCiclo(i, f)).toBe(2);
  });
  it("90 minutos → 1.5", () => {
    const i = new Date("2026-07-16T10:00:00Z");
    const f = new Date("2026-07-16T11:30:00Z");
    expect(calcularHorasCiclo(i, f)).toBe(1.5);
  });
  it("redondea a 2 decimales", () => {
    const i = new Date("2026-07-16T10:00:00Z");
    const f = new Date("2026-07-16T10:20:00Z"); // 0.3333 h
    expect(calcularHorasCiclo(i, f)).toBe(0.33);
  });
  it("lanza si fin < inicio", () => {
    const i = new Date("2026-07-16T12:00:00Z");
    const f = new Date("2026-07-16T10:00:00Z");
    expect(() => calcularHorasCiclo(i, f)).toThrow();
  });
});
