"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import QRImprimible from "@/app/components/QRImprimible";

const TIPOS = [
  { value: "bomba_infusion", label: "Bomba de infusión" },
  { value: "monitor", label: "Monitor" },
  { value: "ventilador", label: "Ventilador" },
];

interface FormState {
  id: string;
  tipo: string;
  marca: string;
  modelo: string;
  umbral_horas: string;
  pct_alerta: string;
  pct_vencido: string;
  horas_iniciales: string;
}

const ESTADO_INICIAL: FormState = {
  id: "",
  tipo: TIPOS[0].value,
  marca: "",
  modelo: "",
  umbral_horas: "",
  pct_alerta: "0.8",
  pct_vencido: "1.0",
  horas_iniciales: "0",
};

/**
 * Alta de un equipo nuevo (`POST /api/equipos`). Al guardar con éxito muestra
 * el QR del equipo creado, listo para imprimir.
 */
export default function AltaEquipoPage() {
  const [form, setForm] = useState<FormState>(ESTADO_INICIAL);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creado, setCreado] = useState<string | null>(null);

  function actualizar<K extends keyof FormState>(campo: K, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function alGuardar(ev: FormEvent) {
    ev.preventDefault();
    setError(null);

    const id = form.id.trim();
    if (!id || !form.tipo || !form.umbral_horas) {
      setError("Completá al menos id, tipo y umbral de horas.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/equipos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          tipo: form.tipo,
          marca: form.marca || undefined,
          modelo: form.modelo || undefined,
          umbral_horas: Number(form.umbral_horas),
          pct_alerta: form.pct_alerta ? Number(form.pct_alerta) : undefined,
          pct_vencido: form.pct_vencido ? Number(form.pct_vencido) : undefined,
          horas_iniciales: form.horas_iniciales ? Number(form.horas_iniciales) : undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "no se pudo crear el equipo");
      setCreado(id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  function alDarAltaOtro() {
    setCreado(null);
    setForm(ESTADO_INICIAL);
  }

  if (creado) {
    return (
      <main className="mx-auto flex max-w-md flex-col items-center gap-4 p-4">
        <h1 className="text-xl font-bold print:hidden">Equipo creado</h1>
        <p className="text-sm text-gray-600 print:hidden">El equipo {creado} se dio de alta correctamente.</p>
        <QRImprimible id={creado} />
        <div className="flex w-full gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 rounded bg-gray-900 py-2 text-sm font-semibold text-white"
          >
            Imprimir QR
          </button>
          <button
            type="button"
            onClick={alDarAltaOtro}
            className="flex-1 rounded border border-gray-300 py-2 text-sm font-semibold"
          >
            Dar de alta otro
          </button>
        </div>
        <Link href="/equipos" className="text-sm text-gray-600 underline print:hidden">
          Ir a la lista de equipos
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="mb-4 text-xl font-bold">Alta de equipo</h1>
      <form onSubmit={alGuardar} className="flex flex-col gap-3">
        <label className="text-sm">
          Id (código del QR)
          <input
            value={form.id}
            onChange={(e) => actualizar("id", e.target.value)}
            placeholder="ej. BIC-071"
            required
            className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
          />
        </label>

        <label className="text-sm">
          Tipo
          <select
            value={form.tipo}
            onChange={(e) => actualizar("tipo", e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            Marca
            <input
              value={form.marca}
              onChange={(e) => actualizar("marca", e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
            />
          </label>
          <label className="text-sm">
            Modelo
            <input
              value={form.modelo}
              onChange={(e) => actualizar("modelo", e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
            />
          </label>
        </div>

        <label className="text-sm">
          Umbral de horas (mantenimiento)
          <input
            type="number"
            min={1}
            step={1}
            required
            value={form.umbral_horas}
            onChange={(e) => actualizar("umbral_horas", e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
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
              value={form.pct_alerta}
              onChange={(e) => actualizar("pct_alerta", e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
            />
          </label>
          <label className="text-sm">
            % vencido (1.0 = 100%)
            <input
              type="number"
              min={0}
              max={2}
              step={0.01}
              value={form.pct_vencido}
              onChange={(e) => actualizar("pct_vencido", e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
            />
          </label>
        </div>

        <label className="text-sm">
          Horas iniciales (uso previo ya acumulado)
          <input
            type="number"
            min={0}
            step={0.1}
            value={form.horas_iniciales}
            onChange={(e) => actualizar("horas_iniciales", e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="mt-2 rounded bg-gray-900 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {enviando ? "Guardando…" : "Crear equipo"}
        </button>
      </form>
    </main>
  );
}
