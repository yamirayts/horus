"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import type { Equipo } from "@/lib/db/equipos";
import type { Accion } from "@/lib/alertas";
import { ESCENARIO } from "@/lib/escenario";

const ELEMENT_ID = "lector-qr";
const VENTANA_ANTIDOBLE_MS = 3000; // mismo id leído antes de este tiempo se ignora
const REINTENTO_MS = 1500; // demora antes del reintento por falla de red
const CONFIRMACION_MS = 1500; // tiempo que se muestra la confirmación/error antes de reanudar
// El mismo QR debe leerse de forma sostenida por este tiempo antes de disparar.
// Sin esto, barrer la cámara sobre varios QR pegados en el panel dispara el equipo
// equivocado con el primer frame decodificado. 800 ms fuerza a apuntar y sostener.
const CONFIRMACION_LECTURA_MS = 800;
// Si pasan más de este gap sin volver a decodificar el mismo id, se descarta la
// lectura acumulada. Cubre el caso "apunté al QR correcto un rato corto, moví la
// cámara, volví" — sin esto, la lectura acumulada seguiría contando y dispararía.
const GAP_MAX_LECTURA_MS = 400;

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
  requiereRetiro?: boolean;
  horasAcumuladas?: number;
  umbral?: number;
  error?: string;
}

/** Pantalla que se muestra sobre la cámara mientras no se está escaneando activamente. */
type EstadoPantalla =
  | { tipo: "escaneando" }
  | { tipo: "consultando" }
  | { tipo: "tarjeta"; id: string; equipo: Equipo; accion: Accion }
  | { tipo: "tarjeta_error"; mensaje: string }
  | { tipo: "enviando" }
  | { tipo: "confirmando"; mensaje: string; variante: "activar" | "desactivar" | "error" | "falla" }
  | { tipo: "retiro"; id: string; horasAcumuladas?: number; umbral?: number }
  | { tipo: "sin_conexion"; mensaje: string };

interface EscaneoPendiente {
  id: string;
}

/** Reporte de falla encolado por una falla de red, para reintentar cuando vuelva la conexión. */
interface FallaPendiente {
  equipoId: string;
  tipo: string;
  descripcion?: string;
  ponerEnMantenimiento: boolean;
}

/**
 * Detiene y limpia el escáner tragándose los errores de html5-qrcode, que puede
 * lanzar excepciones síncronas cuando se pide stop en un estado inválido.
 */
function detenerYLimpiar(s: Html5Qrcode) {
  const trag = (_: unknown) => undefined;
  try {
    const p = s.stop();
    // stop() suele devolver Promise, pero por las dudas cubrimos ambos casos.
    if (p && typeof (p as Promise<unknown>).then === "function") {
      (p as Promise<unknown>).then(() => {
        try {
          s.clear();
        } catch (e) {
          trag(e);
        }
      }, trag);
    } else {
      try {
        s.clear();
      } catch (e) {
        trag(e);
      }
    }
  } catch (e) {
    trag(e);
  }
}

const ETIQUETA_ESTADO: Record<Equipo["estado"], string> = {
  disponible: "Disponible",
  en_uso: "En uso",
  mantenimiento: "En mantenimiento",
};

/** Tipos de falla que puede reportar el enfermero desde el escaneo (valores exactos que espera la DB). */
const TIPOS_FALLA: { value: string; label: string }[] = [
  { value: "no_enciende", label: "No enciende" },
  { value: "alarma", label: "Alarma" },
  { value: "bateria", label: "Batería" },
  { value: "mecanica", label: "Mecánica" },
  { value: "otra", label: "Otra" },
];

/**
 * Escáner QR de pantalla completa: abre la cámara al montar, y al decodificar un QR
 * consulta el equipo (GET /api/scan) y muestra una tarjeta de confirmación con un
 * botón grande. Solo al tocar ese botón se ejecuta el toggle (POST /api/scan).
 * Flujo de dos pasos: leer QR -> confirmar con un toque -> confirmación breve -> siguiente lectura.
 */
export default function EscanerQR() {
  const [estado, setEstado] = useState<EstadoPantalla>({ tipo: "escaneando" });

  // Mini-formulario de reporte de falla: solo se abre con un equipo ya identificado (tarjeta abierta).
  const [modalFalla, setModalFalla] = useState<{ equipoId: string } | null>(null);

  // Cama / ubicación que se envía al activar. Siempre arranca vacía: no autocompletar
  // con la ubicación del último ciclo para evitar registrar por herencia una asignación
  // equivocada (el equipo puede ir a otra cama distinta a la de su último uso).
  const [ubicacionActivar, setUbicacionActivar] = useState("");
  const [tipoFalla, setTipoFalla] = useState(TIPOS_FALLA[0].value);
  const [descripcionFalla, setDescripcionFalla] = useState("");
  const [ponerEnMantenimiento, setPonerEnMantenimiento] = useState(true);
  const [enviandoFalla, setEnviandoFalla] = useState(false);
  const [errorFalla, setErrorFalla] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const ultimoRef = useRef<{ id: string; ts: number } | null>(null);
  const pendientesRef = useRef<EscaneoPendiente[]>([]);
  const pendientesFallaRef = useRef<FallaPendiente[]>([]);
  const procesandoRef = useRef(false);
  // Candidato en confirmación: el QR se debe ver sostenido hasta que
  // (ahora - primeraLecturaTs) >= CONFIRMACION_LECTURA_MS para disparar.
  const candidatoRef = useRef<{ id: string; primeraLecturaTs: number; ultimaLecturaTs: number } | null>(null);
  // Copia del candidato para pintar el progreso; en estado (no ref) para que React re-renderice.
  const [candidatoUI, setCandidatoUI] = useState<{ id: string; progreso: number } | null>(null);

  // Hora local HH:MM para el mensaje de confirmación.
  function horaActual(): string {
    const ahora = new Date();
    return `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;
  }

  // Vuelve al estado de escaneo y reanuda la decodificación de la cámara.
  function reanudar() {
    procesandoRef.current = false;
    candidatoRef.current = null;
    setCandidatoUI(null);
    setEstado({ tipo: "escaneando" });
    scannerRef.current?.resume();
  }

  // Ejecuta el toggle en el backend. Distingue error de red (reintentable/encolable)
  // de error de aplicación (equipo desconocido, en mantenimiento: no se reintenta).
  async function enviarEscaneo(id: string, intento = 1, ubicacion?: string): Promise<void> {
    try {
      const body: { id: string; ubicacion?: string } = { id };
      // La ubicación solo se envía al activar (relevante para asignar la cama).
      if (ubicacion && ubicacion.trim()) body.ubicacion = ubicacion.trim();
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

      // Si al desactivar el equipo superó el umbral, mostrar cartel prominente que NO se
      // auto-oculta: exige acción física del personal (apartar el equipo).
      if (data.accion === "desactivar" && data.requiereRetiro) {
        setEstado({
          tipo: "retiro",
          id,
          horasAcumuladas: data.horasAcumuladas,
          umbral: data.umbral,
        });
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
          void enviarEscaneo(id, 2, ubicacion);
        }, REINTENTO_MS);
        return;
      }
      // Segundo intento también falló: encolar el escaneo (no se pierde) y seguir escaneando.
      encolarPendiente(id);
      setEstado({ tipo: "sin_conexion", mensaje: "⚠ Sin conexión — reintentando…" });
      setTimeout(reanudar, CONFIRMACION_MS);
    }
  }

  // Encola un escaneo pendiente, reemplazando cualquier entrada previa del mismo id.
  // Sin esto, reescanear el mismo QR durante un corte (2 fallas de red seguidas) deja
  // 2 entradas y al reconectar se reproducen ambas -> doble toggle sobre el mismo equipo.
  function encolarPendiente(id: string) {
    pendientesRef.current = pendientesRef.current.filter((p) => p.id !== id);
    pendientesRef.current.push({ id });
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

  // Encola un reporte de falla pendiente, reemplazando cualquier entrada previa del
  // mismo equipo (misma protección anti-doble-reintento que encolarPendiente).
  function encolarPendienteFalla(datos: FallaPendiente) {
    pendientesFallaRef.current = pendientesFallaRef.current.filter((p) => p.equipoId !== datos.equipoId);
    pendientesFallaRef.current.push(datos);
  }

  // Reintenta los reportes de falla que quedaron encolados por fallas de red previas.
  async function reintentarPendientesFalla(): Promise<void> {
    const pendientes = pendientesFallaRef.current;
    if (pendientes.length === 0) return;
    pendientesFallaRef.current = [];
    for (const p of pendientes) {
      await enviarReporteFalla(p);
    }
  }

  // Paso 1: consulta el equipo (sin efectos secundarios) y arma la tarjeta de confirmación.
  async function consultarEquipo(id: string): Promise<void> {
    try {
      const res = await fetch(`/api/scan?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data: RespuestaConsulta = await res.json();
      if (!data.ok || !data.equipo || !data.accion) {
        setEstado({ tipo: "tarjeta_error", mensaje: data.error ?? "equipo desconocido" });
        return;
      }
      // Al activar (equipo disponible), la cama se elige explícitamente cada vez —
      // no heredar la del ciclo previo. Al desactivar sí se muestra la actual como referencia.
      setUbicacionActivar(data.equipo.estado === "en_uso" ? data.equipo.ubicacion ?? "" : "");
      setEstado({ tipo: "tarjeta", id, equipo: data.equipo, accion: data.accion });
    } catch {
      setEstado({ tipo: "tarjeta_error", mensaje: "no se pudo consultar el equipo" });
    }
  }

  // Paso 2: el enfermero tocó el botón grande de la tarjeta -> recién ahí se ejecuta el toggle.
  function confirmarAccion(id: string, accion: Accion) {
    setEstado({ tipo: "enviando" });
    // La ubicación solo aplica al activar; al desactivar no se pisa.
    const ubi = accion === "activar" ? ubicacionActivar : undefined;
    void enviarEscaneo(id, 1, ubi);
  }

  // Abre el mini-formulario de falla con el equipo ya identificado por la tarjeta.
  function abrirReportarFalla(equipoId: string) {
    setTipoFalla(TIPOS_FALLA[0].value);
    setDescripcionFalla("");
    setPonerEnMantenimiento(true);
    setErrorFalla(null);
    setModalFalla({ equipoId });
  }

  function cerrarReportarFalla() {
    setModalFalla(null);
    setErrorFalla(null);
  }

  // Envía el reporte de falla. El origen lo fuerza siempre el backend a "real".
  // Misma lógica de reintento/cola que enviarEscaneo: ante falla de red reintenta una vez
  // a los 1500 ms; si vuelve a fallar, encola el reporte (no se pierde) y sigue escaneando.
  async function enviarReporteFalla(datos: FallaPendiente, intento = 1): Promise<void> {
    try {
      const res = await fetch("/api/falla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipo_id: datos.equipoId,
          tipo: datos.tipo,
          descripcion: datos.descripcion,
          ponerEnMantenimiento: datos.ponerEnMantenimiento,
        }),
      });
      const data: { ok: boolean; error?: string } = await res.json();

      if (!data.ok) {
        // Error de aplicación (ej. equipo_id faltante): no se reintenta.
        setEnviandoFalla(false);
        setErrorFalla(data.error ?? "no se pudo registrar la falla");
        return;
      }

      setEnviandoFalla(false);
      setModalFalla(null);
      setEstado({
        tipo: "confirmando",
        mensaje: datos.ponerEnMantenimiento
          ? "✓ Falla reportada — equipo en mantenimiento"
          : "✓ Falla reportada",
        variante: "falla",
      });
      setTimeout(reanudar, CONFIRMACION_MS);
    } catch {
      // Falla de red (no hubo respuesta): reintentar una vez a los 1500 ms.
      if (intento === 1) {
        setTimeout(() => {
          void enviarReporteFalla(datos, 2);
        }, REINTENTO_MS);
        return;
      }
      // Segundo intento también falló: encolar el reporte y seguir escaneando.
      encolarPendienteFalla(datos);
      setEnviandoFalla(false);
      setModalFalla(null);
      setEstado({ tipo: "sin_conexion", mensaje: "⚠ Sin conexión — reintentando…" });
      setTimeout(reanudar, CONFIRMACION_MS);
    }
  }

  // Handler del botón "Reportar" del mini-formulario: arma los datos desde el estado del form.
  async function enviarFalla(): Promise<void> {
    if (!modalFalla) return;
    setEnviandoFalla(true);
    setErrorFalla(null);
    await enviarReporteFalla({
      equipoId: modalFalla.equipoId,
      tipo: tipoFalla,
      descripcion: descripcionFalla.trim() || undefined,
      ponerEnMantenimiento,
    });
  }

  // Callback de lectura exitosa del lector QR.
  /**
   * Extrae el id de equipo del texto decodificado. Acepta tanto el id crudo
   * (ej. "BIC-014") como una URL de la app (ej. "https://.../scan?id=BIC-014").
   */
  function extraerId(texto: string): string {
    try {
      const u = new URL(texto);
      const idParam = u.searchParams.get("id");
      if (idParam) return idParam;
    } catch {
      // No es una URL válida: asumir que ya es el id crudo.
    }
    return texto;
  }

  function alLeerCodigo(textoDecodificado: string) {
    if (procesandoRef.current) return;
    const id = extraerId(textoDecodificado);
    const ahora = Date.now();
    const ultimo = ultimoRef.current;
    // Anti-doble-lectura: mismo id leído hace menos de 3000 ms se ignora.
    if (ultimo && ultimo.id === id && ahora - ultimo.ts < VENTANA_ANTIDOBLE_MS) {
      return;
    }

    const candidato = candidatoRef.current;
    // Si es un id distinto al candidato actual, o pasó demasiado tiempo desde
    // la última lectura (barrido rápido / se movió la cámara y volvió), reiniciamos
    // el conteo desde este frame.
    if (!candidato || candidato.id !== id || ahora - candidato.ultimaLecturaTs > GAP_MAX_LECTURA_MS) {
      candidatoRef.current = { id, primeraLecturaTs: ahora, ultimaLecturaTs: ahora };
      setCandidatoUI({ id, progreso: 0 });
      return;
    }

    // Mismo id, lectura sostenida: actualizar timestamp y calcular progreso.
    candidato.ultimaLecturaTs = ahora;
    const transcurrido = ahora - candidato.primeraLecturaTs;
    if (transcurrido < CONFIRMACION_LECTURA_MS) {
      setCandidatoUI({ id, progreso: Math.min(1, transcurrido / CONFIRMACION_LECTURA_MS) });
      return;
    }

    // Confirmado: mantuvo la cámara sobre el mismo QR el tiempo suficiente.
    candidatoRef.current = null;
    setCandidatoUI(null);
    ultimoRef.current = { id, ts: ahora };
    procesandoRef.current = true;
    setEstado({ tipo: "consultando" });
    scannerRef.current?.pause();
    void consultarEquipo(id);
  }

  useEffect(() => {
    const scanner = new Html5Qrcode(ELEMENT_ID);
    scannerRef.current = scanner;
    let cancelado = false;
    let iniciado = false;

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
      .then(() => {
        iniciado = true;
        // Si el componente se desmontó mientras arrancábamos, detener ya mismo.
        if (cancelado) detenerYLimpiar(scanner);
      })
      .catch((err) => {
        console.error("No se pudo iniciar la cámara:", err);
      });

    // Reintenta los pendientes (escaneos y reportes de falla) apenas vuelve la conexión,
    // y cada 5 s como respaldo.
    const alVolverConexion = () => {
      void reintentarPendientes();
      void reintentarPendientesFalla();
    };
    window.addEventListener("online", alVolverConexion);
    const intervalo = window.setInterval(() => {
      if (navigator.onLine) {
        void reintentarPendientes();
        void reintentarPendientesFalla();
      }
    }, 5000);

    return () => {
      cancelado = true;
      window.removeEventListener("online", alVolverConexion);
      window.clearInterval(intervalo);
      const s = scannerRef.current;
      scannerRef.current = null;
      // Solo intentar detener si el escáner llegó a arrancar. Envolvemos en try
      // porque html5-qrcode lanza excepciones síncronas (no promises) si el estado
      // no permite stop.
      if (s && iniciado) detenerYLimpiar(s);
    };
    // Solo se ejecuta al montar/desmontar: los callbacks usan refs, no estado cerrado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const colorVariante: Record<"activar" | "desactivar" | "error" | "falla", string> = {
    activar: "bg-emerald-700/95",
    desactivar: "bg-orange-700/95",
    error: "bg-red-700/95",
    falla: "bg-red-800/95",
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

        {/* Feedback de lectura sostenida: se muestra solo mientras el escáner está en
            estado "escaneando" y hay un QR en confirmación. Le pide a la usuaria que
            mantenga la cámara quieta y le muestra cuánto falta antes de disparar. */}
        {estado.tipo === "escaneando" && candidatoUI && (
          <div className="pointer-events-none absolute inset-x-0 top-6 flex flex-col items-center gap-2 px-6">
            <div className="rounded-full bg-black/70 px-4 py-2 text-center text-sm font-semibold text-white">
              Leyendo {candidatoUI.id} — mantené la cámara
            </div>
            <div className="h-2 w-48 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-emerald-400 transition-[width] duration-100 ease-linear"
                style={{ width: `${candidatoUI.progreso * 100}%` }}
              />
            </div>
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
              <>
                {estado.accion === "activar" && (
                  <div className="w-full max-w-xs text-left">
                    <label
                      htmlFor="ubi-activar"
                      className="block text-sm font-medium text-gray-200"
                    >
                      Cama
                    </label>
                    <select
                      id="ubi-activar"
                      value={ubicacionActivar}
                      onChange={(e) => setUbicacionActivar(e.target.value)}
                      className="mt-1 w-full rounded border border-gray-500 bg-gray-900 px-3 py-2 text-base text-white focus:border-white focus:outline-none"
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
                  onClick={() => confirmarAccion(estado.id, estado.accion)}
                  className={`w-full max-w-xs rounded-xl py-10 text-3xl font-extrabold text-white shadow-lg active:scale-95 ${
                    estado.accion === "activar" ? "bg-green-600" : "bg-orange-600"
                  }`}
                >
                  {estado.accion === "activar" ? "ACTIVAR" : "DESACTIVAR"}
                </button>
              </>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={reanudar}
                className="rounded border border-gray-500 px-4 py-2 text-sm text-gray-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => abrirReportarFalla(estado.id)}
                className="rounded border border-red-400 px-4 py-2 text-sm text-red-300"
              >
                ⚠ Reportar falla
              </button>
            </div>
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

        {estado.tipo === "retiro" && (
          <div className="absolute inset-0 flex items-center justify-center overflow-y-auto bg-red-900/95 p-4">
            <div className="w-full max-w-md rounded-xl border-4 border-red-300 bg-red-50 p-6 text-center text-red-900 shadow-2xl">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-700 text-white">
                <svg className="h-9 w-9" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M8.485 3.495a1.75 1.75 0 013.03 0l6.28 10.875A1.75 1.75 0 0116.28 17H3.72a1.75 1.75 0 01-1.515-2.63l6.28-10.875zM10 6.5a.75.75 0 00-.75.75v3.5a.75.75 0 001.5 0v-3.5A.75.75 0 0010 6.5zm0 6.75a1 1 0 100 2 1 1 0 000-2z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide">Equipo vencido</p>
              <h2 className="mt-1 text-xl font-extrabold">
                {estado.id} superó el umbral
              </h2>
              {estado.horasAcumuladas != null && estado.umbral != null && (
                <p className="mt-2 text-sm">
                  {estado.horasAcumuladas.toFixed(1)} h · umbral {estado.umbral} h
                </p>
              )}
              <div className="mt-4 rounded-lg bg-red-100 p-3 text-left text-sm">
                <p className="font-bold">Acción requerida:</p>
                <ul className="mt-1 list-disc pl-5">
                  <li>Retirar el equipo del uso clínico.</li>
                  <li>Apartarlo físicamente para mantenimiento.</li>
                  <li>Avisar al Servicio de Ingeniería Clínica.</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={reanudar}
                className="mt-4 w-full rounded bg-red-700 py-2 font-semibold text-white hover:bg-red-800"
              >
                Entendido, seguir escaneando
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 bg-gray-900 p-3">
        <span className="text-xs text-gray-400">Apuntá la cámara al código QR del equipo</span>
      </div>

      {modalFalla && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-sm rounded bg-white p-4 text-gray-900">
            <p className="mb-3 text-sm font-bold">Reportar falla — {modalFalla.equipoId}</p>

            <label className="mb-1 block text-xs font-semibold text-gray-600" htmlFor="tipo-falla">
              Tipo de falla
            </label>
            <select
              id="tipo-falla"
              value={tipoFalla}
              onChange={(e) => setTipoFalla(e.target.value)}
              disabled={enviandoFalla}
              className="mb-3 w-full rounded border border-gray-300 p-2 text-sm"
            >
              {TIPOS_FALLA.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <label className="mb-1 block text-xs font-semibold text-gray-600" htmlFor="descripcion-falla">
              Descripción (opcional)
            </label>
            <textarea
              id="descripcion-falla"
              value={descripcionFalla}
              onChange={(e) => setDescripcionFalla(e.target.value)}
              disabled={enviandoFalla}
              rows={1}
              placeholder="Detalle adicional…"
              className="mb-3 w-full rounded border border-gray-300 p-2 text-sm"
            />

            <label className="mb-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={ponerEnMantenimiento}
                onChange={(e) => setPonerEnMantenimiento(e.target.checked)}
                disabled={enviandoFalla}
              />
              Poner en mantenimiento
            </label>

            {errorFalla && <p className="mb-3 text-xs text-red-600">⚠ {errorFalla}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={cerrarReportarFalla}
                disabled={enviandoFalla}
                className="flex-1 rounded border border-gray-400 py-2 text-sm text-gray-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void enviarFalla()}
                disabled={enviandoFalla}
                className="flex-1 rounded bg-green-700 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {enviandoFalla ? "Enviando…" : "Reportar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
