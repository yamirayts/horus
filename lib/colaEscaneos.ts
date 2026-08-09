// Cola persistente de escaneos que no lograron enviarse por falla de red.
// Vive en localStorage para que sobreviva a recargas y navegación entre pantallas,
// y un drainer en segundo plano la vacía cuando vuelve la conexión.
// Complementa el reintento en vivo de la pantalla /scan: si el usuario se queda
// mirando la pantalla el reintento visible confirma en vivo; si se va, el drainer
// termina el trabajo de todos modos.

const CLAVE = "horus:cola-escaneos";
const INTERVALO_MS = 5000;

export interface EscaneoEncolado {
  id: string;
  ubicacion?: string;
  ts: number;
}

function leer(): EscaneoEncolado[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return [];
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function guardar(items: EscaneoEncolado[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(items));
  } catch {
    // localStorage lleno o bloqueado: ignorar, el reintento en vivo cubre el caso feliz.
  }
}

/** Reemplaza cualquier entrada previa del mismo id antes de encolar. Sin esto,
 *  dos taps consecutivos sobre el mismo equipo durante un corte dejan dos entradas
 *  y al reconectar se duplica el toggle. */
export function encolar(id: string, ubicacion?: string) {
  const restantes = leer().filter((p) => p.id !== id);
  restantes.push({ id, ubicacion, ts: Date.now() });
  guardar(restantes);
}

/** Quita un item de la cola tras un envío exitoso desde el reintento en vivo. */
export function quitar(id: string) {
  guardar(leer().filter((p) => p.id !== id));
}

async function drenarUno(item: EscaneoEncolado): Promise<boolean> {
  try {
    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, ubicacion: item.ubicacion }),
    });
    const data = await res.json().catch(() => ({}));
    // Éxito o error de aplicación (equipo desconocido, en mantenimiento): en ambos casos
    // el evento ya no se puede procesar automáticamente, quitarlo de la cola.
    // El único caso en que se conserva es una respuesta HTTP no-OK que sugiera problema
    // transitorio (5xx); en la práctica el backend responde 200 con {ok:false} para lógica.
    if (!res.ok && res.status >= 500) return false;
    return true;
  } catch {
    // Falla de red: mantener en cola para reintentar.
    return false;
  }
}

async function drenar() {
  const items = leer();
  if (items.length === 0) return;
  const restantes: EscaneoEncolado[] = [];
  for (const item of items) {
    const ok = await drenarUno(item);
    if (!ok) restantes.push(item);
  }
  guardar(restantes);
}

/** Instala el drainer en segundo plano: intenta al reconectar la red y cada 5 s
 *  como respaldo. Devuelve una función de cleanup para llamar al desmontar. */
export function iniciarReintentos(): () => void {
  if (typeof window === "undefined") return () => undefined;
  const alVolver = () => {
    void drenar();
  };
  window.addEventListener("online", alVolver);
  const intervalo = window.setInterval(() => {
    if (navigator.onLine) void drenar();
  }, INTERVALO_MS);
  // Un intento inmediato: si la página se abrió con conexión y hay algo en cola, drenar ya.
  if (typeof navigator === "undefined" || navigator.onLine) void drenar();
  return () => {
    window.removeEventListener("online", alVolver);
    window.clearInterval(intervalo);
  };
}
