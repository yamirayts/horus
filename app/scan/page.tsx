"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { Equipo } from "@/lib/db/equipos";
import type { Accion } from "@/lib/alertas";
import { ESCENARIO } from "@/lib/escenario";

interface RespuestaConsulta {
  ok: boolean;
  equipo?: Equipo;
  accion?: Accion;
  error?: string;
}

interface RespuestaScan {
  ok: boolean;
  accion?: "activar" | "desactivar" | "bloqueado";
  horas?: number;
  error?: string;
}

const ETIQUETA_ESTADO: Record<Equipo["estado"], string> = {
  disponible: "Disponible",
  en_uso: "En uso",
  mantenimiento: "En mantenimiento",
};

// Valores exactos que espera la DB (mismo listado que el escáner in-app).
const TIPOS_FALLA: { value: string; label: string }[] = [
  { value: "no_enciende", label: "No enciende" },
  { value: "alarma", label: "Alarma" },
  { value: "bateria", label: "Batería" },
  { value: "mecanica", label: "Mecánica" },
  { value: "otra", label: "Otra" },
];

function ScanContent() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";

  const [cargando, setCargando] = useState(true);
  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [accion, setAccion] = useState<Accion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<
    { variante: "activar" | "desactivar" | "error" | "falla"; mensaje: string } | null
  >(null);
  const [enviando, setEnviando] = useState(false);

  // Cama / ubicación (solo se envía al activar).
  const [ubicacion, setUbicacion] = useState("");

  // Mini-formulario de reporte de falla.
  const [modalFalla, setModalFalla] = useState(false);
  const [tipoFalla, setTipoFalla] = useState(TIPOS_FALLA[0].value);
  const [descripcionFalla, setDescripcionFalla] = useState("");
  const [ponerEnMantenimiento, setPonerEnMantenimiento] = useState(true);
  const [enviandoFalla, setEnviandoFalla] = useState(false);
  const [errorFalla, setErrorFalla] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Falta el id del equipo en la URL.");
      setCargando(false);
      return;
    }
    let cancelado = false;
    fetch(`/api/scan?id=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((r) => r.json() as Promise<RespuestaConsulta>)
      .then((data) => {
        if (cancelado) return;
        if (!data.ok || !data.equipo || !data.accion) {
          setError(data.error ?? "Equipo desconocido.");
        } else {
          setEquipo(data.equipo);
          setAccion(data.accion);
          setUbicacion(data.equipo.ubicacion ?? "");
        }
        setCargando(false);
      })
      .catch(() => {
        if (cancelado) return;
        setError("Sin conexión. Intentá de nuevo.");
        setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [id]);

  async function confirmar() {
    if (!accion || accion === "bloqueado") return;
    setEnviando(true);
    try {
      const body: { id: string; ubicacion?: string } = { id };
      // Enviar ubicación solo al activar; al desactivar no tiene sentido.
      if (accion === "activar" && ubicacion.trim()) {
        body.ubicacion = ubicacion.trim();
      }
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: RespuestaScan = await res.json();
      if (!data.ok || !data.accion || data.accion === "bloqueado") {
        setConfirmando({
          variante: "error",
          mensaje: `⚠ ${data.error ?? "No se pudo procesar."}`,
        });
      } else {
        const hora = new Date();
        const hh = `${String(hora.getHours()).padStart(2, "0")}:${String(hora.getMinutes()).padStart(2, "0")}`;
        setConfirmando({
          variante: data.accion,
          mensaje:
            data.accion === "activar"
              ? `✓ ${id} ACTIVADO — ${hh}`
              : `✓ ${id} DESACTIVADO — ${hh}`,
        });
      }
    } catch {
      setConfirmando({ variante: "error", mensaje: "⚠ Sin conexión. Intentá de nuevo." });
    } finally {
      setEnviando(false);
    }
  }

  async function reportarFalla() {
    setErrorFalla(null);
    setEnviandoFalla(true);
    try {
      const res = await fetch("/api/falla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipo_id: id,
          tipo: tipoFalla,
          descripcion: descripcionFalla.trim() || undefined,
          ponerEnMantenimiento,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setErrorFalla(data.error ?? "No se pudo registrar la falla.");
        return;
      }
      setModalFalla(false);
      setConfirmando({
        variante: "falla",
        mensaje: ponerEnMantenimiento
          ? `✓ Falla reportada — ${id} en mantenimiento`
          : `✓ Falla reportada — ${id}`,
      });
    } catch {
      setErrorFalla("Sin conexión. Intentá de nuevo.");
    } finally {
      setEnviandoFalla(false);
    }
  }

  if (cargando) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-6">
        <p className="text-lg text-gray-600">Consultando equipo…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-lg font-semibold text-red-700">⚠ {error}</p>
        <p className="text-sm text-gray-600">id: {id || "(vacío)"}</p>
        <Link href="/" className="text-sm text-blue-700 underline">
          Ir al escáner
        </Link>
      </main>
    );
  }

  if (confirmando) {
    const bg =
      confirmando.variante === "activar"
        ? "bg-green-600"
        : confirmando.variante === "desactivar"
        ? "bg-orange-600"
        : confirmando.variante === "falla"
        ? "bg-red-700"
        : "bg-red-600";
    return (
      <main className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center gap-6 p-6">
        <div className={`${bg} rounded-lg px-8 py-10 text-center text-2xl font-bold text-white`}>
          {confirmando.mensaje}
        </div>
        <div className="flex gap-3">
          <Link href="/" className="rounded bg-gray-900 px-5 py-3 text-sm text-white">
            Escanear otro
          </Link>
          <Link href={`/equipos/${id}`} className="rounded border border-gray-400 px-5 py-3 text-sm">
            Ver detalle
          </Link>
        </div>
      </main>
    );
  }

  if (!equipo || !accion) return null;

  const etiquetaAccion =
    accion === "activar" ? "ACTIVAR" : accion === "desactivar" ? "DESACTIVAR" : "EQUIPO EN MANTENIMIENTO";
  const colorAccion =
    accion === "activar"
      ? "bg-green-600"
      : accion === "desactivar"
      ? "bg-orange-600"
      : "bg-gray-500";

  return (
    <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-300 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">Equipo</p>
        <h1 className="mt-1 text-2xl font-bold">{equipo.tipo}</h1>
        {(equipo.marca || equipo.modelo) && (
          <p className="text-sm text-gray-700">
            {[equipo.marca, equipo.modelo].filter(Boolean).join(" · ")}
          </p>
        )}
        <p className="mt-2 font-mono text-lg font-bold">{equipo.id}</p>

        <div className="mt-6">
          <p className="text-sm text-gray-500">Estado actual</p>
          <p className="text-lg font-semibold">{ETIQUETA_ESTADO[equipo.estado]}</p>
          {equipo.ubicacion && (
            <p className="text-sm text-gray-600">Ubicación: {equipo.ubicacion}</p>
          )}
        </div>

        {accion === "activar" && (
          <div className="mt-5">
            <label htmlFor="ubicacion" className="block text-sm font-medium text-gray-700">
              Cama
            </label>
            <select
              id="ubicacion"
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-base focus:border-gray-500 focus:outline-none"
            >
              <option value="">— sin cama —</option>
              {Array.from({ length: ESCENARIO.camas }, (_, i) => i + 1).map((n) => (
                <option key={n} value={`Cama ${n}`}>
                  Cama {n}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="button"
          onClick={confirmar}
          disabled={enviando || accion === "bloqueado"}
          className={`mt-6 w-full rounded-lg py-6 text-2xl font-bold text-white ${colorAccion} disabled:opacity-60`}
        >
          {enviando ? "…" : etiquetaAccion}
        </button>

        <button
          type="button"
          onClick={() => {
            setModalFalla(true);
            setErrorFalla(null);
          }}
          className="mt-4 w-full rounded border border-red-300 py-2 text-sm text-red-700 hover:bg-red-50"
        >
          ⚠ Reportar falla
        </button>

        <Link href="/" className="mt-3 block text-center text-sm text-gray-600 underline">
          Cancelar
        </Link>
      </div>

      {modalFalla && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !enviandoFalla && setModalFalla(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">Reportar falla — {id}</h2>

            <label className="mt-4 block text-sm font-medium text-gray-700">Tipo</label>
            <select
              value={tipoFalla}
              onChange={(e) => setTipoFalla(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-base"
            >
              {TIPOS_FALLA.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <label className="mt-4 block text-sm font-medium text-gray-700">
              Descripción (opcional)
            </label>
            <textarea
              value={descripcionFalla}
              onChange={(e) => setDescripcionFalla(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-base"
            />

            <label className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                checked={ponerEnMantenimiento}
                onChange={(e) => setPonerEnMantenimiento(e.target.checked)}
              />
              <span className="text-sm">Poner el equipo en mantenimiento</span>
            </label>

            {errorFalla && <p className="mt-3 text-sm text-red-700">{errorFalla}</p>}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={reportarFalla}
                disabled={enviandoFalla}
                className="flex-1 rounded bg-green-700 py-3 text-white disabled:opacity-60"
              >
                {enviandoFalla ? "Enviando…" : "Reportar"}
              </button>
              <button
                type="button"
                onClick={() => setModalFalla(false)}
                disabled={enviandoFalla}
                className="rounded border border-gray-400 px-5 py-3"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<main className="p-6">Cargando…</main>}>
      <ScanContent />
    </Suspense>
  );
}
