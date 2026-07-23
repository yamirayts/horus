# horus

Sistema de registro de horas de uso de equipamiento crítico de UCI mediante escaneo de códigos QR.

Prototipo desarrollado como Trabajo Final Integrador (TFI) de Yamila Rayts, Especialización en Ingeniería Clínica (UNAJ).

## Qué es

Cada equipo (bomba de infusión, monitor, ventilador, etc.) lleva una etiqueta con un código QR. El personal escanea el QR al iniciar y al finalizar el uso; el sistema calcula automáticamente las horas de uso por ciclo, acumula el total por equipo, compara contra el umbral de horas definido para ese modelo y dispara alertas cuando se acerca o supera el umbral. Un tablero central resume el estado del parque con indicadores de la norma EN 15341 (TUE, MTBF, proyección de mantenimiento preventivo).

## Nota de datos mínimos

El sistema **no registra información de pacientes**. Los únicos datos que se almacenan son datos del equipo: identificador, marca/modelo, timestamps de inicio y fin de uso, y la ubicación del equipo (cama o sector) — nunca la identidad ni datos clínicos de la persona internada. Esto es una decisión de diseño, no una limitación técnica: el sistema mide equipamiento, no pacientes.

## Regla de honestidad ⚠️

Todo dato que no provenga de un escaneo humano real está marcado con `origen='sintetico'` en la base de datos (columna presente en `ciclos_uso` y `fallas`).

Los datos sintéticos existen exclusivamente para validar el procesamiento del sistema — el cálculo de horas, el disparo de alertas, la estimación de MTBF — bajo volúmenes y escenarios que el uso real acumulado durante el desarrollo del TFI todavía no alcanza a cubrir. **No se generan para simular uso real ni para inflar métricas.**

Este origen se declara de forma transparente en el informe del TFI, y puede auditarse en cualquier momento consultando la columna `origen` de la base. Es un principio no negociable del proyecto: ningún dato sintético se presenta como si fuera real, ni en el tablero ni en el informe.

## Alcance del sistema

El software es genérico: cualquier tipo de equipo biomédico con un ciclo de uso identificable (inicio/fin) puede darse de alta y monitorearse con esta herramienta, sin cambios de código.

El TFI, en cambio, acota su validación a tres tipos de equipo de cama de alto uso horario: bombas de infusión, monitores multiparamétricos y ventiladores. Esta acotación responde a razones metodológicas (volumen de eventos necesario para que los indicadores sean significativos en el plazo del trabajo) que se explican en detalle en el informe del TFI, no a una limitación del software.

## Requisitos

- Node.js 18.17 o superior
- Un navegador con acceso a cámara para escanear códigos QR (funciona en celulares y notebooks)
- Una base de datos Postgres (se usa [Neon](https://neon.tech), capa gratuita)

## Stack

- [Next.js 14](https://nextjs.org/) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- Postgres ([Neon](https://neon.tech)) vía [`postgres`](https://github.com/porsager/postgres)
- [`html5-qrcode`](https://github.com/mebjas/html5-qrcode) para el escaneo desde el navegador
- [`qrcode`](https://github.com/soldair/node-qrcode) para generar e imprimir las etiquetas

## Despliegue

### 1. Base de datos en Neon

1. Crear una cuenta y un proyecto gratuito en [neon.tech](https://neon.tech).
2. Copiar el `DATABASE_URL` que provee Neon (incluye usuario, password, host y nombre de base).
3. Abrir el SQL editor de Neon y ejecutar, en este orden:
   - `db/schema.sql` — crea las 5 tablas del sistema.
   - `db/seed.sql` — carga un parque de referencia de 101 equipos (escenario SATI-Q). Este seed es un ejemplo de partida: cada institución puede reemplazarlo por su propio parque de equipos antes o después del primer deploy.

### 2. Configuración local

1. Copiar `.env.example` a `.env.local`.
2. Completar `DATABASE_URL` con el valor copiado de Neon.
3. El tablero (`/tablero`) es público en esta versión: no requiere PIN ni login. No expone datos sensibles de pacientes, solo estado y horas de uso del equipamiento — está fuera de los objetivos de este TFI.

### 3. Desarrollo local

```bash
npm install
npm run dev
```

La app queda disponible en [http://localhost:3000](http://localhost:3000).

### 4. Publicar el repositorio

Subir el repositorio a GitHub como público, con licencia MIT (ver `LICENSE`).

### 5. Deploy en Vercel

1. Importar el repositorio de GitHub en [Vercel](https://vercel.com).
2. Configurar la variable de entorno del proyecto: `DATABASE_URL`.
3. Ejecutar el deploy.

### 6. Acceso

Una vez desplegado, la app queda accesible por HTTPS desde cualquier celular u otro dispositivo con navegador, en la URL pública que asigna Vercel.

## Uso

Pantallas principales:

- `/` — escaneo de QR (inicio/fin de uso de un equipo).
- `/equipos` — listado del parque de equipos, con estado y horas acumuladas.
- `/equipos/[id]` — detalle de un equipo (historial, umbral, mantenimiento, lecturas de horómetro).
- `/alta` — alta de un nuevo equipo.
- `/tablero` — tablero de Ingeniería Clínica con indicadores EN 15341 (TUE, MTBF, proyección de PM) y alertas.
- `/etiquetas` — generación e impresión de etiquetas QR para el parque.
- `/prueba` — modo prueba: carga de horas iniciales, generación de estrés y fallas sintéticas para validar el procesamiento (todo bajo `origen='sintetico'`).

## Replicabilidad

Cualquier hospital o servicio puede reutilizar este sistema sin modificar código:

1. Clonar este repositorio.
2. Crear su propia base gratuita en Neon (o cualquier Postgres compatible).
3. Correr `db/schema.sql` para crear las tablas.
4. Reemplazar `db/seed.sql` por el parque de equipos real de la institución (mismo formato: id, tipo, marca, modelo, umbral de horas), o adaptar el seed provisto como punto de partida.
5. Desplegar en Vercel siguiendo los pasos de la sección anterior.

El seed incluido en este repositorio (101 equipos, escenario de referencia SATI-Q) es solo un ejemplo para desarrollo y demostración: no representa el parque de ninguna institución en particular.

## Licencia

[MIT](./LICENSE).
