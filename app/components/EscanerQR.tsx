"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import type { Equipo } from "@/lib/db/equipos";
import type { Accion } from "@/lib/alertas";

const ELEMENT_ID = "lector-qr";
const VENTANA_ANTIDOBLE_MS = 3000; // mismo id leído antes de este tiempo se ignora
const REINTENTO_MS = 1500; // demora antes del reintento por falla de red
const CONFIRMACION_MS = 1500; // tiempo que se muestra la confirmación/error antes de reanudar

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

/** Pantalla que se muestra sobre la cámara mientras no se está escaneando activamente. */
type EstadoPantalla =
  | { tipo: "escaneando" }
  | { tipo: "consultando" }
  | { tipo: "tarjeta"; id: string; equipo: Equipo; accion: Accion }
  | { tipo: "tarjeta_error"; mensaje: string }
  | { tipo: "enviando" }
  | { tipo: "confirmando"; mensaje: string; variante: "activar" | "desactivar" | "error" }
  | { tipo: "sin_conexion"; mensaje: string };

interface EscaneoPendiente {
  id: string;
}

const ETIQUETA_ESTADO: Record<Equipo["estado"], string> = {
  disponible: "Disponible",
  en_uso: "En uso",
  mantenimiento: "En mantenimiento",
};

/**
 * Escáner QR de pantalla completa: abre la cámara al montar, y al decodificar un QR
 * consulta el equipo (GET /api/scan) y muestra una tarjeta de confirmación con un
 * botón grande. Solo al tocar ese botón se ejecuta el toggle (POST /api/scan).
 * Flujo de dos pasos: leer QR -> confirmar con un toque -> confirmación breve -> siguiente lectura.
 */
export default function EscanerQR() {
  const [estado, setEstado] = useState<EstadoPantalla>({ tipo: "escaneando" });
  const [reportarFallaAbierto, setReportarFallaAbierto] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const ultimoRef = useRef<{ id: string; ts: number } | null>(null);
  const pendientesRef = useRef<EscaneoPendiente[]>([]);
  const procesandoRef = useRef(false);

  // Hora local HH:MM para el mensaje de confirmación.
  function horaActual(): string {
    const ahora = new Date();
    return `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;
  }

  // Vuelve al estado de escaneo y reanuda la decodificación de la cámara.
  function reanudar() {
    procesandoRef.current = false;
    setEstado({ tipo: "escaneando" });
    scannerRef.current?.resume();
  }

  // Ejecuta el toggle en el backend. Distingue error de red (reintentable/encolable)
  // de error de aplicación (equipo desconocido, en mantenimiento: no se reintenta).
  async function enviarEscaneo(id: string, intento = 1): Promise<void> {
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data: RespuestaScan = await res.json();

      if (!data.ok || !data.accion || data.accion === "bloqueado") {
        setEstado({
          tipo: "confirmando",
          mensaje: `⚠ ${id}: ${data.error ?? "no se pudo procesar"}`,
          variante: "error",
        });
        setTimeout(reanudar, CONFIRMACION_MS);
        return;
      }

      const etiqueta = data.accion === "activar" ? "ACTIVADO" : "DESACTIVADO";
      setEstado({
        tipo: "confirmando",
        mensaje: `✓ ${id} ${etiqueta} — ${horaActual()}`,
        variante: data.accion,
      });
      setTimeout(reanudar, CONFIRMACION_MS);
    } catch {
      // Falla de red (no hubo respuesta): reintentar una vez a los 1500 ms.
      if (intento === 1) {
        setTimeout(() => {
          void enviarEscaneo(id, 2);
        }, REINTENTO_MS);
        return;
      }
      // Segundo intento también falló: encolar el escaneo (no se pierde) y seguir escaneando.
      pendientesRef.current.push({ id });
      setEstado({ tipo: "sin_conexion", mensaje: "⚠ Sin conexión — reintentando…" });
      setTimeout(reanudar, CONFIRMACION_MS);
    }
  }

  // Reintenta los escaneos que quedaron encolados por fallas de red previas.
  async function reintentarPendientes(): Promise<void> {
    const pendientes = pendientesRef.current;
    if (pendientes.length === 0) return;
    pendientesRef.current = [];
    for (const p of pendientes) {
      await enviarEscaneo(p.id);
    }
  }

  // Paso 1: consulta el equipo (sin efectos secundarios) y arma la tarjeta de confirmación.
  async function consultarEquipo(id: string): Promise<void> {
    try {
      const res = await fetch(`/api/scan?id=${encodeURIComponent(id)}`);
      const data: RespuestaConsulta = await res.json();
      if (!data.ok || !data.equipo || !data.accion) {
        setEstado({ tipo: "tarjeta_error", mensaje: data.error ?? "equipo desconocido" });
        return;
      }
      setEstado({ tipo: "tarjeta", id, equipo: data.equipo, accion: data.accion });
    } catch {
      setEstado({ tipo: "tarjeta_error", mensaje: "no se pudo consultar el equipo" });
    }
  }

  // Paso 2: el enfermero tocó el botón grande de la tarjeta -> recién ahí se ejecuta el toggle.
  function confirmarAccion(id: string) {
    setEstado({ tipo: "enviando" });
    void enviarEscaneo(id);
  }

  // Callback de lectura exitosa del lector QR.
  function alLeerCodigo(textoDecodificado: string) {
    if (procesandoRef.current) return;
    const ahora = Date.now();
    const ultimo = ultimoRef.current;
    // Anti-doble-lectura: mismo id leído hace menos de 3000 ms se ignora.
    if (ultimo && ultimo.id === textoDecodificado && ahora - ultimo.ts < VENTANA_ANTIDOBLE_MS) {
      return;
    }
    ultimoRef.current = { id: textoDecodificado, ts: ahora };
    procesandoRef.current = true;
    setEstado({ tipo: "consultando" });
    scannerRef.current?.pause();
    void consultarEquipo(textoDecodificado);
  }

  useEffect(() => {
    const scanner = new Html5Qrcode(ELEMENT_ID);
    scannerRef.current = scanner;
    let cancelado = false;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (!cancelado) alLeerCodigo(decodedText);
        },
        () => {
          // Errores de decodificación cuadro a cuadro (sin QR en foco): se ignoran.
        }
      )
      .catch((err) => {
        console.error("No se pudo iniciar la cámara:", err);
      });

    // Reintenta los pendientes apenas vuelve la conexión, y cada 5 s como respaldo.
    const alVolverConexion = () => {
      void reintentarPendientes();
    };
    window.addEventListener("online", alVolverConexion);
    const intervalo = window.setInterval(() => {
      if (navigator.onLine) void reintentarPendientes();
    }, 5000);

    return () => {
      cancelado = true;
      window.removeEventListener("online", alVolverConexion);
      window.clearInterval(intervalo);
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        s.stop()
          .then(() => s.clear())
          .catch(() => {
            // Si ya se detuvo o nunca llegó a iniciar, no hay nada que limpiar.
          });
      }
    };
    // Solo se ejecuta al montar/desmontar: los callbacks usan refs, no estado cerrado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const colorVariante: Record<"activar" | "desactivar" | "error", string> = {
    activar: "bg-emerald-700/95",
    desactivar: "bg-orange-700/95",
    error: "bg-red-700/95",
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-black text-white">
      <div className="relative flex-1 overflow-hidden">
        <div
          id={ELEMENT_ID}
          className="h-full w-full [&>video]:h-full [&>video]:w-full [&>video]:object-cover"
        />

        {estado.tipo === "consultando" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-6 text-center text-2xl font-bold">
            Consultando…
          </div>
        )}

        {estado.tipo === "enviando" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-6 text-center text-2xl font-bold">
            Enviando…
          </div>
        )}

        {estado.tipo === "tarjeta" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/90 p-6 text-center">
            <div>
              <p className="text-sm text-gray-300">
                {estado.equipo.tipo}
                {estado.equipo.marca ? ` · ${estado.equipo.marca}` : ""}
                {estado.equipo.modelo ? ` ${estado.equipo.modelo}` : ""}
              </p>
              <p className="text-4xl font-extrabold">{estado.id}</p>
              <p className="mt-2 text-sm text-gray-400">
                Estado actual: {ETIQUETA_ESTADO[estado.equipo.estado]}
              </p>
            </div>

            {estado.accion === "bloqueado" ? (
              <button
                type="button"
                disabled
                className="w-full max-w-xs rounded-xl bg-gray-600 py-8 text-xl font-bold text-gray-300"
              >
                EQUIPO EN MANTENIMIENTO
                <br />
                <span className="text-sm font-normal">No se puede registrar uso</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => confirmarAccion(estado.id)}
                className={`w-full max-w-xs rounded-xl py-10 text-3xl font-extrabold text-white shadow-lg active:scale-95 ${
                  estado.accion === "activar" ? "bg-green-600" : "bg-orange-600"
                }`}
              >
                {estado.accion === "activar" ? "ACTIVAR" : "DESACTIVAR"}
              </button>
            )}

            <button
              type="button"
              onClick={reanudar}
              className="rounded border border-gray-500 px-4 py-2 text-sm text-gray-300"
            >
              Cancelar
            </button>
          </div>
        )}

        {estado.tipo === "tarjeta_error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/90 p-6 text-center">
            <p className="text-xl font-bold text-red-400">⚠ {estado.mensaje}</p>
            <button
              type="button"
              onClick={reanudar}
              className="rounded border border-gray-500 px-4 py-2 text-sm text-gray-300"
            >
              Cancelar
            </button>
          </div>
        )}

        {estado.tipo === "confirmando" && (
          <div
            className={`absolute inset-0 flex items-center justify-center p-6 text-center text-2xl font-bold ${colorVariante[estado.variante]}`}
          >
            {estado.mensaje}
          </div>
        )}

        {estado.tipo === "sin_conexion" && (
          <div className="absolute inset-0 flex items-center justify-center bg-amber-700/95 p-6 text-center text-2xl font-bold">
            {estado.mensaje}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 bg-gray-900 p-3">
        <span className="text-xs text-gray-400">Apuntá la cámara al código QR del equipo</span>
        <button
          type="button"
          onClick={() => setReportarFallaAbierto(true)}
          className="shrink-0 rounded border border-red-400 px-2 py-1 text-xs text-red-300"
        >
          ⚠ Reportar falla
        </button>
      </div>

      {reportarFallaAbierto && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-sm rounded bg-white p-4 text-gray-900">
            <p className="mb-3 text-sm">
              El reporte de fallas todavía no está disponible: función en Task 3.1.
            </p>
            <button
              type="button"
              onClick={() => setReportarFallaAbierto(false)}
              className="w-full rounded bg-gray-800 py-2 text-white"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
