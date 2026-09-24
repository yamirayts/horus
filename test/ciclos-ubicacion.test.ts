import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Invariante: la cama (equipos.ubicacion) solo tiene sentido mientras el equipo está
 * 'en_uso'. Al cerrar el ciclo y devolver el equipo a 'disponible', la ubicación debe
 * limpiarse (NULL); de lo contrario el tablero, el detalle del equipo y la tarjeta
 * muestran la cama vieja de un equipo que ya está libre.
 *
 * Se mockea "@/lib/db/client" con un tx falso que interpreta el texto de cada query,
 * siguiendo el patrón de fallas-ciclo.test.ts, para no depender de una base real.
 */

interface QueryLlamada {
  texto: string;
  valores: unknown[];
}

let llamadas: QueryLlamada[];
let cicloAbierto: { id: number; inicio: Date } | null;

function crearTxFalso() {
  const tx = async (strings: TemplateStringsArray, ...valores: unknown[]) => {
    const texto = strings.join("¿?");
    llamadas.push({ texto, valores });
    if (texto.includes("SELECT id, inicio FROM ciclos_uso")) {
      return cicloAbierto ? [cicloAbierto] : [];
    }
    if (texto.includes("UPDATE ciclos_uso SET fin")) {
      cicloAbierto = null;
      return [];
    }
    return [];
  };
  return tx;
}

vi.mock("@/lib/db/client", () => ({
  sql: {
    begin: async (cb: (tx: unknown) => unknown) => cb(crearTxFalso()),
  },
}));

describe("cerrarCicloAbierto — libera la cama al pasar a disponible", () => {
  beforeEach(() => {
    llamadas = [];
    cicloAbierto = { id: 1, inicio: new Date(Date.now() - 2 * 60 * 60 * 1000) };
  });

  it("el UPDATE que pone el equipo 'disponible' también limpia ubicacion", async () => {
    const { cerrarCicloAbierto } = await import("@/lib/db/ciclos");
    await cerrarCicloAbierto("BIC-01");

    const updateEquipo = llamadas.find((l) =>
      l.texto.includes("UPDATE equipos SET estado = 'disponible'")
    );
    expect(updateEquipo).toBeDefined();
    // La cama debe quedar libre: el mismo UPDATE tiene que tocar ubicacion.
    expect(updateEquipo!.texto).toContain("ubicacion");
  });
});
