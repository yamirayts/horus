import { describe, it, expect } from "vitest";
import { calcularDesvio } from "@/lib/horometro";

describe("calcularDesvio", () => {
  it("QR mide de más → desvío positivo", () => {
    expect(calcularDesvio(105, 100)).toEqual({ absoluto: 5, porcentual: 5 });
  });
  it("QR mide de menos → desvío negativo", () => {
    expect(calcularDesvio(95, 100)).toEqual({ absoluto: -5, porcentual: -5 });
  });
  it("coincidencia exacta → cero", () => {
    expect(calcularDesvio(100, 100)).toEqual({ absoluto: 0, porcentual: 0 });
  });
  it("horómetro en 0 → porcentual null", () => {
    expect(calcularDesvio(10, 0)).toEqual({ absoluto: 10, porcentual: null });
  });
  it("redondea a 2 decimales", () => {
    expect(calcularDesvio(100.005, 100).absoluto).toBe(0.01);
  });
});
