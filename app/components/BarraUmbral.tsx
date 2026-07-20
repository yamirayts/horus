import { estadoAlerta, pctUmbral } from "@/lib/alertas";

interface BarraUmbralProps {
  horasAcum: number;
  umbral: number;
  pctAlerta: number;
  pctVencido: number;
}

const COLOR_BARRA: Record<string, string> = {
  ok: "bg-green-500",
  aviso: "bg-yellow-500",
  vencido: "bg-red-500",
};

const COLOR_TEXTO: Record<string, string> = {
  ok: "text-green-700",
  aviso: "text-yellow-700",
  vencido: "text-red-700",
};

const ETIQUETA: Record<string, string> = { ok: "OK", aviso: "Aviso", vencido: "Vencido" };

/**
 * Barra de progreso de horas de uso respecto del umbral de mantenimiento.
 * Componente puro de presentación (server-compatible, sin estado ni efectos).
 */
export default function BarraUmbral({ horasAcum, umbral, pctAlerta, pctVencido }: BarraUmbralProps) {
  // Los valores numéricos pueden llegar como string (driver postgres devuelve NUMERIC así).
  const horas = Number(horasAcum);
  const tope = Number(umbral);
  const alerta = Number(pctAlerta);
  const vencido = Number(pctVencido);

  const estado = estadoAlerta(horas, tope, alerta, vencido);
  const pct = pctUmbral(horas, tope);
  const anchoBarra = Math.min(pct, 100);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className={`font-semibold ${COLOR_TEXTO[estado]}`}>{ETIQUETA[estado]}</span>
        <span className="text-gray-600">
          {horas.toFixed(1)} / {tope} h ({pct}%)
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full rounded-full ${COLOR_BARRA[estado]}`} style={{ width: `${anchoBarra}%` }} />
      </div>
    </div>
  );
}
