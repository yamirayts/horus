"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import QRImprimible from "@/app/components/QRImprimible";

interface EquipoAccionesProps {
  equipoId: string;
  umbralHoras: number;
  pctAlerta: number;
  pctVencido: number;
}

type Mensaje = { tipo: "ok" | "error"; texto: string } | null;

/**
 * Sección interactiva del detalle de un equipo: registrar mantenimiento,
 * editar umbral/porcentajes de alerta, y ver/imprimir el QR.
 * Componente cliente porque envía POST/PATCH y refresca los datos del server component.
 */
export default function EquipoAcciones({ equipoId, umbralHoras, pctAlerta, pctVencido }: EquipoAccionesProps) {
  const router = useRouter();

  const [mantTipo, setMantTipo] = useState("preventivo");
  const [mantTecnico, setMantTecnico] = useState("");
  const [mantDescripcion, setMantDescripcion] = useState("");
  const [mantEnviando, setMantEnviando] = useState(false);
  const [mantMensaje, setMantMensaje] = useState<Mensaje>(null);

  const [cfgUmbral, setCfgUmbral] = useState(String(umbralHoras));
  const [cfgAlerta, setCfgAlerta] = useState(String(pctAlerta));
  const [cfgVencido, setCfgVencido] = useState(String(pctVencido));
  const [cfgEnviando, setCfgEnviando] = useState(false);
  const [cfgMensaje, setCfgMensaje] = useState<Mensaje>(null);

  const [mostrarQR, setMostrarQR] = useState(false);

  async function registrarMantenimiento(ev: FormEvent) {
    ev.preventDefault();
    setMantEnviando(true);
    setMantMensaje(null);
    try {
      const res = await fetch("/api/mantenimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipo_id: equipoId,
          tipo: mantTipo,
          descripcion: mantDescripcion || undefined,
          tecnico: mantTecnico || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "no se pudo registrar el mantenimiento");
      setMantMensaje({ tipo: "ok", texto: "Mantenimiento registrado. El contador de horas se reinició." });
      setMantDescripcion("");
      setMantTecnico("");
      router.refresh();
    } catch (e) {
      setMantMensaje({ tipo: "error", texto: (e as Error).message });
    } finally {
      setMantEnviando(false);
    }
  }

  async function guardarConfig(ev: FormEvent) {
    ev.preventDefault();
    setCfgEnviando(true);
    setCfgMensaje(null);
    try {
      const res = await fetch(`/api/equipos/${encodeURIComponent(equipoId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          umbral_horas: Number(cfgUmbral),
          pct_alerta: Number(cfgAlerta),
          pct_vencido: Number(cfgVencido),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "no se pudo guardar la configuración");
      setCfgMensaje({ tipo: "ok", texto: "Configuración actualizada." });
      router.refresh();
    } catch (e) {
      setCfgMensaje({ tipo: "error", texto: (e as Error).message });
    } finally {
      setCfgEnviando(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Registrar mantenimiento: resetea el contador de horas del equipo. */}
      <section className="rounded-lg border border-gray-200 bg-white p-4 print:hidden">
        <h2 className="mb-3 font-semibold">Registrar mantenimiento</h2>
        <form onSubmit={registrarMantenimiento} className="flex flex-col gap-3">
          <label className="text-sm">
            Tipo
            <select
              value={mantTipo}
              onChange={(e) => setMantTipo(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
            >
              <option value="preventivo">Preventivo</option>
              <option value="correctivo">Correctivo</option>
            </select>
          </label>
          <label className="text-sm">
            Técnico
            <input
              value={mantTecnico}
              onChange={(e) => setMantTecnico(e.target.value)}
              placeholder="Nombre del técnico (opcional)"
              className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
            />
          </label>
          <label className="text-sm">
            Descripción
            <textarea
              value={mantDescripcion}
              onChange={(e) => setMantDescripcion(e.target.value)}
              placeholder="Detalle del trabajo realizado (opcional)"
              rows={2}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
            />
          </label>
          <p className="text-xs text-gray-500">
            Al registrar, el contador de horas acumuladas del equipo vuelve a cero.
          </p>
          <button
            type="submit"
            disabled={mantEnviando}
            className="rounded bg-gray-900 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {mantEnviando ? "Guardando…" : "Registrar mantenimiento"}
          </button>
          {mantMensaje && (
            <p className={mantMensaje.tipo === "ok" ? "text-sm text-green-700" : "text-sm text-red-600"}>
              {mantMensaje.texto}
            </p>
          )}
        </form>
      </section>

      {/* Editar umbral / porcentajes de alerta y vencido. */}
      <section className="rounded-lg border border-gray-200 bg-white p-4 print:hidden">
        <h2 className="mb-3 font-semibold">Editar umbral / % de alerta</h2>
        <form onSubmit={guardarConfig} className="flex flex-col gap-3">
          <label className="text-sm">
            Umbral (horas)
            <input
              type="number"
              min={1}
              step={1}
              value={cfgUmbral}
              onChange={(e) => setCfgUmbral(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
            />
          </label>
          <label className="text-sm">
            % aviso (fracción, ej. 0.8 = 80%)
            <input
              type="number"
              min={0}
              max={2}
              step={0.01}
              value={cfgAlerta}
              onChange={(e) => setCfgAlerta(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
            />
          </label>
          <label className="text-sm">
            % vencido (fracción, ej. 1.0 = 100%)
            <input
              type="number"
              min={0}
              max={2}
              step={0.01}
              value={cfgVencido}
              onChange={(e) => setCfgVencido(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={cfgEnviando}
            className="rounded bg-gray-900 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {cfgEnviando ? "Guardando…" : "Guardar configuración"}
          </button>
          {cfgMensaje && (
            <p className={cfgMensaje.tipo === "ok" ? "text-sm text-green-700" : "text-sm text-red-600"}>
              {cfgMensaje.texto}
            </p>
          )}
        </form>
      </section>

      {/* QR imprimible: es la única sección que queda visible al imprimir. */}
      <section className="rounded-lg border border-gray-200 bg-white p-4 md:col-span-2 print:border-none print:p-0">
        <div className="mb-3 flex items-center justify-between print:hidden">
          <h2 className="font-semibold">Código QR</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMostrarQR((v) => !v)}
              className="rounded border border-gray-300 px-3 py-2 text-sm font-semibold"
            >
              {mostrarQR ? "Ocultar QR" : "Ver/Imprimir QR"}
            </button>
            {mostrarQR && (
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
              >
                Imprimir
              </button>
            )}
          </div>
        </div>
        {mostrarQR && <QRImprimible id={equipoId} />}
      </section>
    </div>
  );
}
