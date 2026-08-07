import Link from "next/link";
import { construirTablero, TIPOS_EQUIPO, HORAS_PERIODO_TUE, type EquipoTablero } from "@/lib/tablero";
import BarraUmbral from "@/app/components/BarraUmbral";
import IconoTipo from "@/app/components/IconoTipo";
import AutoRefresh from "@/app/components/AutoRefresh";

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
  normal: "bg-emerald-100 text-emerald-800",
  subutilizado: "bg-slate-100 text-slate-700",
};

/**
 * Tablero de Ingeniería Clínica: panel de alertas destacado, resumen por tipo con
 * KPI cards, tabla de equipos ordenada por urgencia e indicadores EN 15341
 * (TUE, MTBF, proyección de PM).
 */
export default async function TableroPage() {
  const { resumen, alertas, vencidos, enFalla, equipos, mtbfPorTipo } = await construirTablero();

  const maxHoras = Math.max(1, ...TIPOS_EQUIPO.map((t) => resumen[t].horasAcumuladas));
  const conProyeccion = equipos.filter(
    (e) => e.nivel !== "ok" && e.indicadores.proyeccionDias !== null
  );
  const totalEquipos = TIPOS_EQUIPO.reduce((acc, t) => acc + resumen[t].total, 0);

  return (
    <main className="mx-auto max-w-6xl p-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tablero de Ingeniería Clínica</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-sm text-slate-500">{totalEquipos} equipos activos</p>
            <AutoRefresh intervalMs={30_000} />
          </div>
        </div>
        <Link
          href="/equipos"
          className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-emerald-400 hover:text-emerald-800"
        >
          Ver listado completo →
        </Link>
      </div>

      {/* 1. Panel de alertas: KPI cards destacadas con colores fuertes. */}
      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/equipos"
          className="group rounded-xl border-2 border-red-300 bg-gradient-to-br from-red-50 to-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <p className="text-4xl font-extrabold text-red-700">{vencidos.length}</p>
            <svg className="h-8 w-8 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M8.485 3.495a1.75 1.75 0 013.03 0l6.28 10.875A1.75 1.75 0 0116.28 17H3.72a1.75 1.75 0 01-1.515-2.63l6.28-10.875zM10 6.5a.75.75 0 00-.75.75v3.5a.75.75 0 001.5 0v-3.5A.75.75 0 0010 6.5zm0 6.75a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="mt-1 text-sm font-semibold text-red-800">Vencidos</p>
          <p className="text-xs text-red-600">Superaron el umbral de mantenimiento</p>
        </Link>

        <Link
          href="/equipos"
          className="group rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <p className="text-4xl font-extrabold text-amber-700">{alertas.length}</p>
            <svg className="h-8 w-8 text-amber-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="mt-1 text-sm font-semibold text-amber-800">En aviso</p>
          <p className="text-xs text-amber-600">Se acercan al umbral (≥ % aviso)</p>
        </Link>

        <Link
          href="/equipos?estado=mantenimiento"
          className="group rounded-xl border-2 border-slate-300 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <p className="text-4xl font-extrabold text-slate-700">{enFalla.length}</p>
            <svg className="h-8 w-8 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M11.49 3.17a2.5 2.5 0 013.34 3.34l-9.19 9.2A2 2 0 014.22 16H3v-1.22c0-.53.21-1.04.59-1.41l9.2-9.2z" />
            </svg>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-800">En falla o mantenimiento</p>
          <p className="text-xs text-slate-600">Fuera de servicio operativo</p>
        </Link>
      </section>

      {/* 2. Resumen por tipo con icono grande. */}
      <section className="mb-6">
        <h2 className="mb-2 font-semibold text-slate-900">Resumen por tipo de equipo</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TIPOS_EQUIPO.map((tipo) => {
            const r = resumen[tipo];
            return (
              <div
                key={tipo}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                    <IconoTipo tipo={tipo} className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{ETIQUETA_TIPO[tipo]}</p>
                    <p className="text-xs text-slate-500">Total: {r.total}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded bg-emerald-50 py-2">
                    <p className="text-xl font-bold text-emerald-800">{r.disponible}</p>
                    <p className="text-[10px] uppercase tracking-wide text-emerald-700">Disponibles</p>
                  </div>
                  <div className="rounded bg-teal-50 py-2">
                    <p className="text-xl font-bold text-teal-800">{r.en_uso}</p>
                    <p className="text-[10px] uppercase tracking-wide text-teal-700">En uso</p>
                  </div>
                  <div className="rounded bg-amber-50 py-2">
                    <p className="text-xl font-bold text-amber-800">{r.mantenimiento}</p>
                    <p className="text-[10px] uppercase tracking-wide text-amber-700">Mant.</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Horas acumuladas por tipo (barras) */}
      <section className="mb-6">
        <h2 className="mb-2 font-semibold text-slate-900">Horas acumuladas por tipo</h2>
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {TIPOS_EQUIPO.map((tipo) => {
            const horas = resumen[tipo].horasAcumuladas;
            const ancho = Math.max(2, Math.round((horas / maxHoras) * 100));
            return (
              <div key={tipo} className="flex items-center gap-3 text-sm">
                <span className="w-36 shrink-0 font-medium text-slate-700">
                  {ETIQUETA_TIPO[tipo]}
                </span>
                <div className="h-5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                    style={{ width: `${ancho}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right font-semibold text-slate-700">
                  {horas.toFixed(0)} h
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Tabla de equipos ordenados por urgencia */}
      <section className="mb-6">
        <h2 className="mb-2 font-semibold text-slate-900">Equipos ({equipos.length})</h2>
        {equipos.length === 0 ? (
          <p className="text-sm text-slate-500">No hay equipos cargados.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="p-3">Equipo</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Umbral</th>
                  <th className="p-3">Ubicación</th>
                </tr>
              </thead>
              <tbody>
                {equipos.map((eq: EquipoTablero) => (
                  <tr key={eq.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="p-3">
                      <Link
                        href={`/equipos/${encodeURIComponent(eq.id)}`}
                        className="flex items-center gap-2"
                      >
                        <div className="rounded bg-emerald-50 p-1 text-emerald-700">
                          <IconoTipo tipo={eq.tipo} className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-mono font-semibold text-slate-900">{eq.id}</p>
                          <p className="text-xs text-slate-500">{ETIQUETA_TIPO[eq.tipo] ?? eq.tipo}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="p-3 whitespace-nowrap text-slate-700">
                      {ETIQUETA_ESTADO[eq.estado] ?? eq.estado}
                    </td>
                    <td className="min-w-[10rem] p-3">
                      <BarraUmbral
                        horasAcum={eq.horasTotales}
                        umbral={Number(eq.umbral_horas)}
                        pctAlerta={Number(eq.pct_alerta)}
                        pctVencido={Number(eq.pct_vencido)}
                      />
                    </td>
                    <td className="p-3 text-slate-600">{eq.ubicacion ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 5. Indicadores EN 15341 */}
      <section className="mb-6">
        <h2 className="mb-2 font-semibold text-slate-900">Indicadores (EN 15341)</h2>

        <div className="mb-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-slate-900">
            Tasa de uso (TUE) — últimos {HORAS_PERIODO_TUE / 24} días
          </p>
          {equipos.length === 0 ? (
            <p className="text-sm text-slate-500">Sin equipos.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {equipos.map((eq) => (
                <li
                  key={eq.id}
                  className="flex items-center justify-between gap-2 border-b border-slate-100 py-1 last:border-0"
                >
                  <span className="font-mono text-slate-800">{eq.id}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-slate-600">{eq.indicadores.tue}%</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COLOR_TUE[eq.indicadores.tueClase]}`}
                    >
                      {ETIQUETA_TUE[eq.indicadores.tueClase]}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mb-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-slate-900">MTBF por tipo</p>
          <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm sm:grid-cols-3">
            {TIPOS_EQUIPO.map((tipo) => (
              <div key={tipo} className="flex justify-between gap-2 sm:block">
                <dt className="text-slate-500">{ETIQUETA_TIPO[tipo]}</dt>
                <dd className="font-semibold text-slate-900">
                  {mtbfPorTipo[tipo] !== null ? `${mtbfPorTipo[tipo]!.toFixed(1)} h` : "sin fallas"}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
            Nota: los datos de fallas incluyen fallas sintéticas cargadas para pruebas — ver informe del TFI.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-slate-900">
            Proyección de próximo mantenimiento (PM)
          </p>
          {conProyeccion.length === 0 ? (
            <p className="text-sm text-slate-500">Ningún equipo se acerca al umbral por ahora.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {conProyeccion.map((eq) => (
                <li
                  key={eq.id}
                  className="flex items-center justify-between gap-2 border-b border-slate-100 py-1 last:border-0"
                >
                  <span className="font-mono text-slate-800">{eq.id}</span>
                  <span className="text-slate-600">
                    {eq.indicadores.proyeccionDias === 0
                      ? "ya superó el umbral de aviso"
                      : `≈ ${eq.indicadores.proyeccionDias} días al ritmo actual`}
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
