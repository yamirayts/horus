import { describe, it, expect } from "vitest";
import { ESCENARIO, perfilBombas } from "@/lib/escenario";

describe("ESCENARIO", () => {
  it("tiene 14 camas y el parque correcto", () => {
    expect(ESCENARIO.camas).toBe(14);
    expect(ESCENARIO.ventiladores).toBe(17);
    expect(ESCENARIO.monitores).toBe(14);
    expect(ESCENARIO.bombas).toBe(70);
  });
  it("perfilBombas devuelve rangos esperados", () => {
    expect(perfilBombas("baja")).toBeGreaterThanOrEqual(1);
    expect(perfilBombas("baja")).toBeLessThanOrEqual(2);
    expect(perfilBombas("alta")).toBeGreaterThanOrEqual(6);
    expect(perfilBombas("alta")).toBeLessThanOrEqual(8);
  });
});
