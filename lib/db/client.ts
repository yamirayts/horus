import postgres from "postgres";

// Cliente lazy: se instancia la primera vez que se usa, ya en runtime.
// Evita quedar "quemado" con la URL vacía si el módulo se importa durante el bundle de Next.js.
let clienteCache: ReturnType<typeof postgres> | null = null;

function obtenerCliente(): ReturnType<typeof postgres> {
  if (clienteCache) return clienteCache;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL no está definida en el entorno actual.");
  }
  clienteCache = postgres(url, { ssl: "require" });
  return clienteCache;
}

// Proxy tagged-template + method calls que resuelven al cliente real en cada uso.
// `sql` conserva la firma original de postgres.js, sin cambiar los consumidores.
export const sql = new Proxy(function () {}, {
  apply(_t, thisArg, args) {
    return (obtenerCliente() as unknown as (...a: unknown[]) => unknown).apply(thisArg, args);
  },
  get(_t, prop) {
    const c = obtenerCliente() as unknown as Record<string | symbol, unknown>;
    return c[prop];
  },
}) as unknown as ReturnType<typeof postgres>;
