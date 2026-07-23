"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import QRImprimible from "@/app/components/QRImprimible";

interface EquipoAccionesProps {
  equipoId: string;
  umbralHoras: number;
  pctAlerta: number;
  pctVencido: number;
  marca: string | null;
  modelo: string | null;
  numeroSerie: string | null;
}

type Mensaje = { tipo: "ok" | "error"; texto: string } | null;

/**
 * Sección interactiva del detalle de un equipo: registrar mantenimiento,
 * editar umbral/porcentajes/marca/modelo/serie, y ver/imprimir el QR.
 * La zona de acciones críticas (baja / eliminación) vive en un componente aparte
 * (ZonaAccionesCriticas) que se renderiza al final de la página.
 */
export default function EquipoAcciones({
  equipoId, umbralHoras, pctAlerta, pctVencido, marca, modelo, numeroSerie,
}: EquipoAccionesProps) {
  const router = useRouter();

  const [mantTipo, setMantTipo] = useState("preventivo");
  const [mantTecnico, setMantTecnico] = useState("");
  const [mantDescripcion, setMantDescripcion] = useState("");
  const [mantEnviando, setMantEnviando] = useState(false);
  const [mantMensaje, setMantMensaje] = useState<Mensaje>(null);

  const [cfgUmbral, setCfgUmbral] = useState(String(umbralHoras));
  const [cfgAlerta, setCfgAlerta] = useState(String(pctAlerta));
  const [cfgVencido, setCfgVencido] = useState(String(pctVencido));
  const [cfgMarca, setCfgMarca] = useState(marca ?? "");
  const [cfgModelo, setCfgModelo] = useState(modelo ?? "");
  const [cfgSerie, setCfgSerie] = useState(numeroSerie ?? "");
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
          marca: cfgMarca || undefined,
          modelo: cfgModelo || undefined,
          numero_serie: cfgSerie || undefined,
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
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-emerald-700" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M11.49 3.17a2.5 2.5 0 013.34 3.34l-9.19 9.2A2 2 0 014.22 16H3v-1.22c0-.53.21-1.04.59-1.41l9.2-9.2z" />
            <path d="M12.5 5l2.5 2.5" />
          </svg>
          <h2 className="font-semibold text-slate-900">Registrar mantenimiento</h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">Al registrar, el contador de horas se reinicia a 0.</p>
        <form onSubmit={registrarMantenimiento} className="mt-3 flex flex-col gap-3">
          <label className="text-sm">
            Tipo
            <select
              value={mantTipo}
              onChange={(e) => setMantTipo(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-2"
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
              className="mt-1 w-full rounded border border-slate-300 px-2 py-2"
            />
          </label>
          <label className="text-sm">
            Descripción
            <textarea
              value={mantDescripcion}
              onChange={(e) => setMantDescripcion(e.target.value)}
              placeholder="Detalle del trabajo realizado (opcional)"
              rows={2}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={mantEnviando}
            className="rounded bg-emerald-700 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {mantEnviando ? "Guardando…" : "Registrar mantenimiento"}
          </button>
          {mantMensaje && (
            <p className={mantMensaje.tipo === "ok" ? "text-sm text-emerald-700" : "text-sm text-red-600"}>
              {mantMensaje.texto}
            </p>
          )}
        </form>
      </section>

      {/* Editar umbral / porcentajes / marca / modelo / N° serie. */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-emerald-700" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path
              fillRule="evenodd"
              d="M11.49 3.17a2.5 2.5 0 013.34 3.34l-9.19 9.2A2 2 0 014.22 16H3v-1.22c0-.53.21-1.04.59-1.41l9.2-9.2z"
              clipRule="evenodd"
            />
          </svg>
          <h2 className="font-semibold text-slate-900">Editar configuración</h2>
        </div>
        <form onSubmit={guardarConfig} className="mt-3 flex flex-col gap-3">
          <label className="text-sm">
            Umbral (horas)
            <input
              type="number"
              min={1}
              step={1}
              value={cfgUmbral}
              onChange={(e) => setCfgUmbral(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-2"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              % aviso (0.8 = 80%)
              <input
                type="number"
                min={0}
                max={2}
                step={0.01}
                value={cfgAlerta}
                onChange={(e) => setCfgAlerta(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-2"
              />
            </label>
            <label className="text-sm">
              % vencido (1.0 = 100%)
              <input
                type="number"
                min={0}
                max={2}
                step={0.01}
                value={cfgVencido}
                onChange={(e) => setCfgVencido(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-2"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Marca
              <input
                value={cfgMarca}
                onChange={(e) => setCfgMarca(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-2"
              />
            </label>
            <label className="text-sm">
              Modelo
              <input
                value={cfgModelo}
                onChange={(e) => setCfgModelo(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-2"
              />
            </label>
          </div>
          <label className="text-sm">
            Número de serie
            <input
              value={cfgSerie}
              onChange={(e) => setCfgSerie(e.target.value)}
              placeholder="Del fabricante"
              className="mt-1 w-full rounded border border-slate-300 px-2 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={cfgEnviando}
            className="rounded bg-emerald-700 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {cfgEnviando ? "Guardando…" : "Guardar cambios"}
          </button>
          {cfgMensaje && (
            <p className={cfgMensaje.tipo === "ok" ? "text-sm text-emerald-700" : "text-sm text-red-600"}>
              {cfgMensaje.texto}
            </p>
          )}
        </form>
      </section>

      {/* QR imprimible: es la única sección que queda visible al imprimir. */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:col-span-2 print:border-none print:p-0">
        <div className="mb-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-emerald-700" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zM11 3h6v6h-6V3zm2 2v2h2V5h-2zM3 11h6v6H3v-6zm2 2v2h2v-2H5zM13 11h1v1h-1v-1zM15 11h2v2h-2v-2zM11 13h1v1h-1v-1zM13 14h2v3h-2v-3zM16 15h1v2h-1v-2z" />
            </svg>
            <h2 className="font-semibold text-slate-900">Código QR</h2>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMostrarQR((v) => !v)}
              className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              {mostrarQR ? "Ocultar QR" : "Ver/Imprimir QR"}
            </button>
            {mostrarQR && (
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
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
