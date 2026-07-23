"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  equipoId: string;
  activo: boolean;
  totalActividad: number;
}

type Mensaje = { tipo: "ok" | "error"; texto: string } | null;

/**
 * Zona de acciones críticas (destructivas) del detalle del equipo.
 * Se muestra al final del detalle, visualmente separada del resto.
 * - Baja lógica: preserva el historial y se puede reactivar.
 * - Eliminación definitiva: solo si no hay actividad registrada; exige typing del ID.
 */
export default function ZonaAccionesCriticas({ equipoId, activo, totalActividad }: Props) {
  const router = useRouter();

  const [motivoBaja, setMotivoBaja] = useState("");
  const [confirmarBorrado, setConfirmarBorrado] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje>(null);

  return (
    <section className="mt-8 rounded-lg border-2 border-red-300 bg-red-50 p-5 print:hidden">
      <div className="flex items-center gap-2">
        <svg className="h-5 w-5 text-red-700" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M8.485 3.495a1.75 1.75 0 013.03 0l6.28 10.875A1.75 1.75 0 0116.28 17H3.72a1.75 1.75 0 01-1.515-2.63l6.28-10.875zM10 6.5a.75.75 0 00-.75.75v3.5a.75.75 0 001.5 0v-3.5A.75.75 0 0010 6.5zm0 6.75a1 1 0 100 2 1 1 0 000-2z"
            clipRule="evenodd"
          />
        </svg>
        <h2 className="font-semibold text-red-900">Zona de acciones críticas</h2>
      </div>
      <p className="mt-1 text-xs text-red-800">
        Estas acciones son destructivas. La baja lógica preserva todo el historial (recomendada para
        equipos fuera de servicio). La eliminación definitiva solo se permite cuando el equipo no tiene
        actividad registrada.
      </p>

      {activo ? (
        <div className="mt-4 rounded border border-red-200 bg-white p-4">
          <p className="text-sm font-semibold text-red-900">Dar de baja</p>
          <label className="mt-2 block text-sm text-gray-700">
            Motivo (opcional)
            <input
              value={motivoBaja}
              onChange={(e) => setMotivoBaja(e.target.value)}
              placeholder="Ej: baja definitiva por rotura irrecuperable"
              className="mt-1 w-full rounded border border-gray-300 px-2 py-2"
            />
          </label>
          <button
            type="button"
            disabled={enviando}
            onClick={async () => {
              if (!confirm(`¿Dar de baja lógica al equipo ${equipoId}? El historial se preserva y se puede reactivar.`))
                return;
              setEnviando(true);
              setMensaje(null);
              try {
                const res = await fetch(`/api/equipos/${encodeURIComponent(equipoId)}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ accion: "baja", motivo: motivoBaja || undefined }),
                });
                const data = await res.json();
                if (!data.ok) throw new Error(data.error ?? "no se pudo dar de baja");
                setMensaje({ tipo: "ok", texto: "Equipo dado de baja." });
                router.refresh();
              } catch (e) {
                setMensaje({ tipo: "error", texto: (e as Error).message });
              } finally {
                setEnviando(false);
              }
            }}
            className="mt-3 rounded bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
          >
            Dar de baja (con historial)
          </button>
        </div>
      ) : (
        <div className="mt-4 rounded border border-red-200 bg-white p-4">
          <p className="text-sm font-semibold text-red-900">Reactivar equipo</p>
          <p className="text-sm text-gray-700">Este equipo está actualmente dado de baja.</p>
          <button
            type="button"
            disabled={enviando}
            onClick={async () => {
              if (!confirm(`¿Reactivar el equipo ${equipoId}? Volverá al tablero y podrá escanearse.`))
                return;
              setEnviando(true);
              setMensaje(null);
              try {
                const res = await fetch(`/api/equipos/${encodeURIComponent(equipoId)}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ accion: "reactivar" }),
                });
                const data = await res.json();
                if (!data.ok) throw new Error(data.error ?? "no se pudo reactivar");
                setMensaje({ tipo: "ok", texto: "Equipo reactivado." });
                router.refresh();
              } catch (e) {
                setMensaje({ tipo: "error", texto: (e as Error).message });
              } finally {
                setEnviando(false);
              }
            }}
            className="mt-3 rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            Reactivar equipo
          </button>
        </div>
      )}

      <div className="mt-4 rounded border border-red-200 bg-white p-4">
        <p className="text-sm font-semibold text-red-900">Eliminar definitivamente</p>
        <p className="text-sm text-gray-700">
          {totalActividad === 0
            ? "Sin actividad registrada. Se puede eliminar."
            : `Bloqueada — el equipo tiene ${totalActividad} registros históricos.`}
        </p>
        {totalActividad === 0 && (
          <>
            <label className="mt-3 block text-sm text-gray-700">
              Escribí el id <span className="font-mono font-bold">{equipoId}</span> para confirmar.
              <input
                value={confirmarBorrado}
                onChange={(e) => setConfirmarBorrado(e.target.value)}
                className="mt-1 w-full rounded border border-red-300 bg-white px-2 py-2 font-mono"
              />
            </label>
            <button
              type="button"
              disabled={enviando || confirmarBorrado !== equipoId}
              onClick={async () => {
                setEnviando(true);
                setMensaje(null);
                try {
                  const res = await fetch(`/api/equipos/${encodeURIComponent(equipoId)}`, {
                    method: "DELETE",
                  });
                  const data = await res.json();
                  if (!data.ok) throw new Error(data.error ?? "no se pudo eliminar");
                  router.push("/equipos");
                } catch (e) {
                  setMensaje({ tipo: "error", texto: (e as Error).message });
                  setEnviando(false);
                }
              }}
              className="mt-3 rounded bg-red-900 px-4 py-2 text-sm font-semibold text-white hover:bg-red-950 disabled:opacity-40"
            >
              Eliminar definitivamente
            </button>
          </>
        )}
      </div>

      {mensaje && (
        <p className={`mt-3 text-sm font-medium ${mensaje.tipo === "ok" ? "text-emerald-800" : "text-red-800"}`}>
          {mensaje.texto}
        </p>
      )}
    </section>
  );
}
