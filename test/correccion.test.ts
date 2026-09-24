import { describe, it, expect } from "vitest";
import { momentoDelEscaneo, validarCorreccion, DEMORA_MAXIMA_MS } from "@/lib/correccion";

const AHORA = new Date("2026-09-23T15:00:00Z");
const h = (horas: number) => new Date(AHORA.getTime() - horas * 60 * 60 * 1000);

describe("momentoDelEscaneo", () => {
  it("sin demora usa la hora del servidor", () => {
    expect(momentoDelEscaneo(AHORA, undefined)).toEqual(AHORA);
    expect(momentoDelEscaneo(AHORA, 0)).toEqual(AHORA);
  });
  it("resta la demora informada por el cliente", () => {
    expect(momentoDelEscaneo(AHORA, 20 * 60 * 1000)).toEqual(h(20 / 60));
  });
  it("ignora demoras inválidas o negativas", () => {
    expect(momentoDelEscaneo(AHORA, -5000)).toEqual(AHORA);
    expect(momentoDelEscaneo(AHORA, "abc")).toEqual(AHORA);
    expect(momentoDelEscaneo(AHORA, Number.NaN)).toEqual(AHORA);
  });
  it("acota la demora al máximo permitido", () => {
    expect(momentoDelEscaneo(AHORA, DEMORA_MAXIMA_MS * 10)).toEqual(
      new Date(AHORA.getTime() - DEMORA_MAXIMA_MS),
    );
  });
  it("nunca queda antes del límite (último evento del equipo)", () => {
    const limite = h(0.1);
    expect(momentoDelEscaneo(AHORA, 60 * 60 * 1000, limite)).toEqual(limite);
  });
});

describe("validarCorreccion", () => {
  const base = { ahora: AHORA, limiteInferior: h(48), inicioAbierto: null, motivo: "olvido de escaneo" };

  it("exige motivo", () => {
    expect(validarCorreccion({ ...base, accion: "activar", inicio: h(2), motivo: "  " })).toMatch(/motivo/);
  });

  describe("activar (equipo disponible)", () => {
    it("acepta un inicio pasado posterior al último evento", () => {
      expect(validarCorreccion({ ...base, accion: "activar", inicio: h(2) })).toBeNull();
    });
    it("rechaza un inicio futuro", () => {
      expect(validarCorreccion({ ...base, accion: "activar", inicio: h(-1) })).toMatch(/futur/);
    });
    it("rechaza un inicio anterior al último evento del equipo", () => {
      expect(validarCorreccion({ ...base, accion: "activar", inicio: h(50) })).toMatch(/anterior/);
    });
    it("rechaza si el equipo ya tiene un ciclo abierto", () => {
      expect(
        validarCorreccion({ ...base, accion: "activar", inicio: h(2), inicioAbierto: h(5) }),
      ).toMatch(/en uso/);
    });
  });

  describe("cerrar (equipo en uso)", () => {
    const enUso = { ...base, inicioAbierto: h(10) };
    it("acepta un fin entre el inicio del ciclo abierto y ahora", () => {
      expect(validarCorreccion({ ...enUso, accion: "cerrar", fin: h(3) })).toBeNull();
    });
    it("rechaza un fin anterior al inicio del ciclo abierto", () => {
      expect(validarCorreccion({ ...enUso, accion: "cerrar", fin: h(11) })).toMatch(/anterior/);
    });
    it("rechaza si no hay ciclo abierto", () => {
      expect(validarCorreccion({ ...base, accion: "cerrar", fin: h(3) })).toMatch(/no está en uso/);
    });
  });

  describe("ciclo completo (equipo disponible)", () => {
    it("acepta un ciclo pasado bien formado", () => {
      expect(validarCorreccion({ ...base, accion: "ciclo", inicio: h(10), fin: h(4) })).toBeNull();
    });
    it("rechaza fin anterior o igual al inicio", () => {
      expect(validarCorreccion({ ...base, accion: "ciclo", inicio: h(4), fin: h(10) })).toMatch(/posterior/);
    });
    it("rechaza un fin futuro", () => {
      expect(validarCorreccion({ ...base, accion: "ciclo", inicio: h(4), fin: h(-1) })).toMatch(/futur/);
    });
    it("rechaza un ciclo que empieza antes del último evento", () => {
      expect(validarCorreccion({ ...base, accion: "ciclo", inicio: h(60), fin: h(4) })).toMatch(/anterior/);
    });
  });
});
