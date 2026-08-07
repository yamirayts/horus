import { describe, it, expect } from "vitest";
import { calcularHorasCiclo, horasEnCurso, horasTotalesAhora } from "@/lib/horas";

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

describe("horasEnCurso", () => {
  it("2 horas desde el inicio → 2.00", () => {
    const inicio = new Date("2026-07-16T10:00:00Z");
    const ahora = new Date("2026-07-16T12:00:00Z");
    expect(horasEnCurso(inicio, ahora)).toBe(2);
  });
  it("30 minutos → 0.5", () => {
    const inicio = new Date("2026-07-16T10:00:00Z");
    const ahora = new Date("2026-07-16T10:30:00Z");
    expect(horasEnCurso(inicio, ahora)).toBe(0.5);
  });
  it("no negativo si ahora < inicio (reloj desfasado): devuelve 0", () => {
    const inicio = new Date("2026-07-16T12:00:00Z");
    const ahora = new Date("2026-07-16T10:00:00Z");
    expect(horasEnCurso(inicio, ahora)).toBe(0);
  });
});

describe("horasTotalesAhora", () => {
  it("sin ciclo abierto: devuelve las horas acumuladas tal cual", () => {
    expect(horasTotalesAhora(4980, null)).toBe(4980);
  });
  it("con ciclo abierto sumadas al acumulado", () => {
    const inicio = new Date("2026-07-16T10:00:00Z");
    const ahora = new Date("2026-07-16T12:00:00Z");
    // 4990 + 2h en curso = 4992
    expect(horasTotalesAhora(4990, inicio, ahora)).toBe(4992);
  });
  it("acumulado + ciclo abierto redondea a 2 decimales", () => {
    const inicio = new Date("2026-07-16T10:00:00Z");
    const ahora = new Date("2026-07-16T10:20:00Z"); // 0.3333 h
    expect(horasTotalesAhora(100, inicio, ahora)).toBe(100.33);
  });
});
