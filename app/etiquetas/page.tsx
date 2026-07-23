"use client";

import { useEffect, useMemo, useState } from "react";
import type { Equipo } from "@/lib/db/equipos";
import QRImprimible from "@/app/components/QRImprimible";

const TIPOS = [
  { value: "", label: "Todos los tipos" },
  { value: "bomba_infusion", label: "Bomba de infusión" },
  { value: "monitor", label: "Monitor" },
  { value: "ventilador", label: "Ventilador" },
];

const ETIQUETA_TIPO: Record<string, string> = {
  bomba_infusion: "Bomba de infusión",
  monitor: "Monitor",
  ventilador: "Ventilador",
};

const COPIAS_MIN = 1;
const COPIAS_MAX = 10;

/**
 * Pantalla de generación e impresión de etiquetas QR.
 *
 * Permite filtrar el listado de equipos, elegir cuáles etiquetar (selección
 * individual, "todo lo visible" o reimpresión puntual de uno solo) y cuántas
 * copias por equipo, y arma una grilla imprimible con <QRImprimible> lista
 * para `window.print()`. No maneja datos de pacientes: solo id/tipo del equipo.
 */
export default function EtiquetasPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filtroTipo, setFiltroTipo] = useState("");
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [copias, setCopias] = useState(1);
  const [mensajeSeleccion, setMensajeSeleccion] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    fetch("/api/equipos")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelado) setEquipos(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelado) setError("No se pudo cargar la lista de equipos.");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const equiposVisibles = useMemo(
    () => (filtroTipo ? equipos.filter((e) => e.tipo === filtroTipo) : equipos),
    [equipos, filtroTipo]
  );

  // El orden de impresión sigue el orden original de la lista, no el de selección.
  const equiposAImprimir = useMemo(
    () => equipos.filter((e) => seleccionados.has(e.id)),
    [equipos, seleccionados]
  );

  function alternarSeleccion(id: string) {
    setSeleccionados((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
    setMensajeSeleccion(null);
  }

  function seleccionarTodoVisible() {
    setSeleccionados((prev) => {
      const nuevo = new Set(prev);
      for (const e of equiposVisibles) nuevo.add(e.id);
      return nuevo;
    });
    setMensajeSeleccion(null);
  }

  function limpiarSeleccion() {
    setSeleccionados(new Set());
  }

  function actualizarCopias(valor: string) {
    const n = Number(valor);
    if (Number.isNaN(n)) return;
    setCopias(Math.min(COPIAS_MAX, Math.max(COPIAS_MIN, Math.trunc(n))));
  }

  function alImprimir() {
    if (seleccionados.size === 0) {
      setMensajeSeleccion("Seleccioná al menos un equipo.");
      return;
    }
    setMensajeSeleccion(null);
    window.print();
  }

  return (
    <main className="mx-auto max-w-3xl p-4">
      <div className="mb-4 print:hidden">
        <h1 className="text-xl font-bold">Etiquetas QR</h1>
        <p className="text-sm text-gray-600">
          Elegí los equipos a etiquetar (o reimprimir), cuántas copias por equipo y generá la
          grilla lista para imprimir.
        </p>
      </div>

      {cargando && <p className="text-sm text-gray-500 print:hidden">Cargando equipos…</p>}
      {error && <p className="text-sm text-red-600 print:hidden">{error}</p>}

      {!cargando && !error && (
        <>
          {/* Controles: ocultos al imprimir, solo se ve la grilla de QRs */}
          <div className="mb-4 flex flex-col gap-3 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm">
                Tipo
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="ml-2 rounded border border-gray-300 px-2 py-2 text-sm"
                >
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                Copias por equipo
                <input
                  type="number"
                  min={COPIAS_MIN}
                  max={COPIAS_MAX}
                  value={copias}
                  onChange={(e) => actualizarCopias(e.target.value)}
                  className="ml-2 w-16 rounded border border-gray-300 px-2 py-2 text-sm"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={seleccionarTodoVisible}
                className="rounded border border-gray-300 px-3 py-2 text-sm font-semibold"
              >
                Seleccionar todo (visible)
              </button>
              <button
                type="button"
                onClick={limpiarSeleccion}
                className="rounded border border-gray-300 px-3 py-2 text-sm font-semibold"
              >
                Limpiar selección
              </button>
              <button
                type="button"
                onClick={alImprimir}
                className="ml-auto rounded bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
              >
                Imprimir seleccionados ({seleccionados.size})
              </button>
            </div>

            {mensajeSeleccion && <p className="text-sm text-red-600">{mensajeSeleccion}</p>}
          </div>

          {/* Lista de equipos con checkbox de selección */}
          <div className="divide-y divide-gray-200 rounded border border-gray-200 print:hidden">
            {equiposVisibles.length === 0 ? (
              <p className="p-3 text-sm text-gray-500">No hay equipos que coincidan con el filtro.</p>
            ) : (
              equiposVisibles.map((eq) => (
                <label
                  key={eq.id}
                  className="flex cursor-pointer items-center gap-3 p-3 text-sm hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={seleccionados.has(eq.id)}
                    onChange={() => alternarSeleccion(eq.id)}
                    className="h-4 w-4 shrink-0"
                  />
                  <span className="font-mono font-bold">{eq.id}</span>
                  <span className="text-gray-600">{ETIQUETA_TIPO[eq.tipo] ?? eq.tipo}</span>
                </label>
              ))
            )}
          </div>

          {/* Grilla imprimible: oculta en pantalla, visible solo al imprimir */}
          <div className="hidden print:grid print:grid-cols-2 print:gap-6 print:justify-items-center print:p-4">
            {equiposAImprimir.flatMap((eq) =>
              Array.from({ length: copias }, (_, i) => (
                <div key={`${eq.id}-${i}`} className="break-inside-avoid">
                  <QRImprimible id={eq.id} />
                </div>
              ))
            )}
          </div>
        </>
      )}
    </main>
  );
}
