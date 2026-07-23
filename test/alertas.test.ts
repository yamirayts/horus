import { describe, it, expect } from "vitest";
import { estadoAlerta, decidirAccion, pctUmbral } from "@/lib/alertas";

describe("estadoAlerta", () => {
  it("por debajo del aviso → ok", () => {
    expect(estadoAlerta(3000, 5000, 0.8, 1.0)).toBe("ok");
  });
  it("en el 80% → aviso", () => {
    expect(estadoAlerta(4000, 5000, 0.8, 1.0)).toBe("aviso");
  });
  it("en el 100% → vencido", () => {
    expect(estadoAlerta(5000, 5000, 0.8, 1.0)).toBe("vencido");
  });
  it("umbrales configurables (aviso al 70%)", () => {
    expect(estadoAlerta(3500, 5000, 0.7, 0.9)).toBe("aviso");
    expect(estadoAlerta(4500, 5000, 0.7, 0.9)).toBe("vencido");
  });
});

describe("decidirAccion", () => {
  it("disponible → activar", () => { expect(decidirAccion("disponible")).toBe("activar"); });
  it("en_uso → desactivar", () => { expect(decidirAccion("en_uso")).toBe("desactivar"); });
  it("mantenimiento → bloqueado", () => { expect(decidirAccion("mantenimiento")).toBe("bloqueado"); });
});

describe("pctUmbral", () => {
  it("mitad → 50", () => { expect(pctUmbral(2500, 5000)).toBe(50); });
  it("redondea a 1 decimal", () => { expect(pctUmbral(3333, 5000)).toBe(66.7); });
});
