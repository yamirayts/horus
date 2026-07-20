# Sistema "horus" — Registro de uso de equipamiento crítico de UCI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una PWA web mobile-first que registra horas de uso de equipamiento crítico de UCI por escaneo de QR, con tablero de indicadores EN 15341; más el documento TFI (Word) con marcado en verde y un generador de cronograma de ejecución con IDs.

**Architecture:** Next.js 14 (App Router) con lógica de negocio pura y testeable en `lib/` (cálculo de horas, alertas, indicadores, generador de cronograma), una capa fina de acceso a datos sobre Postgres/Neon, y API routes que orquestan ambas. La lógica pura se desarrolla con TDD (vitest, sin base de datos); la UI y la capa DB se construyen y se verifican manualmente. El documento TFI y el cronograma se generan con scripts Node.

**Tech Stack:** Next.js 14 (App Router, TypeScript), Tailwind CSS, Postgres en Neon vía `postgres` (postgres.js), `html5-qrcode` (lectura), `qrcode` (generación), `vitest` (tests), `docx` (documento TFI). Deploy: GitHub + Vercel (planes gratuitos).

## Global Constraints

- **Costo cero de operación**: solo se usan planes gratuitos (Neon, Vercel, GitHub). Sin servicios pagos.
- **Sin datos de pacientes**: ninguna tabla, log ni campo registra PII de salud. El vínculo con la cama es solo ubicación del equipo.
- **Flag `origen`**: todo dato no capturado por un escaneo humano real se marca `origen='sintetico'`. Regla de honestidad comentada en código y README.
- **Solo fuentes verificadas** en el TFI: lo no verificado se marca en verde `[VERIFICAR FUENTE]`, nunca se inventa.
- **Node 18.17+** (requisito de Next.js 14).
- **Código y comentarios en español**; `README.md` en español.
- **Tipos de equipo** (valores exactos): `'bomba_infusion'`, `'monitor'`, `'ventilador'`.
- **Estados de equipo** (valores exactos): `'disponible'`, `'en_uso'`, `'mantenimiento'`.
- **Licencia MIT**.

---

## Estructura de archivos

```
horus/
├── package.json, tsconfig.json, next.config.mjs, tailwind.config.ts, vitest.config.ts, .env.example
├── app/
│   ├── layout.tsx, globals.css
│   ├── page.tsx                       → / (Escaneo)
│   ├── equipos/page.tsx, equipos/[id]/page.tsx
│   ├── tablero/page.tsx
│   ├── alta/page.tsx
│   ├── etiquetas/page.tsx
│   ├── prueba/page.tsx
│   ├── components/ (EscanerQR.tsx, TarjetaEquipo.tsx, BarraUmbral.tsx, QRImprimible.tsx)
│   └── api/
│       ├── scan/route.ts, equipos/route.ts, equipos/[id]/route.ts
│       ├── mantenimiento/route.ts, falla/route.ts
│       └── prueba/(horas|stress|fallas)/route.ts
├── lib/
│   ├── horas.ts, alertas.ts, indicadores.ts, cronograma.ts, escenario.ts
│   └── db/ (client.ts, equipos.ts, ciclos.ts, mantenimientos.ts, fallas.ts)
├── db/ (schema.sql, seed.sql)
├── scripts/ (generar-cronograma.ts, generar-tfi.ts)
├── test/ (horas.test.ts, alertas.test.ts, indicadores.test.ts, cronograma.test.ts, escenario.test.ts)
├── tfi/ (TFI_Rayts_Yamila.docx [generado], planilla-registro.csv)
├── docs/superpowers/
└── README.md, LICENSE, .gitignore
```

---

## FASE 0 — Andamiaje del proyecto

### Task 0.1: Inicializar proyecto Next.js + TypeScript + Tailwind + vitest

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `.env.example`, `.gitignore`, `LICENSE`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx` (placeholder), `test/smoke.test.ts`

**Interfaces:**
- Produces: proyecto compilable con `npm run dev`, `npm run build`, `npm test`.

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "horus",
  "version": "0.1.0",
  "private": true,
  "license": "MIT",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "cronograma": "tsx scripts/generar-cronograma.ts",
    "tfi": "tsx scripts/generar-tfi.ts"
  },
  "dependencies": {
    "next": "14.2.5",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "postgres": "3.4.4",
    "html5-qrcode": "2.3.8",
    "qrcode": "1.5.4"
  },
  "devDependencies": {
    "typescript": "5.5.4",
    "@types/react": "18.3.3",
    "@types/node": "20.14.0",
    "@types/qrcode": "1.5.5",
    "tailwindcss": "3.4.7",
    "postcss": "8.4.40",
    "autoprefixer": "10.4.19",
    "vitest": "2.0.5",
    "tsx": "4.16.2",
    "docx": "8.5.0"
  }
}
```

- [ ] **Step 2: Instalar dependencias**

Run: `npm install`
Expected: crea `node_modules/` y `package-lock.json` sin errores.

- [ ] **Step 3: Crear archivos de configuración**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.mjs`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
```

`postcss.config.mjs`:
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

`tailwind.config.ts`:
```ts
import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
export default config;
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["test/**/*.test.ts"], environment: "node" },
  resolve: { alias: { "@": new URL(".", import.meta.url).pathname } },
});
```

`.env.example`:
```
# Copiar a .env.local y completar con los datos de tu base Neon
DATABASE_URL=postgres://usuario:password@host/dbname
# PIN opcional para el tablero (dejar vacío para no exigir PIN)
TABLERO_PIN=
```

`.gitignore` (ya existe del commit anterior; verificar que incluya):
```
node_modules/
.next/
.env
.env.local
.vercel/
*.log
next-env.d.ts
```

`LICENSE`: texto estándar de licencia MIT, titular "Yamila Belén Rayts", año 2026.

- [ ] **Step 4: Crear layout, estilos y página placeholder**

`app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`app/layout.tsx`:
```tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Registro de uso — Equipamiento UCI",
  description: "Sistema de registro de horas de uso por QR (TFI Ing. Clínica UNAJ)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
```

`app/page.tsx` (placeholder, se reemplaza en Fase 1):
```tsx
export default function Home() {
  return <main className="p-6"><h1 className="text-xl font-bold">horus — en construcción</h1></main>;
}
```

- [ ] **Step 5: Escribir test smoke**

`test/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";
describe("smoke", () => {
  it("suma", () => { expect(1 + 1).toBe(2); });
});
```

- [ ] **Step 6: Verificar build y test**

Run: `npm test`
Expected: 1 test PASS.

Run: `npm run build`
Expected: build exitoso ("Compiled successfully").

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: andamiaje Next.js + TS + Tailwind + vitest"
```

---

## FASE 1 — Núcleo: esquema, lógica de negocio y escaneo

### Task 1.1: Esquema SQL y datos semilla

**Files:**
- Create: `db/schema.sql`, `db/seed.sql`

**Interfaces:**
- Produces: 4 tablas (`equipos`, `ciclos_uso`, `mantenimientos`, `fallas`) y ~101 equipos semilla.

- [ ] **Step 1: Escribir `db/schema.sql`**

```sql
-- Sistema de registro de uso de equipamiento crítico de UCI
-- SIN datos de pacientes. Ver README (regla de honestidad y datos mínimos).

CREATE TABLE IF NOT EXISTS equipos (
  id                TEXT PRIMARY KEY,               -- codifica el QR (ej. "BIC-014")
  tipo              TEXT NOT NULL,                  -- 'bomba_infusion' | 'monitor' | 'ventilador'
  marca             TEXT,
  modelo            TEXT,
  fecha_alta        DATE NOT NULL DEFAULT CURRENT_DATE,
  umbral_horas      INTEGER NOT NULL,               -- editable por equipo
  pct_alerta        NUMERIC(4,3) NOT NULL DEFAULT 0.800,  -- nivel aviso (amarillo)
  pct_vencido       NUMERIC(4,3) NOT NULL DEFAULT 1.000,  -- nivel vencido (rojo)
  horas_acumuladas  NUMERIC(10,2) NOT NULL DEFAULT 0,
  horas_iniciales   NUMERIC(10,2) NOT NULL DEFAULT 0,     -- uso previo cargado (transparencia)
  estado            TEXT NOT NULL DEFAULT 'disponible',   -- 'disponible' | 'en_uso' | 'mantenimiento'
  ubicacion         TEXT                            -- cama/sector del equipo (NUNCA paciente)
);

CREATE TABLE IF NOT EXISTS ciclos_uso (
  id           SERIAL PRIMARY KEY,
  equipo_id    TEXT NOT NULL REFERENCES equipos(id),
  inicio       TIMESTAMPTZ NOT NULL,
  fin          TIMESTAMPTZ,                          -- NULL mientras está en uso
  horas_ciclo  NUMERIC(10,2),                        -- se calcula al cerrar
  ubicacion    TEXT,
  origen       TEXT NOT NULL DEFAULT 'real'          -- 'real' | 'sintetico'
);
CREATE INDEX IF NOT EXISTS idx_ciclos_equipo ON ciclos_uso(equipo_id);
CREATE INDEX IF NOT EXISTS idx_ciclos_abierto ON ciclos_uso(equipo_id) WHERE fin IS NULL;

CREATE TABLE IF NOT EXISTS mantenimientos (
  id                SERIAL PRIMARY KEY,
  equipo_id         TEXT NOT NULL REFERENCES equipos(id),
  fecha             TIMESTAMPTZ NOT NULL DEFAULT now(),
  tipo              TEXT,                            -- 'preventivo' | 'correctivo'
  descripcion       TEXT,
  horas_al_momento  NUMERIC(10,2),
  tecnico           TEXT
);

CREATE TABLE IF NOT EXISTS fallas (
  id           SERIAL PRIMARY KEY,
  equipo_id    TEXT NOT NULL REFERENCES equipos(id),
  fecha        TIMESTAMPTZ NOT NULL DEFAULT now(),
  tipo         TEXT,                                 -- 'no_enciende'|'alarma'|'bateria'|'mecanica'|'otra'
  descripcion  TEXT,
  origen       TEXT NOT NULL DEFAULT 'real'          -- 'real' (enfermería) | 'sintetico' (demo MTBF)
);
CREATE INDEX IF NOT EXISTS idx_fallas_equipo ON fallas(equipo_id);

-- Lecturas del horómetro interno del equipo (ventiladores), para contrastar
-- las horas calculadas por QR contra una medición independiente.
CREATE TABLE IF NOT EXISTS lecturas_horometro (
  id                   SERIAL PRIMARY KEY,
  equipo_id            TEXT NOT NULL REFERENCES equipos(id),
  fecha                TIMESTAMPTZ NOT NULL DEFAULT now(),
  horas_horometro      NUMERIC(10,2) NOT NULL,  -- lectura del contador interno
  horas_qr_al_momento  NUMERIC(10,2),           -- acumulado del sistema al momento
  observacion          TEXT
);
CREATE INDEX IF NOT EXISTS idx_horometro_equipo ON lecturas_horometro(equipo_id);
```

- [ ] **Step 2: Escribir `db/seed.sql`** (parque del escenario SATI-Q)

Genera 17 ventiladores (VEN-01..VEN-17), 14 monitores (MON-01..MON-14) y 70 bombas (BIC-001..BIC-070). Umbrales referenciales del spec (ventilador 6000, monitor 9000, bomba 5000). Incluir el encabezado y un patrón repetible; escribir las filas completas.

```sql
-- Parque de referencia (UCI 14 camas). Marcas/modelos genéricos.
INSERT INTO equipos (id, tipo, marca, modelo, umbral_horas) VALUES
('VEN-01','ventilador','Genérica','Vent-G', 6000),
('VEN-02','ventilador','Genérica','Vent-G', 6000),
-- ... (VEN-03 a VEN-17, misma estructura)
('MON-01','monitor','Genérica','Mon-G', 9000),
-- ... (MON-02 a MON-14)
('BIC-001','bomba_infusion','Genérica','Bomba-G', 5000),
-- ... (BIC-002 a BIC-070)
ON CONFLICT (id) DO NOTHING;
```

Nota para el implementador: escribir TODAS las filas explícitas (no dejar `...`). Son 101 INSERT-values. Verificar los conteos en el Step 3.

- [ ] **Step 3: Verificación manual del seed**

Contar filas por tipo en el archivo (con editor o `grep`):
- `grep -c "'ventilador'" db/seed.sql` → 17
- `grep -c "'monitor'" db/seed.sql` → 14
- `grep -c "'bomba_infusion'" db/seed.sql` → 70

- [ ] **Step 4: Commit**

```bash
git add db/schema.sql db/seed.sql
git commit -m "feat: esquema SQL (4 tablas) y seed del parque de 14 camas"
```

---

### Task 1.2: Cálculo de horas de ciclo (lógica pura, TDD)

**Files:**
- Create: `lib/horas.ts`, `test/horas.test.ts`

**Interfaces:**
- Produces: `calcularHorasCiclo(inicio: Date, fin: Date): number` — horas decimales redondeadas a 2. Lanza si `fin < inicio`.

- [ ] **Step 1: Escribir el test que falla**

`test/horas.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { calcularHorasCiclo } from "@/lib/horas";

describe("calcularHorasCiclo", () => {
  it("2 horas exactas → 2.00", () => {
    const i = new Date("2026-07-16T10:00:00Z");
    const f = new Date("2026-07-16T12:00:00Z");
    expect(calcularHorasCiclo(i, f)).toBe(2);
  });
  it("90 minutos → 1.5", () => {
    const i = new Date("2026-07-16T10:00:00Z");
    const f = new Date("2026-07-16T11:30:00Z");
    expect(calcularHorasCiclo(i, f)).toBe(1.5);
  });
  it("redondea a 2 decimales", () => {
    const i = new Date("2026-07-16T10:00:00Z");
    const f = new Date("2026-07-16T10:20:00Z"); // 0.3333 h
    expect(calcularHorasCiclo(i, f)).toBe(0.33);
  });
  it("lanza si fin < inicio", () => {
    const i = new Date("2026-07-16T12:00:00Z");
    const f = new Date("2026-07-16T10:00:00Z");
    expect(() => calcularHorasCiclo(i, f)).toThrow();
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run test/horas.test.ts`
Expected: FAIL ("Failed to resolve import '@/lib/horas'" o "calcularHorasCiclo is not a function").

- [ ] **Step 3: Implementación mínima**

`lib/horas.ts`:
```ts
/** Calcula las horas decimales entre inicio y fin, redondeadas a 2 decimales. */
export function calcularHorasCiclo(inicio: Date, fin: Date): number {
  const ms = fin.getTime() - inicio.getTime();
  if (ms < 0) throw new Error("fin no puede ser anterior a inicio");
  const horas = ms / (1000 * 60 * 60);
  return Math.round(horas * 100) / 100;
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run test/horas.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/horas.ts test/horas.test.ts
git commit -m "feat: calcularHorasCiclo con TDD"
```

---

### Task 1.3: Estado de alerta y decisión de toggle (lógica pura, TDD)

**Files:**
- Create: `lib/alertas.ts`, `test/alertas.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `estadoAlerta(horasAcum: number, umbral: number, pctAlerta: number, pctVencido: number): 'ok' | 'aviso' | 'vencido'`
  - `decidirAccion(estado: 'disponible' | 'en_uso' | 'mantenimiento'): 'activar' | 'desactivar' | 'bloqueado'`
  - `pctUmbral(horasAcum: number, umbral: number): number` — porcentaje 0..∞ redondeado a 1 decimal.

- [ ] **Step 1: Escribir el test que falla**

`test/alertas.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { estadoAlerta, decidirAccion, pctUmbral } from "@/lib/alertas";

describe("estadoAlerta", () => {
  it("por debajo del aviso → ok", () => {
    expect(estadoAlerta(3000, 5000, 0.8, 1.0)).toBe("ok");
  });
  it("en el 80% → aviso", () => {
    expect(estadoAlerta(4000, 5000, 0.8, 1.0)).toBe("aviso");
  });
  it("en el 100% → vencido", () => {
    expect(estadoAlerta(5000, 5000, 0.8, 1.0)).toBe("vencido");
  });
  it("umbrales configurables (aviso al 70%)", () => {
    expect(estadoAlerta(3500, 5000, 0.7, 0.9)).toBe("aviso");
    expect(estadoAlerta(4500, 5000, 0.7, 0.9)).toBe("vencido");
  });
});

describe("decidirAccion", () => {
  it("disponible → activar", () => { expect(decidirAccion("disponible")).toBe("activar"); });
  it("en_uso → desactivar", () => { expect(decidirAccion("en_uso")).toBe("desactivar"); });
  it("mantenimiento → bloqueado", () => { expect(decidirAccion("mantenimiento")).toBe("bloqueado"); });
});

describe("pctUmbral", () => {
  it("mitad → 50", () => { expect(pctUmbral(2500, 5000)).toBe(50); });
  it("redondea a 1 decimal", () => { expect(pctUmbral(3333, 5000)).toBe(66.7); });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run test/alertas.test.ts`
Expected: FAIL (import no resuelto).

- [ ] **Step 3: Implementación mínima**

`lib/alertas.ts`:
```ts
export type EstadoEquipo = "disponible" | "en_uso" | "mantenimiento";
export type NivelAlerta = "ok" | "aviso" | "vencido";
export type Accion = "activar" | "desactivar" | "bloqueado";

/** Nivel de alerta según horas acumuladas y umbrales configurables. */
export function estadoAlerta(
  horasAcum: number, umbral: number, pctAlerta: number, pctVencido: number
): NivelAlerta {
  if (horasAcum >= umbral * pctVencido) return "vencido";
  if (horasAcum >= umbral * pctAlerta) return "aviso";
  return "ok";
}

/** Un mismo escaneo funciona como conmutador (toggle). */
export function decidirAccion(estado: EstadoEquipo): Accion {
  if (estado === "disponible") return "activar";
  if (estado === "en_uso") return "desactivar";
  return "bloqueado";
}

/** Porcentaje del umbral consumido (1 decimal). */
export function pctUmbral(horasAcum: number, umbral: number): number {
  if (umbral <= 0) return 0;
  return Math.round((horasAcum / umbral) * 1000) / 10;
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run test/alertas.test.ts`
Expected: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/alertas.ts test/alertas.test.ts
git commit -m "feat: estadoAlerta, decidirAccion, pctUmbral con TDD"
```

---

### Task 1.4: Capa de acceso a datos (Postgres/Neon)

**Files:**
- Create: `lib/db/client.ts`, `lib/db/equipos.ts`, `lib/db/ciclos.ts`, `lib/db/mantenimientos.ts`, `lib/db/fallas.ts`

**Interfaces:**
- Consumes: `calcularHorasCiclo` (Task 1.2).
- Produces (funciones async):
  - `getEquipo(id: string): Promise<Equipo | null>`
  - `listarEquipos(filtro?: { tipo?: string; estado?: string }): Promise<Equipo[]>`
  - `crearEquipo(e: NuevoEquipo): Promise<void>`
  - `actualizarEquipoConfig(id: string, c: { umbral_horas?: number; pct_alerta?: number; pct_vencido?: number; horas_iniciales?: number }): Promise<void>`
  - `abrirCiclo(equipoId: string, ubicacion: string | null, origen?: 'real'|'sintetico', inicio?: Date): Promise<void>`
  - `cerrarCicloAbierto(equipoId: string, fin?: Date): Promise<number>` (devuelve horas del ciclo)
  - `registrarMantenimiento(m: NuevoMantenimiento): Promise<void>` (resetea horas)
  - `registrarFalla(f: NuevaFalla): Promise<void>`
  - `listarFallas(equipoId?: string): Promise<Falla[]>`
  - Tipo `Equipo` con los campos de la tabla.

- [ ] **Step 1: Cliente de base**

`lib/db/client.ts`:
```ts
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  // No lanzar en import para permitir build sin DB; las funciones fallarán en runtime si falta.
  console.warn("DATABASE_URL no está seteada. Configurala en .env.local para operar.");
}

export const sql = postgres(process.env.DATABASE_URL ?? "", { ssl: "require" });
```

- [ ] **Step 2: Acceso a equipos**

`lib/db/equipos.ts`:
```ts
import { sql } from "./client";

export interface Equipo {
  id: string; tipo: string; marca: string | null; modelo: string | null;
  fecha_alta: string; umbral_horas: number;
  pct_alerta: number; pct_vencido: number;
  horas_acumuladas: number; horas_iniciales: number;
  estado: "disponible" | "en_uso" | "mantenimiento"; ubicacion: string | null;
}
export interface NuevoEquipo {
  id: string; tipo: string; marca?: string; modelo?: string;
  umbral_horas: number; pct_alerta?: number; pct_vencido?: number; horas_iniciales?: number;
}

export async function getEquipo(id: string): Promise<Equipo | null> {
  const r = await sql<Equipo[]>`SELECT * FROM equipos WHERE id = ${id}`;
  return r[0] ?? null;
}

export async function listarEquipos(filtro?: { tipo?: string; estado?: string }): Promise<Equipo[]> {
  return sql<Equipo[]>`
    SELECT * FROM equipos
    WHERE (${filtro?.tipo ?? null}::text IS NULL OR tipo = ${filtro?.tipo ?? null})
      AND (${filtro?.estado ?? null}::text IS NULL OR estado = ${filtro?.estado ?? null})
    ORDER BY id`;
}

export async function crearEquipo(e: NuevoEquipo): Promise<void> {
  await sql`
    INSERT INTO equipos (id, tipo, marca, modelo, umbral_horas, pct_alerta, pct_vencido, horas_iniciales, horas_acumuladas)
    VALUES (${e.id}, ${e.tipo}, ${e.marca ?? null}, ${e.modelo ?? null}, ${e.umbral_horas},
            ${e.pct_alerta ?? 0.8}, ${e.pct_vencido ?? 1.0}, ${e.horas_iniciales ?? 0}, ${e.horas_iniciales ?? 0})`;
}

export async function actualizarEquipoConfig(id: string, c: {
  umbral_horas?: number; pct_alerta?: number; pct_vencido?: number; horas_iniciales?: number;
}): Promise<void> {
  const actual = await getEquipo(id);
  if (!actual) throw new Error(`Equipo ${id} no existe`);
  const nuevoInicial = c.horas_iniciales ?? actual.horas_iniciales;
  // Si cambian las horas iniciales, ajustar acumuladas por la diferencia.
  const deltaInicial = nuevoInicial - actual.horas_iniciales;
  await sql`
    UPDATE equipos SET
      umbral_horas = ${c.umbral_horas ?? actual.umbral_horas},
      pct_alerta   = ${c.pct_alerta ?? actual.pct_alerta},
      pct_vencido  = ${c.pct_vencido ?? actual.pct_vencido},
      horas_iniciales = ${nuevoInicial},
      horas_acumuladas = horas_acumuladas + ${deltaInicial}
    WHERE id = ${id}`;
}
```

- [ ] **Step 3: Acceso a ciclos (toggle)**

`lib/db/ciclos.ts`:
```ts
import { sql } from "./client";
import { calcularHorasCiclo } from "@/lib/horas";

export async function abrirCiclo(
  equipoId: string, ubicacion: string | null,
  origen: "real" | "sintetico" = "real", inicio: Date = new Date()
): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`INSERT INTO ciclos_uso (equipo_id, inicio, ubicacion, origen)
             VALUES (${equipoId}, ${inicio}, ${ubicacion}, ${origen})`;
    await tx`UPDATE equipos SET estado = 'en_uso', ubicacion = ${ubicacion} WHERE id = ${equipoId}`;
  });
}

export async function cerrarCicloAbierto(equipoId: string, fin: Date = new Date()): Promise<number> {
  return sql.begin(async (tx) => {
    const abiertos = await tx<{ id: number; inicio: Date }[]>`
      SELECT id, inicio FROM ciclos_uso WHERE equipo_id = ${equipoId} AND fin IS NULL
      ORDER BY inicio DESC LIMIT 1`;
    if (abiertos.length === 0) throw new Error(`Equipo ${equipoId} no tiene ciclo abierto`);
    const c = abiertos[0];
    const horas = calcularHorasCiclo(new Date(c.inicio), fin);
    await tx`UPDATE ciclos_uso SET fin = ${fin}, horas_ciclo = ${horas} WHERE id = ${c.id}`;
    await tx`UPDATE equipos SET estado = 'disponible',
             horas_acumuladas = horas_acumuladas + ${horas} WHERE id = ${equipoId}`;
    return horas;
  });
}
```

- [ ] **Step 4: Acceso a mantenimientos y fallas**

`lib/db/mantenimientos.ts`:
```ts
import { sql } from "./client";

export interface NuevoMantenimiento {
  equipo_id: string; tipo?: string; descripcion?: string; tecnico?: string;
}

export async function registrarMantenimiento(m: NuevoMantenimiento): Promise<void> {
  await sql.begin(async (tx) => {
    const eq = await tx<{ horas_acumuladas: number }[]>`
      SELECT horas_acumuladas FROM equipos WHERE id = ${m.equipo_id}`;
    const horas = eq[0]?.horas_acumuladas ?? 0;
    await tx`INSERT INTO mantenimientos (equipo_id, tipo, descripcion, horas_al_momento, tecnico)
             VALUES (${m.equipo_id}, ${m.tipo ?? null}, ${m.descripcion ?? null}, ${horas}, ${m.tecnico ?? null})`;
    await tx`UPDATE equipos SET horas_acumuladas = 0, horas_iniciales = 0, estado = 'disponible'
             WHERE id = ${m.equipo_id}`;
  });
}
```

`lib/db/fallas.ts`:
```ts
import { sql } from "./client";

export interface Falla {
  id: number; equipo_id: string; fecha: string;
  tipo: string | null; descripcion: string | null; origen: "real" | "sintetico";
}
export interface NuevaFalla {
  equipo_id: string; tipo?: string; descripcion?: string;
  origen?: "real" | "sintetico"; fecha?: Date; ponerEnMantenimiento?: boolean;
}

export async function registrarFalla(f: NuevaFalla): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`INSERT INTO fallas (equipo_id, tipo, descripcion, origen, fecha)
             VALUES (${f.equipo_id}, ${f.tipo ?? null}, ${f.descripcion ?? null},
                     ${f.origen ?? "real"}, ${f.fecha ?? new Date()})`;
    if (f.ponerEnMantenimiento) {
      await tx`UPDATE equipos SET estado = 'mantenimiento' WHERE id = ${f.equipo_id}`;
    }
  });
}

export async function listarFallas(equipoId?: string): Promise<Falla[]> {
  if (equipoId) return sql<Falla[]>`SELECT * FROM fallas WHERE equipo_id = ${equipoId} ORDER BY fecha DESC`;
  return sql<Falla[]>`SELECT * FROM fallas ORDER BY fecha DESC`;
}
```

- [ ] **Step 5: Verificar compilación de tipos**

Run: `npx tsc --noEmit`
Expected: sin errores de tipos.

- [ ] **Step 6: Commit**

```bash
git add lib/db
git commit -m "feat: capa de acceso a datos (equipos, ciclos toggle, mantenimientos, fallas)"
```

---

### Task 1.5: API de escaneo (toggle) y componente escáner

**Files:**
- Create: `app/api/scan/route.ts`, `app/components/EscanerQR.tsx`, `app/page.tsx` (reemplaza placeholder)

**Interfaces:**
- Consumes: `getEquipo`, `abrirCiclo`, `cerrarCicloAbierto`, `decidirAccion`.
- Produces: `POST /api/scan` body `{ id: string }` → `{ ok: true, accion, equipo, horas? }` o `{ ok:false, error }`. `GET /api/scan?id=` → estado del equipo para previsualizar la acción.

- [ ] **Step 1: Route handler de escaneo**

`app/api/scan/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { getEquipo } from "@/lib/db/equipos";
import { abrirCiclo, cerrarCicloAbierto } from "@/lib/db/ciclos";
import { decidirAccion } from "@/lib/alertas";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "falta id" }, { status: 400 });
  const equipo = await getEquipo(id);
  if (!equipo) return NextResponse.json({ ok: false, error: "equipo desconocido" }, { status: 404 });
  return NextResponse.json({ ok: true, equipo, accion: decidirAccion(equipo.estado) });
}

export async function POST(req: NextRequest) {
  const { id, ubicacion } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "falta id" }, { status: 400 });
  const equipo = await getEquipo(id);
  if (!equipo) return NextResponse.json({ ok: false, error: "equipo desconocido" }, { status: 404 });
  const accion = decidirAccion(equipo.estado);
  try {
    if (accion === "activar") {
      await abrirCiclo(id, ubicacion ?? equipo.ubicacion ?? null, "real");
      return NextResponse.json({ ok: true, accion, equipo: { ...equipo, estado: "en_uso" } });
    }
    if (accion === "desactivar") {
      const horas = await cerrarCicloAbierto(id);
      return NextResponse.json({ ok: true, accion, horas, equipo: { ...equipo, estado: "disponible" } });
    }
    return NextResponse.json({ ok: false, error: "equipo en mantenimiento" }, { status: 409 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Componente escáner (cámara abierta, acción rápida)**

`app/components/EscanerQR.tsx`: componente cliente (`"use client"`) que:
- Monta `Html5Qrcode` al cargar y arranca la cámara trasera (`facingMode: "environment"`).
- Antidoble-lectura: ignora el mismo texto leído hace <3000 ms (guardar `ultimo = {id, ts}`).
- Al leer, hace `POST /api/scan` con el id, muestra confirmación grande ~1500 ms ("✓ {id} {ACTIVADO|DESACTIVADO} — HH:MM") y vuelve a escuchar.
- Si el POST falla por red, reintenta 1 vez a los 1500 ms y, si vuelve a fallar, muestra "⚠ Sin conexión — reintentando…" y encola el id para reintento (no pierde el escaneo).
- Botón secundario chico "⚠ Reportar falla" que hace `POST /api/falla` (Task 3.1) con un mini-formulario.

Escribir el componente completo con estos comportamientos. Estado con `useState`/`useRef`; limpiar el escáner en `useEffect` cleanup.

- [ ] **Step 3: Página de escaneo**

`app/page.tsx`: renderiza `<EscanerQR />` a pantalla completa, con encabezado mínimo y (si hay `TABLERO_PIN`) sin bloquear el escaneo. Mobile-first.

- [ ] **Step 4: Verificación de build**

Run: `npm run build`
Expected: build exitoso (las rutas `/` y `/api/scan` compilan).

- [ ] **Step 5: Commit**

```bash
git add app/api/scan app/components/EscanerQR.tsx app/page.tsx
git commit -m "feat: API de escaneo (toggle) y pantalla de escaneo rápida"
```

---

## FASE 2 — Gestión y tablero

### Task 2.1: Indicadores EN 15341 (lógica pura, TDD)

**Files:**
- Create: `lib/indicadores.ts`, `test/indicadores.test.ts`

**Interfaces:**
- Produces:
  - `calcularTUE(horasUsoPeriodo: number, horasPeriodo: number): number` — % 1 decimal.
  - `clasificarTUE(tue: number): 'sobreexigido' | 'normal' | 'subutilizado'` (≥85 sobreexigido, ≤30 subutilizado).
  - `calcularMTBF(horasOperacion: number, cantidadFallas: number): number | null` — null si 0 fallas.
  - `proyeccionDiasHastaPM(horasAcum: number, umbral: number, pctAlerta: number, horasPorDia: number): number | null` — días hasta llegar al aviso; null si `horasPorDia<=0`.

- [ ] **Step 1: Escribir el test que falla**

`test/indicadores.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { calcularTUE, clasificarTUE, calcularMTBF, proyeccionDiasHastaPM } from "@/lib/indicadores";

describe("TUE", () => {
  it("360 h de 720 → 50%", () => { expect(calcularTUE(360, 720)).toBe(50); });
  it("clasifica sobreexigido ≥85", () => { expect(clasificarTUE(85)).toBe("sobreexigido"); });
  it("clasifica subutilizado ≤30", () => { expect(clasificarTUE(30)).toBe("subutilizado"); });
  it("clasifica normal entre medio", () => { expect(clasificarTUE(50)).toBe("normal"); });
});

describe("MTBF", () => {
  it("1000 h con 4 fallas → 250", () => { expect(calcularMTBF(1000, 4)).toBe(250); });
  it("sin fallas → null", () => { expect(calcularMTBF(1000, 0)).toBeNull(); });
});

describe("proyeccionDiasHastaPM", () => {
  it("faltan 1000 h al aviso a 50 h/día → 20 días", () => {
    // umbral 5000, aviso 0.8 → 4000; acum 3000 → faltan 1000; /50 = 20
    expect(proyeccionDiasHastaPM(3000, 5000, 0.8, 50)).toBe(20);
  });
  it("horasPorDia 0 → null", () => {
    expect(proyeccionDiasHastaPM(3000, 5000, 0.8, 0)).toBeNull();
  });
  it("ya pasó el aviso → 0", () => {
    expect(proyeccionDiasHastaPM(4200, 5000, 0.8, 50)).toBe(0);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run test/indicadores.test.ts`
Expected: FAIL (import no resuelto).

- [ ] **Step 3: Implementación mínima**

`lib/indicadores.ts`:
```ts
export function calcularTUE(horasUsoPeriodo: number, horasPeriodo: number): number {
  if (horasPeriodo <= 0) return 0;
  return Math.round((horasUsoPeriodo / horasPeriodo) * 1000) / 10;
}

export function clasificarTUE(tue: number): "sobreexigido" | "normal" | "subutilizado" {
  if (tue >= 85) return "sobreexigido";
  if (tue <= 30) return "subutilizado";
  return "normal";
}

/** MTBF = horas de operación / cantidad de fallas. null si no hay fallas. */
export function calcularMTBF(horasOperacion: number, cantidadFallas: number): number | null {
  if (cantidadFallas <= 0) return null;
  return Math.round((horasOperacion / cantidadFallas) * 100) / 100;
}

/** Días estimados hasta alcanzar el umbral de aviso, al ritmo de horasPorDia. */
export function proyeccionDiasHastaPM(
  horasAcum: number, umbral: number, pctAlerta: number, horasPorDia: number
): number | null {
  if (horasPorDia <= 0) return null;
  const objetivo = umbral * pctAlerta;
  const faltan = objetivo - horasAcum;
  if (faltan <= 0) return 0;
  return Math.round((faltan / horasPorDia) * 10) / 10;
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run test/indicadores.test.ts`
Expected: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/indicadores.ts test/indicadores.test.ts
git commit -m "feat: indicadores EN 15341 (TUE, MTBF, proyección PM) con TDD"
```

---

### Task 2.2: API de equipos (listar, detalle, alta, editar config)

**Files:**
- Create: `app/api/equipos/route.ts`, `app/api/equipos/[id]/route.ts`, `app/api/mantenimiento/route.ts`

**Interfaces:**
- Consumes: `listarEquipos`, `getEquipo`, `crearEquipo`, `actualizarEquipoConfig`, `registrarMantenimiento`, `listarFallas`.
- Produces:
  - `GET /api/equipos?tipo=&estado=` → `Equipo[]`.
  - `POST /api/equipos` (alta) body `NuevoEquipo` → `{ ok }`.
  - `GET /api/equipos/[id]` → `{ equipo, ciclos, mantenimientos, fallas }`.
  - `PATCH /api/equipos/[id]` (editar config) → `{ ok }`.
  - `POST /api/mantenimiento` body `NuevoMantenimiento` → `{ ok }`.

- [ ] **Step 1: Route de colección**

`app/api/equipos/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { listarEquipos, crearEquipo } from "@/lib/db/equipos";

export async function GET(req: NextRequest) {
  const tipo = req.nextUrl.searchParams.get("tipo") ?? undefined;
  const estado = req.nextUrl.searchParams.get("estado") ?? undefined;
  return NextResponse.json(await listarEquipos({ tipo, estado }));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.id || !body.tipo || !body.umbral_horas) {
    return NextResponse.json({ ok: false, error: "faltan campos obligatorios" }, { status: 400 });
  }
  await crearEquipo(body);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Route de detalle**

`app/api/equipos/[id]/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { getEquipo, actualizarEquipoConfig } from "@/lib/db/equipos";
import { listarFallas } from "@/lib/db/fallas";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const equipo = await getEquipo(params.id);
  if (!equipo) return NextResponse.json({ ok: false, error: "no existe" }, { status: 404 });
  const ciclos = await sql`SELECT * FROM ciclos_uso WHERE equipo_id = ${params.id} ORDER BY inicio DESC LIMIT 50`;
  const mantenimientos = await sql`SELECT * FROM mantenimientos WHERE equipo_id = ${params.id} ORDER BY fecha DESC`;
  const fallas = await listarFallas(params.id);
  return NextResponse.json({ equipo, ciclos, mantenimientos, fallas });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  await actualizarEquipoConfig(params.id, body);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Route de mantenimiento**

`app/api/mantenimiento/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { registrarMantenimiento } from "@/lib/db/mantenimientos";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.equipo_id) return NextResponse.json({ ok: false, error: "falta equipo_id" }, { status: 400 });
  await registrarMantenimiento(body);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Verificar compilación**

Run: `npx tsc --noEmit && npm run build`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add app/api/equipos app/api/mantenimiento
git commit -m "feat: API de equipos (listar/alta/detalle/config) y mantenimiento"
```

---

### Task 2.3: Pantallas de gestión (/equipos, /equipos/[id], /alta)

**Files:**
- Create: `app/equipos/page.tsx`, `app/equipos/[id]/page.tsx`, `app/alta/page.tsx`, `app/components/TarjetaEquipo.tsx`, `app/components/BarraUmbral.tsx`, `app/components/QRImprimible.tsx`

**Interfaces:**
- Consumes: APIs de Task 2.2, `pctUmbral`/`estadoAlerta` (Task 1.3), `qrcode`.
- Produces: componentes reutilizables `<BarraUmbral horasAcum umbral pctAlerta pctVencido />`, `<QRImprimible id />` (genera dataURL con `qrcode` y lo muestra imprimible), `<TarjetaEquipo equipo />`.

- [ ] **Step 1: Componentes reutilizables**

`app/components/BarraUmbral.tsx`: barra de progreso con color según `estadoAlerta` (verde ok / amarillo aviso / rojo vencido), muestra `pctUmbral` como texto. Componente puro de presentación.

`app/components/QRImprimible.tsx` (`"use client"`): usa `QRCode.toDataURL(id, { errorCorrectionLevel: "Q", margin: 1 })` y renderiza `<img>` + el id debajo, con estilos `@media print` para recorte.

`app/components/TarjetaEquipo.tsx`: card con id, tipo, estado, `<BarraUmbral>`, ubicación; link a `/equipos/[id]`.

- [ ] **Step 2: Lista /equipos**

`app/equipos/page.tsx`: server component que hace fetch de `/api/equipos` (con filtros por query param `tipo`/`estado`), renderiza grilla de `<TarjetaEquipo>` + controles de filtro.

- [ ] **Step 3: Detalle /equipos/[id]**

`app/equipos/[id]/page.tsx`: muestra datos, horas acumuladas discriminando `horas_iniciales` vs. ciclos reales (acum − iniciales), `<BarraUmbral>`, historial de ciclos/mantenimientos/fallas, y (cliente) formularios para: "Registrar mantenimiento" (POST), "Editar umbral / % alerta / % vencido" (PATCH), y `<QRImprimible>`.

- [ ] **Step 4: Alta /alta**

`app/alta/page.tsx` (`"use client"`): formulario id, tipo (select con los 3 valores), marca, modelo, umbral_horas, pct_alerta, pct_vencido, horas_iniciales → `POST /api/equipos` → al guardar muestra `<QRImprimible>` del equipo creado.

- [ ] **Step 5: Verificación manual (visual)**

Run: `npm run dev` y con la app conectada a una base Neon de prueba (ver Task 4.1), abrir `/alta`, crear un equipo, verificar QR; abrir `/equipos` y el detalle. (Si aún no hay DB, verificar solo que compila con `npm run build`.)

- [ ] **Step 6: Commit**

```bash
git add app/equipos app/alta app/components/TarjetaEquipo.tsx app/components/BarraUmbral.tsx app/components/QRImprimible.tsx
git commit -m "feat: pantallas de gestión (lista, detalle, alta) y componentes QR/barra"
```

---

### Task 2.4: Tablero de Ingeniería Clínica (/tablero)

**Files:**
- Create: `app/tablero/page.tsx`, `app/api/tablero/route.ts`

**Interfaces:**
- Consumes: `listarEquipos`, `listarFallas`, `estadoAlerta`, `pctUmbral`, `calcularTUE`, `clasificarTUE`, `calcularMTBF`, `proyeccionDiasHastaPM`.
- Produces: `GET /api/tablero` → `{ resumen, alertas, vencidos, enFalla, equipos, mtbfPorTipo }`.

- [ ] **Step 1: API del tablero**

`app/api/tablero/route.ts`: arma el resumen. Para cada equipo calcula nivel de alerta (`estadoAlerta`) y `pctUmbral`. Resumen: totales por estado y por tipo. Alertas = equipos en 'aviso'; vencidos = 'vencido'; enFalla = estado 'mantenimiento' o con fallas recientes. MTBF por tipo: suma `horas_acumuladas` del tipo / cantidad de fallas del tipo (usando `calcularMTBF`). Devolver también el detalle de cada equipo con su nivel y pct.

Escribir el handler completo consumiendo las funciones de `lib/indicadores.ts` y `lib/alertas.ts`.

- [ ] **Step 2: Pantalla del tablero**

`app/tablero/page.tsx`: server component que hace fetch de `/api/tablero` y renderiza: panel de alertas (aviso/vencido/falla, con color), tarjetas de resumen (total, en uso, disponibles, en mantenimiento — por tipo), tabla de equipos con `<BarraUmbral>`, bloque de indicadores (TUE por equipo con `clasificarTUE`, MTBF por tipo con nota "datos incluyen fallas sintéticas — ver informe", proyección de PM). Gráfico de horas por tipo con barras CSS (sin dependencia extra).

- [ ] **Step 3: Verificación de build**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 4: Commit**

```bash
git add app/tablero app/api/tablero
git commit -m "feat: tablero de Ingeniería Clínica con indicadores EN 15341 y alertas"
```

---

## FASE 3 — Fallas, modo prueba y etiquetas

### Task 3.1: Reporte de falla desde el escaneo

**Files:**
- Create: `app/api/falla/route.ts`
- Modify: `app/components/EscanerQR.tsx` (mini-formulario de falla — ya referenciado en Task 1.5)

**Interfaces:**
- Consumes: `registrarFalla`.
- Produces: `POST /api/falla` body `{ equipo_id, tipo, descripcion, ponerEnMantenimiento }` → `{ ok }`. Fuerza `origen:'real'`.

- [ ] **Step 1: Route de falla**

`app/api/falla/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { registrarFalla } from "@/lib/db/fallas";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.equipo_id) return NextResponse.json({ ok: false, error: "falta equipo_id" }, { status: 400 });
  await registrarFalla({
    equipo_id: body.equipo_id,
    tipo: body.tipo,
    descripcion: body.descripcion,
    origen: "real", // reporte de enfermería: SIEMPRE real
    ponerEnMantenimiento: body.ponerEnMantenimiento ?? true,
  });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Mini-formulario en el escáner**

Modificar `app/components/EscanerQR.tsx`: el botón "⚠ Reportar falla" abre un modal con select de tipo (`no_enciende|alarma|bateria|mecanica|otra`) + textarea opcional + checkbox "poner en mantenimiento" (default marcado) → `POST /api/falla`. Cerrar y confirmar.

- [ ] **Step 3: Verificación de build**

Run: `npm run build`
Expected: exitoso.

- [ ] **Step 4: Commit**

```bash
git add app/api/falla app/components/EscanerQR.tsx
git commit -m "feat: reporte de falla real desde el escaneo (origen='real')"
```

---

### Task 3.2: Modo prueba (horas iniciales, stress, fallas sintéticas)

**Files:**
- Create: `app/prueba/page.tsx`, `app/api/prueba/horas/route.ts`, `app/api/prueba/stress/route.ts`, `app/api/prueba/fallas/route.ts`

**Interfaces:**
- Consumes: `actualizarEquipoConfig`, `getEquipo`, `sql`, `registrarFalla`, `abrirCiclo`, `cerrarCicloAbierto`.
- Produces:
  - `POST /api/prueba/horas` `{ equipo_id, horas_iniciales }` → carga horas previas.
  - `POST /api/prueba/stress` `{ equipo_id, horas_objetivo }` → inserta un ciclo `origen:'sintetico'` que lleva el acumulado al objetivo (para disparar la alerta).
  - `POST /api/prueba/fallas` `{ equipo_id, cantidad, dias_rango }` → inserta N fallas `origen:'sintetico'` con fechas repartidas (para demostrar el MTBF).

- [ ] **Step 1: Route de horas iniciales**

`app/api/prueba/horas/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { actualizarEquipoConfig } from "@/lib/db/equipos";

export async function POST(req: NextRequest) {
  const { equipo_id, horas_iniciales } = await req.json();
  if (!equipo_id || horas_iniciales == null) {
    return NextResponse.json({ ok: false, error: "faltan datos" }, { status: 400 });
  }
  await actualizarEquipoConfig(equipo_id, { horas_iniciales: Number(horas_iniciales) });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Route de stress**

`app/api/prueba/stress/route.ts`: inserta un ciclo cerrado sintético cuya `horas_ciclo` sea `horas_objetivo − horas_acumuladas_actual` (si es positivo), suma a `horas_acumuladas`, `origen='sintetico'`. Escribir el handler completo usando `sql.begin`.

```ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { getEquipo } from "@/lib/db/equipos";

export async function POST(req: NextRequest) {
  const { equipo_id, horas_objetivo } = await req.json();
  const eq = await getEquipo(equipo_id);
  if (!eq) return NextResponse.json({ ok: false, error: "no existe" }, { status: 404 });
  const delta = Number(horas_objetivo) - Number(eq.horas_acumuladas);
  if (delta <= 0) return NextResponse.json({ ok: false, error: "objetivo <= actual" }, { status: 400 });
  const ahora = new Date();
  const inicio = new Date(ahora.getTime() - delta * 3600 * 1000);
  await sql.begin(async (tx) => {
    await tx`INSERT INTO ciclos_uso (equipo_id, inicio, fin, horas_ciclo, origen)
             VALUES (${equipo_id}, ${inicio}, ${ahora}, ${delta}, 'sintetico')`;
    await tx`UPDATE equipos SET horas_acumuladas = horas_acumuladas + ${delta} WHERE id = ${equipo_id}`;
  });
  return NextResponse.json({ ok: true, horas_agregadas: delta });
}
```

- [ ] **Step 3: Route de fallas sintéticas**

`app/api/prueba/fallas/route.ts`: inserta `cantidad` fallas con `origen='sintetico'`, fechas repartidas en los últimos `dias_rango` días.

```ts
import { NextRequest, NextResponse } from "next/server";
import { registrarFalla } from "@/lib/db/fallas";

export async function POST(req: NextRequest) {
  const { equipo_id, cantidad, dias_rango } = await req.json();
  const n = Number(cantidad), rango = Number(dias_rango) || 90;
  if (!equipo_id || n <= 0) return NextResponse.json({ ok: false, error: "datos inválidos" }, { status: 400 });
  for (let k = 0; k < n; k++) {
    const diasAtras = Math.round((rango / n) * k);
    const fecha = new Date(Date.now() - diasAtras * 86400 * 1000);
    await registrarFalla({ equipo_id, tipo: "otra", descripcion: "falla sintética (demo MTBF)", origen: "sintetico", fecha, ponerEnMantenimiento: false });
  }
  return NextResponse.json({ ok: true, insertadas: n });
}
```

- [ ] **Step 4: Pantalla /prueba**

`app/prueba/page.tsx` (`"use client"`): banner rojo fijo "MODO PRUEBA — genera datos sintéticos (origen='sintetico')". Tres bloques con formularios que llaman a los tres endpoints. Nota de honestidad visible citando el README.

- [ ] **Step 5: Verificación de build**

Run: `npm run build`
Expected: exitoso.

- [ ] **Step 6: Commit**

```bash
git add app/prueba app/api/prueba
git commit -m "feat: modo prueba (horas iniciales, stress, fallas sintéticas) con flag origen"
```

---

### Task 3.3: Generación e impresión de etiquetas QR (/etiquetas)

**Files:**
- Create: `app/etiquetas/page.tsx`

**Interfaces:**
- Consumes: `/api/equipos`, `<QRImprimible>` (Task 2.3).
- Produces: pantalla de selección + grilla imprimible.

- [ ] **Step 1: Pantalla de etiquetas**

`app/etiquetas/page.tsx` (`"use client"`): 
- Carga equipos de `/api/equipos`.
- Filtro por tipo + checkboxes por equipo + "seleccionar todo"/"limpiar".
- Campo "copias por equipo" (N).
- Renderiza una grilla imprimible: por cada equipo seleccionado, N veces `<QRImprimible id>`. 
- Botón "Imprimir" → `window.print()`. CSS `@media print` que oculta los controles y arma la grilla A4.

- [ ] **Step 2: Verificación de build**

Run: `npm run build`
Expected: exitoso.

- [ ] **Step 3: Commit**

```bash
git add app/etiquetas
git commit -m "feat: /etiquetas con selección individual, copias y reimpresión"
```

---

### Task 3.4: Contraste con horómetro interno

**Files:**
- Create: `lib/db/horometro.ts`, `app/api/horometro/route.ts`, `test/horometro.test.ts`, `lib/horometro.ts`
- Modify: `app/equipos/[id]/page.tsx` (bloque de contraste)

**Interfaces:**
- Consumes: `getEquipo`, `sql`.
- Produces:
  - `calcularDesvio(horasQr: number, horasHorometro: number): { absoluto: number; porcentual: number | null }` — desvío absoluto (`horasQr − horasHorometro`) y porcentual respecto del horómetro; porcentual `null` si horómetro es 0.
  - `registrarLectura(l: { equipo_id: string; horas_horometro: number; observacion?: string }): Promise<void>` — guarda la lectura junto con las horas del sistema al momento.
  - `listarLecturas(equipoId: string): Promise<Lectura[]>`.
  - `POST /api/horometro` → `{ ok }`; `GET /api/horometro?equipo_id=` → `Lectura[]`.

- [ ] **Step 1: Escribir el test que falla**

`test/horometro.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { calcularDesvio } from "@/lib/horometro";

describe("calcularDesvio", () => {
  it("QR mide de más → desvío positivo", () => {
    expect(calcularDesvio(105, 100)).toEqual({ absoluto: 5, porcentual: 5 });
  });
  it("QR mide de menos → desvío negativo", () => {
    expect(calcularDesvio(95, 100)).toEqual({ absoluto: -5, porcentual: -5 });
  });
  it("coincidencia exacta → cero", () => {
    expect(calcularDesvio(100, 100)).toEqual({ absoluto: 0, porcentual: 0 });
  });
  it("horómetro en 0 → porcentual null", () => {
    expect(calcularDesvio(10, 0)).toEqual({ absoluto: 10, porcentual: null });
  });
  it("redondea a 2 decimales", () => {
    expect(calcularDesvio(100.005, 100).absoluto).toBe(0.01);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run test/horometro.test.ts`
Expected: FAIL (import no resuelto).

- [ ] **Step 3: Implementación de la lógica pura**

`lib/horometro.ts`:
```ts
/**
 * Desvío entre las horas calculadas por el sistema (QR) y la lectura del
 * horómetro interno del equipo, que actúa como patrón de contraste.
 */
export function calcularDesvio(
  horasQr: number, horasHorometro: number
): { absoluto: number; porcentual: number | null } {
  const absoluto = Math.round((horasQr - horasHorometro) * 100) / 100;
  const porcentual =
    horasHorometro === 0 ? null : Math.round((absoluto / horasHorometro) * 10000) / 100;
  return { absoluto, porcentual };
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run test/horometro.test.ts`
Expected: 5 tests PASS.

- [ ] **Step 5: Capa de datos**

`lib/db/horometro.ts`:
```ts
import { sql } from "./client";
import { getEquipo } from "./equipos";

export interface Lectura {
  id: number; equipo_id: string; fecha: string;
  horas_horometro: number; horas_qr_al_momento: number | null; observacion: string | null;
}

export async function registrarLectura(l: {
  equipo_id: string; horas_horometro: number; observacion?: string;
}): Promise<void> {
  const eq = await getEquipo(l.equipo_id);
  if (!eq) throw new Error(`Equipo ${l.equipo_id} no existe`);
  await sql`
    INSERT INTO lecturas_horometro (equipo_id, horas_horometro, horas_qr_al_momento, observacion)
    VALUES (${l.equipo_id}, ${l.horas_horometro}, ${eq.horas_acumuladas}, ${l.observacion ?? null})`;
}

export async function listarLecturas(equipoId: string): Promise<Lectura[]> {
  return sql<Lectura[]>`
    SELECT * FROM lecturas_horometro WHERE equipo_id = ${equipoId} ORDER BY fecha DESC`;
}
```

- [ ] **Step 6: API**

`app/api/horometro/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { registrarLectura, listarLecturas } from "@/lib/db/horometro";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("equipo_id");
  if (!id) return NextResponse.json({ ok: false, error: "falta equipo_id" }, { status: 400 });
  return NextResponse.json(await listarLecturas(id));
}

export async function POST(req: NextRequest) {
  const { equipo_id, horas_horometro, observacion } = await req.json();
  if (!equipo_id || horas_horometro == null) {
    return NextResponse.json({ ok: false, error: "faltan datos" }, { status: 400 });
  }
  await registrarLectura({ equipo_id, horas_horometro: Number(horas_horometro), observacion });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 7: Bloque de contraste en el detalle del equipo**

Modificar `app/equipos/[id]/page.tsx`: agregar sección "Contraste con horómetro interno" con (a) formulario cliente para cargar una lectura (`horas_horometro` + observación) que hace `POST /api/horometro`, y (b) tabla del historial de lecturas mostrando fecha, horas-horómetro, horas-QR al momento, y el desvío absoluto y porcentual usando `calcularDesvio`. Mostrar una nota: "El horómetro interno actúa como patrón de contraste independiente (ver TFI, estrategia de validación en dos niveles)".

- [ ] **Step 8: Verificación de build**

Run: `npx tsc --noEmit && npm run build`
Expected: sin errores.

- [ ] **Step 9: Commit**

```bash
git add lib/horometro.ts lib/db/horometro.ts app/api/horometro test/horometro.test.ts app/equipos/[id]/page.tsx
git commit -m "feat: contraste de horas QR contra horómetro interno del equipo"
```

---

## FASE 4 — Despliegue

### Task 4.1: README y guía de despliegue (Neon + Vercel)

**Files:**
- Create: `README.md`

**Interfaces:** documentación; sin código.

- [ ] **Step 1: Escribir `README.md`** (español) con: descripción; nota "datos mínimos / sin datos de pacientes"; **regla de honestidad** (flag `origen`); requisitos (Node 18+); pasos de despliegue:
  1. Crear base gratuita en Neon, copiar `DATABASE_URL`.
  2. Correr `db/schema.sql` y `db/seed.sql` en el SQL editor de Neon.
  3. `.env.local` con `DATABASE_URL` (y `TABLERO_PIN` opcional).
  4. Subir repo a GitHub (público, MIT).
  5. Importar en Vercel, setear `DATABASE_URL` (y `TABLERO_PIN`), deploy.
  6. Acceso por HTTPS desde cualquier celular.
- Incluir sección "Replicabilidad": cualquier hospital clona, crea su base, ajusta el seed y despliega.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README con despliegue Neon/Vercel y regla de honestidad"
```

---

### Task 4.2: Despliegue end-to-end (acción de la usuaria + verificación)

**Files:** ninguno (operación de infraestructura).

> **Nota:** Claude NO crea cuentas ni maneja credenciales. Yamila crea sus cuentas gratuitas de Neon y Vercel; Claude la guía y usa el `DATABASE_URL` que ella provea para configurar `.env.local` y verificar.

- [ ] **Step 1:** Yamila crea la base en Neon y comparte el `DATABASE_URL`. Claude lo pone en `.env.local`.
- [ ] **Step 2:** Correr `schema.sql` + `seed.sql` en Neon (o vía script). Verificar 101 equipos: `SELECT tipo, count(*) FROM equipos GROUP BY tipo`.
- [ ] **Step 3:** `npm run dev`, probar flujo real desde el celular: escanear un QR generado en `/etiquetas`, activar/desactivar, ver el ciclo en el detalle, ver el tablero.
- [ ] **Step 4:** Push a GitHub, importar en Vercel, setear env vars, deploy. Probar la URL pública desde el celular.
- [ ] **Step 5:** Registrar en el TFI (bloque verde) la URL del repo y de la app desplegada.

---

## FASE 5 — Generador de cronograma de ejecución

### Task 5.1: Configuración del escenario (datos, TDD ligero)

**Files:**
- Create: `lib/escenario.ts`, `test/escenario.test.ts`

**Interfaces:**
- Produces: constante `ESCENARIO` con los parámetros del spec §2 y `perfilBombas(complejidad): number` (bombas según perfil). Tipos `EscenarioConfig`.

- [ ] **Step 1: Test que falla**

`test/escenario.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { ESCENARIO, perfilBombas } from "@/lib/escenario";

describe("ESCENARIO", () => {
  it("tiene 14 camas y el parque correcto", () => {
    expect(ESCENARIO.camas).toBe(14);
    expect(ESCENARIO.ventiladores).toBe(17);
    expect(ESCENARIO.monitores).toBe(14);
    expect(ESCENARIO.bombas).toBe(70);
  });
  it("perfilBombas devuelve rangos esperados", () => {
    expect(perfilBombas("baja")).toBeGreaterThanOrEqual(1);
    expect(perfilBombas("baja")).toBeLessThanOrEqual(2);
    expect(perfilBombas("alta")).toBeGreaterThanOrEqual(6);
    expect(perfilBombas("alta")).toBeLessThanOrEqual(8);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run test/escenario.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementación**

`lib/escenario.ts`:
```ts
export interface EscenarioConfig {
  camas: number; ventiladores: number; monitores: number; bombas: number;
  ocupacion: number;            // 0..1
  rotacionPacientesDia: number; // ingresos/egresos por día
  fraccionVentilados: number;   // 0..1 de camas ocupadas
}

// Parámetros del escenario de referencia (SATI-Q 2025 + supuestos declarados). Ver spec §2.
export const ESCENARIO: EscenarioConfig = {
  camas: 14, ventiladores: 17, monitores: 14, bombas: 70,
  ocupacion: 0.88,
  rotacionPacientesDia: 2.3,
  fraccionVentilados: 0.3575, // días-cama con ventilación invasiva (SATI-Q 2025)
};

/** Bombas simultáneas por paciente según complejidad. Determinístico por perfil (punto medio del rango). */
export function perfilBombas(complejidad: "baja" | "media" | "alta"): number {
  if (complejidad === "baja") return 2;   // rango 1-2
  if (complejidad === "media") return 4;  // rango 3-5
  return 7;                                // rango 6-8
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run test/escenario.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/escenario.ts test/escenario.test.ts
git commit -m "feat: configuración del escenario de referencia (SATI-Q 2025)"
```

---

### Task 5.2: Generador de cronograma con estado de pool (lógica pura, TDD)

**Files:**
- Create: `lib/cronograma.ts`, `test/cronograma.test.ts`

**Interfaces:**
- Consumes: `ESCENARIO`, `perfilBombas`.
- Produces:
  - Tipo `Evento = { dia: number; turno: 'mañana'|'tarde'|'noche'; accion: 'activar'|'desactivar'; equipoId: string; cama: number }`.
  - `generarCronograma(dias: number, seed: number): Evento[]` — determinístico por `seed`; mantiene estado del pool (qué IDs están libres/ocupados por tipo); nunca activa un equipo ya en uso ni desactiva uno libre; reparte los IDs de bomba (rota el pool) para distribuir horas; respeta "sin memoria bomba-paciente" (al liberar, la bomba vuelve al pool y puede reasignarse a cualquiera).

- [ ] **Step 1: Test que falla (invariantes)**

`test/cronograma.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { generarCronograma, Evento } from "@/lib/cronograma";

function validarCoherencia(eventos: Evento[]) {
  const enUso = new Set<string>();
  for (const e of eventos) {
    if (e.accion === "activar") {
      expect(enUso.has(e.equipoId)).toBe(false); // no activar algo ya en uso
      enUso.add(e.equipoId);
    } else {
      expect(enUso.has(e.equipoId)).toBe(true);  // no desactivar algo libre
      enUso.delete(e.equipoId);
    }
  }
}

describe("generarCronograma", () => {
  it("es coherente con el estado del pool", () => {
    validarCoherencia(generarCronograma(14, 42));
  });
  it("es determinístico por seed", () => {
    expect(generarCronograma(14, 42)).toEqual(generarCronograma(14, 42));
  });
  it("distribuye entre muchas bombas (no siempre la misma)", () => {
    const eventos = generarCronograma(14, 42);
    const bombas = new Set(eventos.filter(e => e.equipoId.startsWith("BIC")).map(e => e.equipoId));
    expect(bombas.size).toBeGreaterThan(20); // usa muchas bombas distintas
  });
  it("genera un volumen razonable de escaneos", () => {
    const eventos = generarCronograma(14, 42);
    const porDia = eventos.length / 14;
    expect(porDia).toBeGreaterThan(20);
    expect(porDia).toBeLessThan(120);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run test/cronograma.test.ts`
Expected: FAIL (import no resuelto).

- [ ] **Step 3: Implementación**

`lib/cronograma.ts`: implementar un PRNG determinístico (mulberry32 con `seed`), un pool por tipo (arrays de IDs libres/ocupados con la cama que los tiene), y un bucle por día/turno que:
- Decide ingresos/egresos según `ESCENARIO.rotacionPacientesDia` (repartidos en turnos).
- En un ingreso: elige cama libre, activa monitor de esa cama, decide complejidad (sortea baja/media/alta con pesos 30/50/20), activa `perfilBombas` bombas tomadas del pool libre, y con prob. `fraccionVentilados` activa un ventilador.
- En un egreso: elige una cama ocupada, desactiva su monitor, ventilador (si tenía) y todas sus bombas → vuelven al pool.
- Además, algunos "cambios de bomba" intra-estadía: a una cama ocupada se le retira una bomba (desactivar) o se le suma una del pool (activar), respetando la regla sin-memoria.
- Formatea IDs con cero-padding (VEN-07, MON-03, BIC-023) coincidiendo con el seed.

Escribir el módulo completo (PRNG + estructuras de pool + bucle) devolviendo `Evento[]` ordenado por día/turno. El IdFormat de bombas debe ser `BIC-0NN` de 3 dígitos para coincidir con `db/seed.sql` (BIC-001..BIC-070); ventiladores/monitores 2 dígitos (VEN-01, MON-01).

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run test/cronograma.test.ts`
Expected: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/cronograma.ts test/cronograma.test.ts
git commit -m "feat: generador de cronograma con estado de pool (determinístico, TDD)"
```

---

### Task 5.3: Script exportador del cronograma + planilla

**Files:**
- Create: `scripts/generar-cronograma.ts`, `tfi/planilla-registro.csv`

**Interfaces:**
- Consumes: `generarCronograma`.
- Produces: `tfi/cronograma.md` (legible/imprimible, agrupado por día y turno con los IDs exactos) y `tfi/cronograma.csv`.

- [ ] **Step 1: Script**

`scripts/generar-cronograma.ts`: llama `generarCronograma(14, SEED)`, agrupa por día/turno, escribe `tfi/cronograma.md` (formato del ejemplo del spec §9: "Día 4 — mañana: activar VEN-07, MON-07, BIC-023…") y `tfi/cronograma.csv` (columnas: dia,turno,accion,equipoId,cama). Semilla fija para reproducibilidad.

- [ ] **Step 2: Planilla de registro**

`tfi/planilla-registro.csv`: encabezados para la recolección manual de resultados de las 4 etapas: `etapa,fecha,metrica,valor_esperado,valor_obtenido,observacion`. Prellenar filas guía (tasa de lectura QR, exactitud de horas, cortes de red recuperados, latencia, disparo AMP, MTBF).

- [ ] **Step 3: Ejecutar y verificar**

Run: `npm run cronograma`
Expected: crea `tfi/cronograma.md` y `tfi/cronograma.csv`. Abrir el `.md` y verificar que un día tiene IDs concretos y es coherente.

- [ ] **Step 4: Commit**

```bash
git add scripts/generar-cronograma.ts tfi/cronograma.md tfi/cronograma.csv tfi/planilla-registro.csv
git commit -m "feat: exportador de cronograma (md+csv) y planilla de registro"
```

---

## FASE 6 — Documento TFI con marcado en verde

### Task 6.1: Helper de marcado y estructura del generador

**Files:**
- Create: `scripts/generar-tfi.ts` (parte 1: helpers y estructura)

**Interfaces:**
- Produces: helpers `negro(texto): TextRun`, `verde(texto): TextRun` (color 008000), `parrafo(...runs)`, `titulo(texto, nivel)`; función `main()` que ensambla el documento y lo escribe en `tfi/TFI_Rayts_Yamila.docx`.

- [ ] **Step 1: Estructura base del script**

`scripts/generar-tfi.ts`: importar de `docx` (`Document, Packer, Paragraph, TextRun, HeadingLevel, Table, ...`). Configurar página A4, Times New Roman 12, interlineado 1,5, justificado (via estilos por defecto del documento). Definir helpers:
```ts
import { TextRun } from "docx";
const VERDE = "008000";
export const negro = (t: string) => new TextRun({ text: t });
export const verde = (t: string) => new TextRun({ text: t, color: VERDE, bold: true });
```
Escribir el esqueleto de `main()` con la carátula (título, estudiante, DNI 36873926, cohorte N°1 2024, correo, director Bioing. Ramiro Barreiro, fecha) y el índice.

- [ ] **Step 2: Verificar que compila y genera un docx mínimo**

Run: `npm run tfi`
Expected: crea `tfi/TFI_Rayts_Yamila.docx` (aunque sea con carátula + índice).

- [ ] **Step 3: Commit**

```bash
git add scripts/generar-tfi.ts
git commit -m "feat: generador TFI — helpers de marcado (negro/verde) y carátula"
```

---

### Task 6.2: Contenido en negro (teoría, diseño, metodología, discusión)

**Files:**
- Modify: `scripts/generar-tfi.ts` (agregar secciones)

**Interfaces:**
- Consumes: helpers de Task 6.1; contenido del borrador `TFI_Rayts_Yamila_completo.docx` y del spec.

- [ ] **Step 1: Volcar el contenido definitivo (negro)** — Introducción (contexto, marco teórico con citas verificadas: OMS 2012, UNE-EN 13306, EN 15341, Iadanza 2019, Ma 2021, Alshamasneh 2021, Wang 2013, Pereira 2023), Objetivos (6), Metodología (enfoque, **tabla de supuestos SATI-Q 2025** del spec §2, estrategia de validación en dos planos, 6 fases, criterios de inclusión), Resultados-diseño (arquitectura, modelo de datos, indicadores EN 15341, umbrales, componentes de desgaste por tipo, arquitectura informática), Discusión (viabilidad técnica/operativa/normativa, **matriz de validez**, limitaciones y hoja de ruta), Referencias, Anexos A-C.

- [ ] **Step 1b: Incorporar el contenido derivado de las observaciones del jefe de carrera** (ver spec §2 "Alcance del equipamiento" y "Validación de las horas registradas"):
  1. **Criterios de inclusión (§4.5)**: fundamentar la exclusión de equipos itinerantes (ecógrafo, ECG, RX). Argumento: el QR captura inicio y fin de ciclo, por lo que la relación señal-ruido depende de la duración del ciclo — en equipos de cama (horas/días) el tiempo de escaneo es despreciable y el dato confiable; en itinerantes (minutos) es comparable al uso y vuelve ruidosa la medición. Además su desgaste no correlaciona con horas (RX por disparos, ECG por estudios). Aclarar que **el software es genérico** (el campo `tipo` es libre, aplicable a todo el parque); lo acotado es el alcance de validación del TFI.
  2. **Estrategia de validación en dos niveles (§4.3)**: (a) exactitud del cálculo, validada empíricamente contra los tiempos reales de cada ciclo (referencia = tiempo real transcurrido, timestamps controlados); (b) contraste con medición independiente mediante el **horómetro interno del ventilador**, que cumple doble rol (equipo registrado y patrón de contraste) — incorporado como propuesta metodológica, con el mecanismo ya implementado en el sistema (`lecturas_horometro`), y ejecución empírica diferida al piloto real por requerir el equipo físico.
  3. **Discusión/limitaciones**: descarte del **sensor de corriente** como patrón de contraste — ventiladores y bombas poseen baterías internas, por lo que el consumo durante la carga se confundiría con uso real del equipo, comprometiendo la validez de la medición. Se propone el horómetro del ventilador como fuente confiable.
  4. **Matriz de validez (§6.2)**: agregar fila "Contraste con medición independiente (horómetro) → No validado en esta etapa → Piloto real con el ventilador como patrón".

Tomar el texto del borrador ya redactado (`scratchpad/tfi_completo.txt`) para las partes que ya están en negro; agregar la tabla de supuestos SATI-Q y las 3 fuentes nuevas verificadas.

- [ ] **Step 2: Regenerar y revisar**

Run: `npm run tfi`
Expected: docx con todas las secciones en negro.

- [ ] **Step 3: Commit**

```bash
git add scripts/generar-tfi.ts
git commit -m "feat: TFI — contenido definitivo en negro (teoría, diseño, metodología, discusión)"
```

---

### Task 6.3: Marcadores en verde + render y verificación visual

**Files:**
- Modify: `scripts/generar-tfi.ts` (agregar bloques verdes)

**Interfaces:** Consumes: helper `verde`.

- [ ] **Step 1: Insertar los bloques verdes** en: Resumen/Abstract (cifras de resultados), 5.4.4 (capturas + URLs), 5.5 (resultados de las 4 etapas), MTBF (con nota de datos sintéticos), tabla resumen de resultados, 6.1.1 y 6.3 (interpretación), conclusión de validación empírica, Anexo D (protocolo ejecutado). Cada bloque redactado como instrucción: `verde("[COMPLETAR tras Etapa 2 — tasa de lectura correcta = __%; N escaneos]")`. Para datos sin fuente confirmada usar `verde("[VERIFICAR FUENTE — ...]")`.

- [ ] **Step 2: Regenerar**

Run: `npm run tfi`
Expected: docx completo con negro + verde.

- [ ] **Step 3: Render a PDF y verificación visual**

Run (usa la skill docx / LibreOffice si está disponible):
```bash
python "<ruta-skill-docx>/scripts/office/soffice.py" --headless --convert-to pdf --outdir tfi tfi/TFI_Rayts_Yamila.docx
```
Leer el PDF resultante y verificar: formato UNAJ (A4, TNR 12, interlineado 1,5), que el verde se distingue del negro, que la carátula y el índice están bien, y que los bloques verdes aparecen donde corresponde. Si `soffice` no está disponible, verificar abriendo el `.docx` manualmente.

- [ ] **Step 4: Commit**

```bash
git add scripts/generar-tfi.ts tfi/TFI_Rayts_Yamila.docx
git commit -m "feat: TFI — marcadores en verde de datos a completar + documento generado"
```

---

## Self-Review (cobertura del spec)

- **App (Next.js/Neon/Vercel)** → Fases 0-4. ✅
- **5 tablas + flag origen** → Task 1.1. ✅
- **Contraste con horómetro (observación del jefe de carrera)** → Task 3.4 + Task 6.2 Step 1b. ✅
- **Fundamento de exclusión de itinerantes** → Task 6.2 Step 1b. ✅
- **Escaneo rápido con toggle, antidoble-lectura, tolerancia a red** → Task 1.5. ✅
- **Umbrales/% editables** → Task 2.2 (PATCH) + 2.3 (UI). ✅
- **Indicadores EN 15341 (incluido MTBF con nota sintética)** → Task 2.1 + 2.4. ✅
- **Reporte de falla real (origen='real')** → Task 3.1. ✅
- **Modo prueba (horas iniciales, stress, fallas sintéticas)** → Task 3.2. ✅
- **/etiquetas con selección, copias, reimpresión** → Task 3.3. ✅
- **Despliegue + regla de honestidad en README** → Task 4.1-4.2. ✅
- **Escenario de referencia SATI-Q** → Task 5.1. ✅
- **Cronograma con estado de pool e IDs** → Task 5.2-5.3. ✅
- **Documento TFI con marcado en verde, fuentes verificadas** → Fase 6. ✅
- **Sin datos de pacientes / costo cero / MIT** → Global Constraints, aplicados en todo el plan. ✅

Componentes de desgaste: contenido documental en Task 6.2 (no requiere seguimiento por componente, según diseño). ✅
```
