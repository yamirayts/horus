import { describe, it, expect } from "vitest";
import { umbralCicloLargoDias, esCicloLargo, diasAbierto } from "@/lib/cicloLargo";

const AHORA = new Date("2026-09-24T12:00:00Z");
const hace = (dias: number) => new Date(AHORA.getTime() - dias * 86_400_000);

describe("umbralCicloLargoDias", () => {
  it("usa el valor por tipo cuando el equipo no tiene uno propio", () => {
    expect(umbralCicloLargoDias("bomba_infusion", null)).toBe(14);
    expect(umbralCicloLargoDias("monitor", undefined)).toBe(14);
    expect(umbralCicloLargoDias("ventilador", null)).toBe(21);
  });
  it("usa el valor por defecto para tipos sin valor propio", () => {
    expect(umbralCicloLargoDias("bomba_enteral", null)).toBe(14);
  });
  it("respeta el valor configurado en el equipo (NUMERIC llega como string)", () => {
    expect(umbralCicloLargoDias("ventilador", "30")).toBe(30);
    expect(umbralCicloLargoDias("bomba_infusion", 3)).toBe(3);
  });
  it("ignora valores configurados inválidos", () => {
    expect(umbralCicloLargoDias("ventilador", 0)).toBe(21);
    expect(umbralCicloLargoDias("ventilador", "")).toBe(21);
    expect(umbralCicloLargoDias("ventilador", "abc")).toBe(21);
  });
});

describe("esCicloLargo", () => {
  it("sin ciclo abierto nunca es largo", () => {
    expect(esCicloLargo(null, 14, AHORA)).toBe(false);
  });
  it("por debajo o en el umbral no es largo", () => {
    expect(esCicloLargo(hace(13.9), 14, AHORA)).toBe(false);
    expect(esCicloLargo(hace(14), 14, AHORA)).toBe(false);
  });
  it("por encima del umbral es largo", () => {
    expect(esCicloLargo(hace(14.1), 14, AHORA)).toBe(true);
  });
});

describe("diasAbierto", () => {
  it("redondea hacia abajo a un decimal", () => {
    expect(diasAbierto(hace(3.27), AHORA)).toBe(3.2);
  });
  it("nunca es negativo", () => {
    expect(diasAbierto(hace(-1), AHORA)).toBe(0);
  });
});
