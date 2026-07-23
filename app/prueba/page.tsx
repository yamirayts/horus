"use client";

import { useState, type FormEvent } from "react";

/**
 * Modo prueba: genera datos SINTÉTICOS (origen='sintetico') para poder demostrar
 * el sistema (alertas de umbral, MTBF) sin esperar semanas de uso real.
 *
 * Regla de honestidad (ver README): todo dato cargado desde esta pantalla se
 * guarda con origen='sintetico' y debe declararse como tal en cualquier informe
 * o indicador que lo use. Nunca se mezcla con origen='real' sin distinguirlo.
 */
export default function PruebaPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-4 pb-10">
      <div className="rounded border-2 border-red-600 bg-red-50 p-3 text-sm font-semibold text-red-800">
        MODO PRUEBA — genera datos sintéticos (origen=&apos;sintetico&apos;)
      </div>

      <p className="rounded bg-gray-100 p-3 text-xs text-gray-600">
        Regla de honestidad: los datos generados acá se guardan siempre con{" "}
        <code className="font-mono">origen=&apos;sintetico&apos;</code>, nunca como{" "}
        <code className="font-mono">&apos;real&apos;</code>. Cualquier indicador o informe que
        los incluya debe declararlos explícitamente como sintéticos (ver README).
      </p>

      <BloqueHorasIniciales />
      <BloqueStress />
      <BloqueFallas />
    </main>
  );
}

function BloqueHorasIniciales() {
  const [equipoId, setEquipoId] = useState("");
  const [horasIniciales, setHorasIniciales] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function alEnviar(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    setMensaje(null);
    if (!equipoId.trim() || horasIniciales === "") {
      setError("Completá equipo y horas iniciales.");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch("/api/prueba/horas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipo_id: equipoId.trim(), horas_iniciales: Number(horasIniciales) }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "no se pudo cargar");
      setMensaje(`Horas iniciales de ${equipoId.trim()} actualizadas.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="rounded border border-gray-300 p-3">
      <h2 className="mb-2 text-sm font-bold">Cargar horas iniciales</h2>
      <form onSubmit={alEnviar} className="flex flex-col gap-2">
        <label className="text-sm">
          Equipo (id)
          <input
            value={equipoId}
            onChange={(e) => setEquipoId(e.target.value)}
            placeholder="ej. BIC-014"
            className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
          />
        </label>
        <label className="text-sm">
          Horas iniciales
          <input
            type="number"
            min={0}
            step={0.1}
            value={horasIniciales}
            onChange={(e) => setHorasIniciales(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {mensaje && <p className="text-sm text-green-700">{mensaje}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="mt-1 rounded bg-gray-900 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {enviando ? "Cargando…" : "Cargar"}
        </button>
      </form>
    </section>
  );
}

function BloqueStress() {
  const [equipoId, setEquipoId] = useState("");
  const [horasObjetivo, setHorasObjetivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function alEnviar(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    setMensaje(null);
    if (!equipoId.trim() || horasObjetivo === "") {
      setError("Completá equipo y horas objetivo.");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch("/api/prueba/stress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipo_id: equipoId.trim(), horas_objetivo: Number(horasObjetivo) }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "no se pudo empujar");
      setMensaje(`Se agregaron ${data.horas_agregadas} h sintéticas a ${equipoId.trim()}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="rounded border border-gray-300 p-3">
      <h2 className="mb-2 text-sm font-bold">Prueba de stress</h2>
      <p className="mb-2 text-xs text-gray-500">
        Inserta un ciclo sintético que empuja el acumulado hasta el objetivo, para
        disparar la alerta de umbral.
      </p>
      <form onSubmit={alEnviar} className="flex flex-col gap-2">
        <label className="text-sm">
          Equipo (id)
          <input
            value={equipoId}
            onChange={(e) => setEquipoId(e.target.value)}
            placeholder="ej. BIC-014"
            className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
          />
        </label>
        <label className="text-sm">
          Horas objetivo
          <input
            type="number"
            min={0}
            step={0.1}
            value={horasObjetivo}
            onChange={(e) => setHorasObjetivo(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {mensaje && <p className="text-sm text-green-700">{mensaje}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="mt-1 rounded bg-orange-500 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {enviando ? "Empujando…" : "Empujar sobre umbral"}
        </button>
      </form>
    </section>
  );
}

function BloqueFallas() {
  const [equipoId, setEquipoId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [diasRango, setDiasRango] = useState("20");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function alEnviar(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    setMensaje(null);
    if (!equipoId.trim() || cantidad === "") {
      setError("Completá equipo y cantidad.");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch("/api/prueba/fallas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipo_id: equipoId.trim(),
          cantidad: Number(cantidad),
          dias_rango: diasRango ? Number(diasRango) : undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "no se pudo cargar");
      setMensaje(`Se insertaron ${data.insertadas} fallas sintéticas en ${equipoId.trim()}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="rounded border border-gray-300 p-3">
      <h2 className="mb-2 text-sm font-bold">Fallas sintéticas (para MTBF)</h2>
      <p className="mb-2 text-xs text-gray-500">
        Nota: el tablero muestra MTBF sobre fallas de los últimos 30 días. Rango recomendado:
        ≤30 días.
      </p>
      <form onSubmit={alEnviar} className="flex flex-col gap-2">
        <label className="text-sm">
          Equipo (id)
          <input
            value={equipoId}
            onChange={(e) => setEquipoId(e.target.value)}
            placeholder="ej. BIC-014"
            className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm">
            Cantidad
            <input
              type="number"
              min={1}
              step={1}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
            />
          </label>
          <label className="text-sm">
            Días de rango
            <input
              type="number"
              min={1}
              step={1}
              value={diasRango}
              onChange={(e) => setDiasRango(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
            />
          </label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {mensaje && <p className="text-sm text-green-700">{mensaje}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="mt-1 rounded bg-gray-900 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {enviando ? "Cargando…" : "Cargar"}
        </button>
      </form>
    </section>
  );
}
