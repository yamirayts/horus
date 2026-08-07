import Link from "next/link";
import type { Equipo } from "@/lib/db/equipos";
import BarraUmbral from "@/app/components/BarraUmbral";
import IconoTipo from "@/app/components/IconoTipo";

const ETIQUETA_TIPO: Record<string, string> = {
  bomba_infusion: "Bomba de infusión",
  monitor: "Monitor",
  ventilador: "Ventilador",
};

const ETIQUETA_ESTADO: Record<Equipo["estado"], string> = {
  disponible: "Disponible",
  en_uso: "En uso",
  mantenimiento: "En mantenimiento",
};

const COLOR_ESTADO: Record<Equipo["estado"], string> = {
  disponible: "bg-emerald-100 text-emerald-800",
  en_uso: "bg-teal-100 text-teal-800",
  mantenimiento: "bg-amber-100 text-amber-800",
};

interface TarjetaEquipoProps {
  equipo: Equipo;
  /**
   * Horas totales del equipo AL INSTANTE (acumuladas + tiempo del ciclo abierto si está
   * en uso). Opcional: si no se pasa, se usa equipo.horas_acumuladas tal cual. La página
   * que renderiza esta card calcula el valor "en vivo" y lo inyecta para que la alerta
   * refleje el estado real cuando el equipo está corriendo un ciclo.
   */
  horasTotales?: number;
}

/** Card resumen de un equipo: icono, id, tipo, estado, barra de umbral y ubicación. */
export default function TarjetaEquipo({ equipo, horasTotales }: TarjetaEquipoProps) {
  const inactivo = !equipo.activo;
  return (
    <Link
      href={`/equipos/${encodeURIComponent(equipo.id)}`}
      className={`block rounded-lg border p-4 shadow-sm transition ${
        inactivo
          ? "border-red-200 bg-red-50/50 hover:border-red-300"
          : "border-slate-200 bg-white hover:border-emerald-400 hover:shadow"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
            <IconoTipo tipo={equipo.tipo} className="h-6 w-6" />
          </div>
          <div>
            <p className="font-mono text-lg font-bold text-slate-900">{equipo.id}</p>
            <p className="text-sm text-slate-600">{ETIQUETA_TIPO[equipo.tipo] ?? equipo.tipo}</p>
            {equipo.marca && (
              <p className="text-xs text-slate-500">
                {equipo.marca}
                {equipo.modelo ? ` · ${equipo.modelo}` : ""}
              </p>
            )}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${COLOR_ESTADO[equipo.estado]}`}>
          {ETIQUETA_ESTADO[equipo.estado]}
        </span>
      </div>

      <BarraUmbral
        horasAcum={horasTotales ?? Number(equipo.horas_acumuladas)}
        umbral={Number(equipo.umbral_horas)}
        pctAlerta={Number(equipo.pct_alerta)}
        pctVencido={Number(equipo.pct_vencido)}
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-slate-500">
          {equipo.ubicacion ? equipo.ubicacion : "Sin ubicación"}
        </span>
        {inactivo && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-800">
            dado de baja
          </span>
        )}
      </div>
    </Link>
  );
}
