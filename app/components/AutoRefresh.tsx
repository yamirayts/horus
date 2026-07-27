"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  /** Intervalo entre refrescos, en milisegundos. Default 30 s. */
  intervalMs?: number;
  /** Mostrar u ocultar el indicador visual. Default true. */
  mostrarIndicador?: boolean;
}

/**
 * Refresca los datos del server component cada intervalMs sin recargar la página
 * completa (mantiene el scroll y el estado del cliente). Pausa el refresco cuando
 * la pestaña queda oculta, para no consumir compute innecesariamente.
 */
export default function AutoRefresh({ intervalMs = 30_000, mostrarIndicador = true }: Props) {
  const router = useRouter();
  const [ultimoRefresco, setUltimoRefresco] = useState<Date | null>(null);
  const idIntervaloRef = useRef<number | null>(null);

  useEffect(() => {
    function iniciar() {
      if (idIntervaloRef.current != null) return;
      idIntervaloRef.current = window.setInterval(() => {
        router.refresh();
        setUltimoRefresco(new Date());
      }, intervalMs);
    }
    function detener() {
      if (idIntervaloRef.current != null) {
        window.clearInterval(idIntervaloRef.current);
        idIntervaloRef.current = null;
      }
    }
    // Solo refrescar cuando la pestaña está visible.
    function alCambiarVisibilidad() {
      if (document.hidden) detener();
      else iniciar();
    }
    if (!document.hidden) iniciar();
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    return () => {
      detener();
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    };
  }, [router, intervalMs]);

  if (!mostrarIndicador) return null;

  const hh = ultimoRefresco
    ? `${String(ultimoRefresco.getHours()).padStart(2, "0")}:${String(ultimoRefresco.getMinutes()).padStart(2, "0")}:${String(ultimoRefresco.getSeconds()).padStart(2, "0")}`
    : null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 print:hidden">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      Auto-actualiza cada {Math.round(intervalMs / 1000)}s
      {hh && <span className="text-emerald-600">· {hh}</span>}
    </span>
  );
}
