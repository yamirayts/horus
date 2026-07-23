"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { Equipo } from "@/lib/db/equipos";
import type { Accion } from "@/lib/alertas";

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

function ScanContent() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";

  const [cargando, setCargando] = useState(true);
  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [accion, setAccion] = useState<Accion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<
    { variante: "activar" | "desactivar" | "error"; mensaje: string } | null
  >(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("Falta el id del equipo en la URL.");
      setCargando(false);
      return;
    }
    let cancelado = false;
    // no-store: cada apertura del QR debe reflejar el estado actual del equipo.
    fetch(`/api/scan?id=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((r) => r.json() as Promise<RespuestaConsulta>)
      .then((data) => {
        if (cancelado) return;
        if (!data.ok || !data.equipo || !data.accion) {
          setError(data.error ?? "Equipo desconocido.");
        } else {
          setEquipo(data.equipo);
          setAccion(data.accion);
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
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
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
        </div>

        <button
          type="button"
          onClick={confirmar}
          disabled={enviando || accion === "bloqueado"}
          className={`mt-8 w-full rounded-lg py-6 text-2xl font-bold text-white ${colorAccion} disabled:opacity-60`}
        >
          {enviando ? "…" : etiquetaAccion}
        </button>

        <Link
          href="/"
          className="mt-4 block text-center text-sm text-gray-600 underline"
        >
          Cancelar
        </Link>
      </div>
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
