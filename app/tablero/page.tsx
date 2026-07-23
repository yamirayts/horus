import Link from "next/link";
import { construirTablero, TIPOS_EQUIPO, HORAS_PERIODO_TUE, type EquipoTablero } from "@/lib/tablero";
import BarraUmbral from "@/app/components/BarraUmbral";

// Horas y estados cambian con cada escaneo/falla: nunca cachear esta página.
export const dynamic = "force-dynamic";

const ETIQUETA_TIPO: Record<string, string> = {
  bomba_infusion: "Bomba de infusión",
  monitor: "Monitor",
  ventilador: "Ventilador",
};

const ETIQUETA_ESTADO: Record<string, string> = {
  disponible: "Disponible",
  en_uso: "En uso",
  mantenimiento: "En mantenimiento",
};

const ETIQUETA_TUE: Record<string, string> = {
  sobreexigido: "Sobreexigido",
  normal: "Normal",
  subutilizado: "Subutilizado",
};

const COLOR_TUE: Record<string, string> = {
  sobreexigido: "bg-red-100 text-red-800",
  normal: "bg-green-100 text-green-800",
  subutilizado: "bg-gray-200 text-gray-700",
};

/**
 * Tablero de Ingeniería Clínica: panel de alertas, resumen por tipo, tabla de equipos
 * ordenada por urgencia e indicadores EN 15341 (TUE, MTBF, proyección de PM).
 * Llama directo a lib/tablero (misma lógica que consume /api/tablero) para evitar un
 * fetch a sí mismo desde un server component.
 */
export default async function TableroPage() {
  const { resumen, alertas, vencidos, enFalla, equipos, mtbfPorTipo } = await construirTablero();

  const maxHoras = Math.max(1, ...TIPOS_EQUIPO.map((t) => resumen[t].horasAcumuladas));
  // Equipos a los que conviene anticipar el PM: en aviso y con proyección calculable.
  const conProyeccion = equipos.filter(
    (e) => e.nivel !== "ok" && e.indicadores.proyeccionDias !== null
  );

  return (
    <main className="mx-auto max-w-5xl p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Tablero de Ingeniería Clínica</h1>
        <Link href="/equipos" className="text-sm text-gray-600 underline">
          Ver listado de equipos →
        </Link>
      </div>

      {/* 1. Panel de alertas */}
      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/equipos"
          className="rounded-lg border border-red-200 bg-red-50 p-4 transition hover:border-red-400"
        >
          <p className="text-3xl font-bold text-red-700">{vencidos.length}</p>
          <p className="text-sm font-semibold text-red-700">Vencidos</p>
          <p className="text-xs text-red-600">Superaron el umbral de mantenimiento</p>
        </Link>
        <Link
          href="/equipos"
          className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 transition hover:border-yellow-400"
        >
          <p className="text-3xl font-bold text-yellow-700">{alertas.length}</p>
          <p className="text-sm font-semibold text-yellow-700">En aviso</p>
          <p className="text-xs text-yellow-600">Se acercan al umbral</p>
        </Link>
        <Link
          href="/equipos?estado=mantenimiento"
          className="rounded-lg border border-gray-300 bg-gray-100 p-4 transition hover:border-gray-500"
        >
          <p className="text-3xl font-bold text-gray-700">{enFalla.length}</p>
          <p className="text-sm font-semibold text-gray-700">En falla</p>
          <p className="text-xs text-gray-600">En mantenimiento o con fallas registradas</p>
        </Link>
      </section>

      {/* 2. Tarjetas de resumen por tipo */}
      <section className="mb-6">
        <h2 className="mb-2 font-semibold">Resumen por tipo</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TIPOS_EQUIPO.map((tipo) => {
            const r = resumen[tipo];
            return (
              <div key={tipo} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="mb-2 font-semibold">{ETIQUETA_TIPO[tipo]}</p>
                <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                  <dt className="text-gray-500">Total</dt>
                  <dd className="text-right font-semibold">{r.total}</dd>
                  <dt className="text-gray-500">En uso</dt>
                  <dd className="text-right">{r.en_uso}</dd>
                  <dt className="text-gray-500">Disponibles</dt>
                  <dd className="text-right">{r.disponible}</dd>
                  <dt className="text-gray-500">En mantenimiento</dt>
                  <dd className="text-right">{r.mantenimiento}</dd>
                </dl>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Gráfico de horas acumuladas por tipo (barras CSS, sin dependencias) */}
      <section className="mb-6">
        <h2 className="mb-2 font-semibold">Horas acumuladas por tipo</h2>
        <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          {TIPOS_EQUIPO.map((tipo) => {
            const horas = resumen[tipo].horasAcumuladas;
            const ancho = Math.max(2, Math.round((horas / maxHoras) * 100));
            return (
              <div key={tipo} className="flex items-center gap-2 text-sm">
                <span className="w-32 shrink-0 text-gray-600">{ETIQUETA_TIPO[tipo]}</span>
                <div className="h-4 flex-1 overflow-hidden rounded bg-gray-100">
                  <div className="h-full rounded bg-blue-500" style={{ width: `${ancho}%` }} />
                </div>
                <span className="w-20 shrink-0 text-right text-gray-600">{horas.toFixed(0)} h</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Tabla de equipos, más urgentes primero (ya vienen ordenados por %umbral desc) */}
      <section className="mb-6">
        <h2 className="mb-2 font-semibold">Equipos ({equipos.length})</h2>
        {equipos.length === 0 ? (
          <p className="text-sm text-gray-500">No hay equipos cargados.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="p-2">ID</th>
                  <th className="p-2">Tipo</th>
                  <th className="p-2">Estado</th>
                  <th className="p-2">Umbral</th>
                  <th className="p-2">Ubicación</th>
                </tr>
              </thead>
              <tbody>
                {equipos.map((eq: EquipoTablero) => (
                  <tr key={eq.id} className="border-b border-gray-100 last:border-0">
                    <td className="p-2">
                      <Link href={`/equipos/${encodeURIComponent(eq.id)}`} className="font-mono font-semibold underline">
                        {eq.id}
                      </Link>
                    </td>
                    <td className="p-2 whitespace-nowrap">{ETIQUETA_TIPO[eq.tipo] ?? eq.tipo}</td>
                    <td className="p-2 whitespace-nowrap">{ETIQUETA_ESTADO[eq.estado] ?? eq.estado}</td>
                    <td className="min-w-[10rem] p-2">
                      <BarraUmbral
                        horasAcum={Number(eq.horas_acumuladas)}
                        umbral={Number(eq.umbral_horas)}
                        pctAlerta={Number(eq.pct_alerta)}
                        pctVencido={Number(eq.pct_vencido)}
                      />
                    </td>
                    <td className="p-2 text-gray-600">{eq.ubicacion ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 4. Bloque de indicadores EN 15341 */}
      <section className="mb-6">
        <h2 className="mb-2 font-semibold">Indicadores</h2>

        <div className="mb-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-semibold">
            TUE por equipo (Tasa de Uso, últimos {HORAS_PERIODO_TUE / 24} días)
          </p>
          {equipos.length === 0 ? (
            <p className="text-sm text-gray-500">Sin equipos.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {equipos.map((eq) => (
                <li key={eq.id} className="flex items-center justify-between gap-2 border-b border-gray-100 py-1 last:border-0">
                  <span className="font-mono">{eq.id}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-gray-600">{eq.indicadores.tue}%</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COLOR_TUE[eq.indicadores.tueClase]}`}>
                      {ETIQUETA_TUE[eq.indicadores.tueClase]}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mb-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-semibold">MTBF por tipo</p>
          <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm sm:grid-cols-3">
            {TIPOS_EQUIPO.map((tipo) => (
              <div key={tipo} className="flex justify-between gap-2 sm:block">
                <dt className="text-gray-500">{ETIQUETA_TIPO[tipo]}</dt>
                <dd className="font-semibold">
                  {mtbfPorTipo[tipo] !== null ? `${mtbfPorTipo[tipo]!.toFixed(1)} h` : "sin fallas"}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-gray-500">
            Nota: los datos de fallas incluyen fallas sintéticas cargadas para pruebas — ver informe.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-semibold">Proyección de próximo mantenimiento (PM)</p>
          {conProyeccion.length === 0 ? (
            <p className="text-sm text-gray-500">Ningún equipo se acerca al umbral por ahora.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {conProyeccion.map((eq) => (
                <li key={eq.id} className="flex items-center justify-between gap-2 border-b border-gray-100 py-1 last:border-0">
                  <span className="font-mono">{eq.id}</span>
                  <span className="text-gray-600">
                    {eq.indicadores.proyeccionDias === 0
                      ? "ya alcanzó el umbral de aviso"
                      : `≈ ${eq.indicadores.proyeccionDias} días al ritmo de uso actual`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
