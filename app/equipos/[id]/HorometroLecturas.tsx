"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { calcularDesvio } from "@/lib/horometro";
import { fechaHoraAR } from "@/lib/fecha";
import type { Lectura } from "@/lib/db/horometro";

interface HorometroLecturasProps {
  equipoId: string;
  lecturas: Lectura[];
}

type Mensaje = { tipo: "ok" | "error"; texto: string } | null;

/**
 * Contraste entre las horas calculadas por el sistema (QR) y el horómetro
 * interno del equipo: formulario para cargar una lectura y tabla de historial
 * con el desvío absoluto y porcentual respecto de cada lectura.
 */
export default function HorometroLecturas({ equipoId, lecturas }: HorometroLecturasProps) {
  const router = useRouter();

  const [horas, setHoras] = useState("");
  const [observacion, setObservacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje>(null);

  async function registrarLectura(ev: FormEvent) {
    ev.preventDefault();
    setEnviando(true);
    setMensaje(null);
    try {
      const res = await fetch("/api/horometro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipo_id: equipoId,
          horas_horometro: Number(horas),
          observacion: observacion || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "no se pudo registrar la lectura");
      setMensaje({ tipo: "ok", texto: "Lectura registrada." });
      setHoras("");
      setObservacion("");
      router.refresh();
    } catch (e) {
      setMensaje({ tipo: "error", texto: (e as Error).message });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4 print:hidden">
      <h2 className="mb-3 font-semibold">Contraste con horómetro interno</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <form onSubmit={registrarLectura} className="flex flex-col gap-3">
          <label className="text-sm">
            Horas del horómetro
            <input
              type="number"
              min={0}
              step={0.01}
              required
              value={horas}
              onChange={(e) => setHoras(e.target.value)}
              placeholder="Lectura del contador interno"
              className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
            />
          </label>
          <label className="text-sm">
            Observación
            <input
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Opcional"
              className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={enviando}
            className="rounded bg-gray-900 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {enviando ? "Guardando…" : "Registrar lectura"}
          </button>
          {mensaje && (
            <p className={mensaje.tipo === "ok" ? "text-sm text-green-700" : "text-sm text-red-600"}>
              {mensaje.texto}
            </p>
          )}
        </form>

        <div>
          {lecturas.length === 0 ? (
            <p className="text-sm text-gray-500">Sin lecturas registradas todavía.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="py-1 pr-2">Fecha</th>
                    <th className="py-1 pr-2">Horómetro</th>
                    <th className="py-1 pr-2">QR</th>
                    <th className="py-1 pr-2">Desvío</th>
                    <th className="py-1">Desvío %</th>
                  </tr>
                </thead>
                <tbody>
                  {lecturas.map((l) => {
                    const horasHorometro = Number(l.horas_horometro);
                    const horasQr = l.horas_qr_al_momento != null ? Number(l.horas_qr_al_momento) : null;
                    const desvio = horasQr != null ? calcularDesvio(horasQr, horasHorometro) : null;
                    return (
                      <tr key={l.id} className="border-b border-gray-100 last:border-0">
                        <td className="py-1 pr-2">{fechaHoraAR(l.fecha)}</td>
                        <td className="py-1 pr-2">{horasHorometro.toFixed(2)} h</td>
                        <td className="py-1 pr-2">{horasQr != null ? `${horasQr.toFixed(2)} h` : "—"}</td>
                        <td className="py-1 pr-2">{desvio ? `${desvio.absoluto.toFixed(2)} h` : "—"}</td>
                        <td className="py-1">{desvio && desvio.porcentual != null ? `${desvio.porcentual.toFixed(2)}%` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-500">
        El horómetro interno actúa como patrón de contraste independiente (ver TFI, estrategia de validación en dos niveles).
      </p>
    </section>
  );
}
