import { describe, it, expect } from "vitest";
import { calcularTUE, clasificarTUE, calcularMTBF, proyeccionDiasHastaPM } from "@/lib/indicadores";

describe("TUE", () => {
  it("360 h de 720 → 50%", () => { expect(calcularTUE(360, 720)).toBe(50); });
  it("clasifica sobreexigido ≥85", () => { expect(clasificarTUE(85)).toBe("sobreexigido"); });
  it("clasifica subutilizado ≤30", () => { expect(clasificarTUE(30)).toBe("subutilizado"); });
  it("clasifica normal entre medio", () => { expect(clasificarTUE(50)).toBe("normal"); });
});

describe("MTBF", () => {
  it("1000 h con 4 fallas → 250", () => { expect(calcularMTBF(1000, 4)).toBe(250); });
  it("sin fallas → null", () => { expect(calcularMTBF(1000, 0)).toBeNull(); });
});

describe("proyeccionDiasHastaPM", () => {
  it("faltan 1000 h al aviso a 50 h/día → 20 días", () => {
    // umbral 5000, aviso 0.8 → 4000; acum 3000 → faltan 1000; /50 = 20
    expect(proyeccionDiasHastaPM(3000, 5000, 0.8, 50)).toBe(20);
  });
  it("horasPorDia 0 → null", () => {
    expect(proyeccionDiasHastaPM(3000, 5000, 0.8, 0)).toBeNull();
  });
  it("ya pasó el aviso → 0", () => {
    expect(proyeccionDiasHastaPM(4200, 5000, 0.8, 50)).toBe(0);
  });
});
