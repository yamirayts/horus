import Link from "next/link";
import { listarEquipos } from "@/lib/db/equipos";
import { iniciosDeCiclosAbiertos } from "@/lib/db/ciclos";
import { horasTotalesAhora } from "@/lib/horas";
import TarjetaEquipo from "@/app/components/TarjetaEquipo";

// El estado de los equipos cambia con cada escaneo: nunca cachear esta página.
export const dynamic = "force-dynamic";

const TIPOS = [
  { value: "", label: "Todos los tipos" },
  { value: "bomba_infusion", label: "Bomba de infusión" },
  { value: "monitor", label: "Monitor" },
  { value: "ventilador", label: "Ventilador" },
];

const ESTADOS = [
  { value: "", label: "Todos los estados" },
  { value: "disponible", label: "Disponible" },
  { value: "en_uso", label: "En uso" },
  { value: "mantenimiento", label: "En mantenimiento" },
];

const BAJA_OPCIONES = [
  { value: "", label: "Solo activos" },
  { value: "incluir", label: "Incluir dados de baja" },
  { value: "solo", label: "Solo dados de baja" },
];

interface EquiposPageProps {
  searchParams: { tipo?: string; estado?: string; baja?: string };
}

/**
 * Lista de equipos con filtros por tipo/estado/baja (query params).
 * El formulario de filtro usa method="get" plano: no necesita JS para actualizar la URL.
 */
export default async function EquiposPage({ searchParams }: EquiposPageProps) {
  const tipo = searchParams.tipo || undefined;
  const estado = searchParams.estado || undefined;
  const baja = searchParams.baja;
  const [equipos, ciclosAbiertos] = await Promise.all([
    listarEquipos({
      tipo,
      estado,
      incluirBajas: baja === "incluir",
      soloBajas: baja === "solo",
    }),
    iniciosDeCiclosAbiertos(),
  ]);
  // Horas totales al instante = acumuladas + tiempo del ciclo abierto (si está en uso).
  // Se calcula acá una sola vez y se pasa a cada tarjeta, para reflejar el estado en vivo.
  const ahora = new Date();
  const equiposConHorasEnVivo = equipos.map((eq) => ({
    ...eq,
    horasTotales: horasTotalesAhora(Number(eq.horas_acumuladas), ciclosAbiertos[eq.id] ?? null, ahora),
  }));

  return (
    <main className="mx-auto max-w-5xl p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Equipos</h1>
        <Link href="/alta" className="rounded bg-gray-900 px-3 py-2 text-sm font-semibold text-white">
          + Alta de equipo
        </Link>
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <select
          name="tipo"
          defaultValue={tipo ?? ""}
          className="rounded border border-gray-300 px-2 py-2 text-sm"
        >
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          name="estado"
          defaultValue={estado ?? ""}
          className="rounded border border-gray-300 px-2 py-2 text-sm"
        >
          {ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
        <select
          name="baja"
          defaultValue={baja ?? ""}
          className="rounded border border-gray-300 px-2 py-2 text-sm"
        >
          {BAJA_OPCIONES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded bg-gray-200 px-3 py-2 text-sm font-semibold">
          Filtrar
        </button>
        {(tipo || estado || baja) && (
          <Link href="/equipos" className="text-sm text-gray-600 underline">
            Limpiar filtros
          </Link>
        )}
      </form>

      <p className="mb-3 text-sm text-gray-500">
        {equipos.length} {equipos.length === 1 ? "equipo" : "equipos"}
      </p>

      {equipos.length === 0 ? (
        <p className="text-sm text-gray-500">No hay equipos que coincidan con el filtro.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {equiposConHorasEnVivo.map((eq) => (
            <TarjetaEquipo key={eq.id} equipo={eq} horasTotales={eq.horasTotales} />
          ))}
        </div>
      )}
    </main>
  );
}
