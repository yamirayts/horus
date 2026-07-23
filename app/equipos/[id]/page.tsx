import Link from "next/link";
import { notFound } from "next/navigation";
import { getEquipo } from "@/lib/db/equipos";
import { listarCiclos } from "@/lib/db/ciclos";
import { listarMantenimientos } from "@/lib/db/mantenimientos";
import { listarFallas } from "@/lib/db/fallas";
import { listarLecturas } from "@/lib/db/horometro";
import BarraUmbral from "@/app/components/BarraUmbral";
import EquipoAcciones from "./EquipoAcciones";
import HorometroLecturas from "./HorometroLecturas";
import ZonaAccionesCriticas from "./ZonaAccionesCriticas";

// El estado y las horas cambian con cada escaneo: nunca cachear esta página.
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

// Chip de color según el estado del equipo.
const COLOR_ESTADO: Record<string, string> = {
  disponible: "bg-emerald-100 text-emerald-800",
  en_uso: "bg-teal-100 text-teal-800",
  mantenimiento: "bg-amber-100 text-amber-800",
};

interface DetalleEquipoPageProps {
  params: { id: string };
}

/**
 * Detalle de un equipo: horas discriminadas (iniciales vs. ciclos reales), barra de
 * umbral, historial de ciclos/mantenimientos/fallas, y acciones de gestión (cliente).
 * La zona de acciones críticas se renderiza al final del todo.
 */
export default async function DetalleEquipoPage({ params }: DetalleEquipoPageProps) {
  const equipo = await getEquipo(params.id);
  if (!equipo) notFound();

  const [ciclos, mantenimientos, fallas, lecturasHorometro] = await Promise.all([
    listarCiclos(equipo.id, 20),
    listarMantenimientos(equipo.id),
    listarFallas(equipo.id),
    listarLecturas(equipo.id),
  ]);

  // NUMERIC de postgres llega como string: convertir antes de operar.
  const horasAcum = Number(equipo.horas_acumuladas);
  const horasIniciales = Number(equipo.horas_iniciales);
  const horasReales = Math.max(0, horasAcum - horasIniciales);
  const umbral = Number(equipo.umbral_horas);
  const pctAlerta = Number(equipo.pct_alerta);
  const pctVencido = Number(equipo.pct_vencido);
  const totalActividad =
    ciclos.length + mantenimientos.length + fallas.length + lecturasHorometro.length;

  return (
    <main className="mx-auto max-w-4xl p-4">
      <Link
        href="/equipos"
        className="mb-4 inline-block text-sm text-slate-600 hover:text-slate-900 print:hidden"
      >
        ← Volver a equipos
      </Link>

      {/* Banner de baja lógica, visible arriba del todo. */}
      {!equipo.activo && (
        <div className="mb-4 rounded-lg border-2 border-red-400 bg-red-50 p-4 text-red-900 print:hidden">
          <p className="font-semibold">Equipo dado de baja</p>
          <p className="text-sm">
            {equipo.fecha_baja ? `Fecha: ${new Date(equipo.fecha_baja).toLocaleString("es-AR")}` : ""}
            {equipo.motivo_baja ? ` · Motivo: ${equipo.motivo_baja}` : ""}
          </p>
          <p className="mt-1 text-sm">
            No aparece en el tablero ni en el listado por defecto, y no puede escanearse. El historial
            se conserva. Podés reactivarlo desde la zona de acciones críticas al final de la página.
          </p>
        </div>
      )}

      {/* Header: id, tipo, marca/modelo/serie, chip de estado. */}
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <p className="text-sm font-medium text-emerald-700">
            {ETIQUETA_TIPO[equipo.tipo] ?? equipo.tipo}
          </p>
          <h1 className="font-mono text-3xl font-bold text-slate-900">{equipo.id}</h1>
          <p className="text-sm text-slate-600">
            {equipo.marca ?? "—"}
            {equipo.modelo ? ` · ${equipo.modelo}` : ""}
          </p>
          {equipo.numero_serie && (
            <p className="text-sm text-slate-600">N° de serie: {equipo.numero_serie}</p>
          )}
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            COLOR_ESTADO[equipo.estado] ?? "bg-slate-100 text-slate-700"
          }`}
        >
          {ETIQUETA_ESTADO[equipo.estado] ?? equipo.estado}
        </span>
      </header>

      {/* Hero de horas y barra de umbral. Datos importantes destacados. */}
      <section className="mb-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Horas acumuladas</p>
            <p className="text-2xl font-bold text-slate-900">{horasAcum.toFixed(1)} h</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Umbral de PM</p>
            <p className="text-2xl font-bold text-slate-900">{umbral} h</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Ciclos reales</p>
            <p className="text-lg font-semibold text-slate-700">{horasReales.toFixed(1)} h</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Ubicación</p>
            <p className="text-lg font-semibold text-slate-700">{equipo.ubicacion ?? "—"}</p>
          </div>
        </div>
        <BarraUmbral horasAcum={horasAcum} umbral={umbral} pctAlerta={pctAlerta} pctVencido={pctVencido} />
        {horasIniciales > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            Del total acumulado, {horasIniciales.toFixed(1)} h fueron carga inicial (uso previo).
          </p>
        )}
      </section>

      {/* Gestión: mantenimiento, config, QR. */}
      <div className="mb-5">
        <EquipoAcciones
          equipoId={equipo.id}
          umbralHoras={umbral}
          pctAlerta={pctAlerta}
          pctVencido={pctVencido}
          marca={equipo.marca}
          modelo={equipo.modelo}
          numeroSerie={equipo.numero_serie}
        />
      </div>

      {/* Historiales. */}
      <section className="mb-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <h2 className="mb-2 font-semibold text-slate-900">Historial de ciclos ({ciclos.length})</h2>
        {ciclos.length === 0 ? (
          <p className="text-sm text-slate-500">Sin ciclos registrados todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-1 pr-2">Inicio</th>
                  <th className="py-1 pr-2">Fin</th>
                  <th className="py-1 pr-2">Horas</th>
                  <th className="py-1 pr-2">Ubicación</th>
                  <th className="py-1">Origen</th>
                </tr>
              </thead>
              <tbody>
                {ciclos.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-1 pr-2">{new Date(c.inicio).toLocaleString("es-AR")}</td>
                    <td className="py-1 pr-2">{c.fin ? new Date(c.fin).toLocaleString("es-AR") : "en curso"}</td>
                    <td className="py-1 pr-2">{c.horas_ciclo != null ? Number(c.horas_ciclo).toFixed(2) : "—"}</td>
                    <td className="py-1 pr-2">{c.ubicacion ?? "—"}</td>
                    <td className="py-1">
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          c.origen === "sintetico" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {c.origen}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <h2 className="mb-2 font-semibold text-slate-900">Mantenimientos ({mantenimientos.length})</h2>
        {mantenimientos.length === 0 ? (
          <p className="text-sm text-slate-500">Sin mantenimientos registrados.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {mantenimientos.map((m) => (
              <li key={m.id} className="border-b border-slate-100 pb-2 last:border-0">
                <span className="font-semibold">{m.tipo ?? "—"}</span> · {new Date(m.fecha).toLocaleString("es-AR")}
                {m.horas_al_momento != null ? ` · ${Number(m.horas_al_momento).toFixed(1)} h al momento` : ""}
                {m.tecnico ? ` · ${m.tecnico}` : ""}
                {m.descripcion ? <p className="text-slate-600">{m.descripcion}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <h2 className="mb-2 font-semibold text-slate-900">Fallas ({fallas.length})</h2>
        {fallas.length === 0 ? (
          <p className="text-sm text-slate-500">Sin fallas registradas.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {fallas.map((f) => (
              <li key={f.id} className="border-b border-slate-100 pb-2 last:border-0">
                <span className="font-semibold">{f.tipo ?? "—"}</span> · {new Date(f.fecha).toLocaleString("es-AR")}
                {f.origen === "sintetico" ? (
                  <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                    dato sintético
                  </span>
                ) : null}
                {f.descripcion ? <p className="text-slate-600">{f.descripcion}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <HorometroLecturas equipoId={equipo.id} lecturas={lecturasHorometro} />

      {/* Zona de acciones críticas AL FINAL de la página. */}
      <ZonaAccionesCriticas
        equipoId={equipo.id}
        activo={equipo.activo}
        totalActividad={totalActividad}
      />
    </main>
  );
}
