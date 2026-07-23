import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Test de la lógica de cierre-de-ciclo-huérfano (Finding 1 del review final):
 * registrarFalla, al poner un equipo en_uso en mantenimiento, debe cerrar el ciclo
 * abierto en ciclos_uso (fin IS NULL) ANTES de cambiar el estado del equipo, en vez
 * de dejarlo huérfano para siempre.
 *
 * Como registrarFalla está acoplado a postgres.js (sql.begin + tagged templates),
 * se mockea "@/lib/db/client" con una implementación mínima que interpreta el texto
 * de cada query para devolver datos canónicos y registrar qué se ejecutó, sin tocar
 * una base real.
 */

interface QueryLlamada {
  texto: string;
  valores: unknown[];
}

let llamadas: QueryLlamada[];
let equipoEstado: "disponible" | "en_uso" | "mantenimiento";
let cicloAbierto: { id: number; inicio: Date } | null;

function crearTxFalso() {
  // postgres.js expone `tx` como una función tag-template (tx`SELECT ...`), y también
  // como objeto con `.begin`/`.savepoint`, pero para este flujo solo se usa como función.
  const tx = async (strings: TemplateStringsArray, ...valores: unknown[]) => {
    const texto = strings.join("¿?");
    llamadas.push({ texto, valores });

    if (texto.includes("SELECT estado FROM equipos")) {
      return [{ estado: equipoEstado }];
    }
    if (texto.includes("SELECT id, inicio FROM ciclos_uso")) {
      return cicloAbierto ? [cicloAbierto] : [];
    }
    if (texto.includes("UPDATE ciclos_uso SET fin")) {
      cicloAbierto = null;
      return [];
    }
    // INSERT INTO fallas, UPDATE equipos SET estado = 'mantenimiento', etc.
    return [];
  };
  return tx;
}

vi.mock("@/lib/db/client", () => ({
  sql: {
    begin: async (cb: (tx: unknown) => unknown) => cb(crearTxFalso()),
  },
}));

describe("registrarFalla — cierre de ciclo huérfano (Finding 1)", () => {
  beforeEach(() => {
    llamadas = [];
  });

  it("equipo en_uso + ponerEnMantenimiento: cierra el ciclo abierto antes de pasar a mantenimiento", async () => {
    equipoEstado = "en_uso";
    cicloAbierto = { id: 42, inicio: new Date(Date.now() - 2 * 60 * 60 * 1000) }; // 2h atrás

    const { registrarFalla } = await import("@/lib/db/fallas");
    await registrarFalla({ equipo_id: "BIC-01", ponerEnMantenimiento: true });

    const idxCierreCiclo = llamadas.findIndex((l) => l.texto.includes("UPDATE ciclos_uso SET fin"));
    const idxMantenimiento = llamadas.findIndex((l) =>
      l.texto.includes("UPDATE equipos SET estado = 'mantenimiento'")
    );

    expect(idxCierreCiclo).toBeGreaterThanOrEqual(0);
    expect(idxMantenimiento).toBeGreaterThanOrEqual(0);
    // El ciclo se cierra ANTES del UPDATE de estado (orden pedido por el finding).
    expect(idxCierreCiclo).toBeLessThan(idxMantenimiento);
    // El ciclo ya no queda abierto tras registrar la falla.
    expect(cicloAbierto).toBeNull();
  });

  it("equipo disponible (sin ciclo abierto) + ponerEnMantenimiento: no intenta cerrar ningún ciclo", async () => {
    equipoEstado = "disponible";
    cicloAbierto = null;

    vi.resetModules();
    const { registrarFalla } = await import("@/lib/db/fallas");
    await registrarFalla({ equipo_id: "BIC-02", ponerEnMantenimiento: true });

    const cierreCiclo = llamadas.find((l) => l.texto.includes("UPDATE ciclos_uso SET fin"));
    expect(cierreCiclo).toBeUndefined();
  });

  it("ponerEnMantenimiento=false: no consulta estado ni toca ciclos", async () => {
    equipoEstado = "en_uso";
    cicloAbierto = { id: 7, inicio: new Date() };

    vi.resetModules();
    const { registrarFalla } = await import("@/lib/db/fallas");
    await registrarFalla({ equipo_id: "BIC-03", ponerEnMantenimiento: false });

    expect(llamadas.some((l) => l.texto.includes("SELECT estado FROM equipos"))).toBe(false);
    expect(cicloAbierto).not.toBeNull();
  });
});
