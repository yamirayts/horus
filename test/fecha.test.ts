import { describe, it, expect } from "vitest";
import { fechaHoraAR } from "@/lib/fecha";

describe("fechaHoraAR", () => {
  it("formatea un instante UTC en hora de Argentina (UTC-3), sin depender del huso del servidor", () => {
    // 2026-08-21T19:44:47Z corresponde a las 16:44:47 en Buenos Aires.
    const s = fechaHoraAR("2026-08-21T19:44:47Z");
    expect(s).toContain("16:44:47");
    expect(s).toContain("2026");
  });
});
