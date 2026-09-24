"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface CorreccionManualProps {
  equipoId: string;
  estado: string;
  ubicacion: string | null;
}

type Accion = "activar" | "cerrar" | "ciclo";
type Mensaje = { tipo: "ok" | "error"; texto: string } | null;

const DESCRIPCION: Record<Accion, string> = {
  activar: "Se asignó el equipo pero no se escaneó al conectarlo.",
  cerrar: "Se retiró el equipo pero no se escaneó al desconectarlo.",
  ciclo: "El equipo se usó y se retiró sin ningún escaneo.",
};

/** Valor para <input type="datetime-local"> (hora local del dispositivo). */
function ahoraLocal(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/**
 * Corrección manual ante un olvido de escaneo, a cargo de Ingeniería Clínica. Según el
 * estado del equipo ofrece registrar el cierre olvidado (en uso) o la activación / el ciclo
 * completo olvidados (disponible). El ciclo queda marcado como corrección, con su motivo.
 */
export default function CorreccionManual({ equipoId, estado, ubicacion }: CorreccionManualProps) {
  const router = useRouter();
  const enUso = estado === "en_uso";
  const [accion, setAccion] = useState<Accion>(enUso ? "cerrar" : "activar");
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [cama, setCama] = useState(ubicacion ?? "");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje>(null);

  if (estado === "mantenimiento") return null;
  const accionEfectiva: Accion = enUso ? "cerrar" : accion === "cerrar" ? "activar" : accion;
  const pideInicio = accionEfectiva !== "cerrar";
  const pideFin = accionEfectiva !== "activar";

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setEnviando(true);
    setMensaje(null);
    try {
      const res = await fetch("/api/correccion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipo_id: equipoId,
          accion: accionEfectiva,
          inicio: pideInicio && inicio ? new Date(inicio).toISOString() : undefined,
          fin: pideFin && fin ? new Date(fin).toISOString() : undefined,
          ubicacion: pideInicio ? cama.trim() || undefined : undefined,
          motivo,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "no se pudo registrar la corrección");
      const horas = data.horas != null ? ` (${Number(data.horas).toFixed(2)} h)` : "";
      setMensaje({
        tipo: "ok",
        texto: data.requiereRetiro
          ? `Corrección registrada${horas}. El equipo superó el umbral y pasó a mantenimiento.`
          : `Corrección registrada${horas}.`,
      });
      setInicio("");
      setFin("");
      setMotivo("");
      router.refresh();
    } catch (e) {
      setMensaje({ tipo: "error", texto: (e as Error).message });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4 print:hidden">
      <h2 className="mb-1 font-semibold">Corrección manual por olvido de escaneo</h2>
      <p className="mb-3 text-xs text-gray-500">
        Uso exclusivo de Ingeniería Clínica. El ciclo queda marcado como corrección manual, con su motivo.
      </p>
      <form onSubmit={enviar} className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {!enUso && (
          <label className="text-sm md:col-span-2">
            Tipo de corrección
            <select
              value={accionEfectiva}
              onChange={(e) => setAccion(e.target.value as Accion)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
            >
              <option value="activar">Activación olvidada (el equipo sigue en uso)</option>
              <option value="ciclo">Ciclo completo olvidado (ya se retiró)</option>
            </select>
          </label>
        )}
        <p className="text-sm text-gray-600 md:col-span-2">{DESCRIPCION[accionEfectiva]}</p>
        {pideInicio && (
          <label className="text-sm">
            Inicio real del uso
            <input
              type="datetime-local"
              required
              max={ahoraLocal()}
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
            />
          </label>
        )}
        {pideFin && (
          <label className="text-sm">
            Fin real del uso
            <input
              type="datetime-local"
              required
              max={ahoraLocal()}
              value={fin}
              onChange={(e) => setFin(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
            />
          </label>
        )}
        {pideInicio && (
          <label className="text-sm">
            Cama
            <input
              value={cama}
              onChange={(e) => setCama(e.target.value)}
              placeholder="Ej.: Cama 5"
              className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
            />
          </label>
        )}
        <label className="text-sm md:col-span-2">
          Motivo
          <input
            required
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej.: no se escaneó en el ingreso por urgencia"
            className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={enviando}
          className="rounded bg-gray-900 py-2 text-sm font-semibold text-white disabled:opacity-50 md:col-span-2"
        >
          {enviando ? "Guardando…" : "Registrar corrección"}
        </button>
        {mensaje && (
          <p className={`md:col-span-2 ${mensaje.tipo === "ok" ? "text-sm text-green-700" : "text-sm text-red-600"}`}>
            {mensaje.texto}
          </p>
        )}
      </form>
    </section>
  );
}
