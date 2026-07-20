import Link from "next/link";
import { notFound } from "next/navigation";
import { getEquipo } from "@/lib/db/equipos";
import { listarCiclos } from "@/lib/db/ciclos";
import { listarMantenimientos } from "@/lib/db/mantenimientos";
import { listarFallas } from "@/lib/db/fallas";
import BarraUmbral from "@/app/components/BarraUmbral";
import EquipoAcciones from "./EquipoAcciones";

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

interface DetalleEquipoPageProps {
  params: { id: string };
}

/**
 * Detalle de un equipo: horas discriminadas (iniciales vs. ciclos reales), barra de
 * umbral, historial de ciclos/mantenimientos/fallas, y acciones de gestión (cliente).
 */
export default async function DetalleEquipoPage({ params }: DetalleEquipoPageProps) {
  const equipo = await getEquipo(params.id);
  if (!equipo) notFound();

  const [ciclos, mantenimientos, fallas] = await Promise.all([
    listarCiclos(equipo.id, 20),
    listarMantenimientos(equipo.id),
    listarFallas(equipo.id),
  ]);

  // NUMERIC de postgres llega como string: convertir antes de operar.
  const horasAcum = Number(equipo.horas_acumuladas);
  const horasIniciales = Number(equipo.horas_iniciales);
  const horasReales = Math.max(0, horasAcum - horasIniciales);
  const umbral = Number(equipo.umbral_horas);
  const pctAlerta = Number(equipo.pct_alerta);
  const pctVencido = Number(equipo.pct_vencido);

  return (
    <main className="mx-auto max-w-4xl p-4">
      <Link href="/equipos" className="mb-4 inline-block text-sm text-gray-600 underline print:hidden">
        ← Volver a equipos
      </Link>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-2 print:hidden">
        <div>
          <h1 className="font-mono text-2xl font-bold">{equipo.id}</h1>
          <p className="text-sm text-gray-600">
            {ETIQUETA_TIPO[equipo.tipo] ?? equipo.tipo}
            {equipo.marca ? ` · ${equipo.marca}` : ""}
            {equipo.modelo ? ` ${equipo.modelo}` : ""}
          </p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
          {ETIQUETA_ESTADO[equipo.estado] ?? equipo.estado}
        </span>
      </div>

      <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4 print:hidden">
        <BarraUmbral horasAcum={horasAcum} umbral={umbral} pctAlerta={pctAlerta} pctVencido={pctVencido} />
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-gray-500">Horas iniciales</dt>
            <dd className="font-semibold">{horasIniciales.toFixed(1)} h</dd>
          </div>
          <div>
            <dt className="text-gray-500">Horas de ciclos reales</dt>
            <dd className="font-semibold">{horasReales.toFixed(1)} h</dd>
          </div>
          <div>
            <dt className="text-gray-500">Horas acumuladas</dt>
            <dd className="font-semibold">{horasAcum.toFixed(1)} h</dd>
          </div>
          <div>
            <dt className="text-gray-500">Ubicación</dt>
            <dd className="font-semibold">{equipo.ubicacion ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <div className="mb-4">
        <EquipoAcciones equipoId={equipo.id} umbralHoras={umbral} pctAlerta={pctAlerta} pctVencido={pctVencido} />
      </div>

      <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4 print:hidden">
        <h2 className="mb-2 font-semibold">Historial de ciclos de uso (últimos {ciclos.length})</h2>
        {ciclos.length === 0 ? (
          <p className="text-sm text-gray-500">Sin ciclos registrados todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="py-1 pr-2">Inicio</th>
                  <th className="py-1 pr-2">Fin</th>
                  <th className="py-1 pr-2">Horas</th>
                  <th className="py-1 pr-2">Ubicación</th>
                  <th className="py-1">Origen</th>
                </tr>
              </thead>
              <tbody>
                {ciclos.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-1 pr-2">{new Date(c.inicio).toLocaleString("es-AR")}</td>
                    <td className="py-1 pr-2">{c.fin ? new Date(c.fin).toLocaleString("es-AR") : "en curso"}</td>
                    <td className="py-1 pr-2">{c.horas_ciclo != null ? Number(c.horas_ciclo).toFixed(2) : "—"}</td>
                    <td className="py-1 pr-2">{c.ubicacion ?? "—"}</td>
                    <td className="py-1">{c.origen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4 print:hidden">
        <h2 className="mb-2 font-semibold">Mantenimientos</h2>
        {mantenimientos.length === 0 ? (
          <p className="text-sm text-gray-500">Sin mantenimientos registrados.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {mantenimientos.map((m) => (
              <li key={m.id} className="border-b border-gray-100 pb-2 last:border-0">
                <span className="font-semibold">{m.tipo ?? "—"}</span> · {new Date(m.fecha).toLocaleString("es-AR")}
                {m.horas_al_momento != null ? ` · ${Number(m.horas_al_momento).toFixed(1)} h al momento` : ""}
                {m.tecnico ? ` · ${m.tecnico}` : ""}
                {m.descripcion ? <p className="text-gray-600">{m.descripcion}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4 print:hidden">
        <h2 className="mb-2 font-semibold">Fallas</h2>
        {fallas.length === 0 ? (
          <p className="text-sm text-gray-500">Sin fallas registradas.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {fallas.map((f) => (
              <li key={f.id} className="border-b border-gray-100 pb-2 last:border-0">
                <span className="font-semibold">{f.tipo ?? "—"}</span> · {new Date(f.fecha).toLocaleString("es-AR")}
                {f.origen === "sintetico" ? " · (dato sintético)" : ""}
                {f.descripcion ? <p className="text-gray-600">{f.descripcion}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
