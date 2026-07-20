import Link from "next/link";
import type { Equipo } from "@/lib/db/equipos";
import BarraUmbral from "@/app/components/BarraUmbral";

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
  disponible: "bg-green-100 text-green-800",
  en_uso: "bg-blue-100 text-blue-800",
  mantenimiento: "bg-gray-200 text-gray-700",
};

interface TarjetaEquipoProps {
  equipo: Equipo;
}

/** Card resumen de un equipo: id, tipo, estado, barra de umbral y ubicación. Enlaza al detalle. */
export default function TarjetaEquipo({ equipo }: TarjetaEquipoProps) {
  return (
    <Link
      href={`/equipos/${encodeURIComponent(equipo.id)}`}
      className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-400 hover:shadow"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-lg font-bold">{equipo.id}</p>
          <p className="text-sm text-gray-600">{ETIQUETA_TIPO[equipo.tipo] ?? equipo.tipo}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${COLOR_ESTADO[equipo.estado]}`}>
          {ETIQUETA_ESTADO[equipo.estado]}
        </span>
      </div>

      <BarraUmbral
        horasAcum={Number(equipo.horas_acumuladas)}
        umbral={Number(equipo.umbral_horas)}
        pctAlerta={Number(equipo.pct_alerta)}
        pctVencido={Number(equipo.pct_vencido)}
      />

      <p className="mt-2 text-xs text-gray-500">
        {equipo.ubicacion ? `Ubicación: ${equipo.ubicacion}` : "Sin ubicación asignada"}
      </p>
    </Link>
  );
}
