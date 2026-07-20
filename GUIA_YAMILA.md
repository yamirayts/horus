# Guía de pasos — Yamila (proyecto horus)

Esta es tu hoja de ruta personal: **solo lo que tenés que hacer vos**. Claude construye la app y los documentos; acá está tu parte. Se va completando a medida que avanzamos.

---

## Estado general

- [ ] App construida (Fases 0-3) — *lo hace Claude*
- [ ] **Cuenta Neon creada + base cargada** (Fase 4) — *tu parte* 👇
- [ ] **Cuenta Vercel + despliegue** (Fase 4) — *tu parte* 👇
- [ ] **QR impresos y panel montado** (Etapa 1) — *tu parte* 👇
- [ ] **2 semanas de escaneo** (Etapa 2) — *tu parte* 👇
- [ ] Pruebas de red y stress (Etapas 3-4) — *tu parte, con guía* 👇
- [ ] Datos volcados al TFI — *lo hace Claude con tus planillas*

---

## PASO 1 — Crear la base de datos (Neon) 🟢 *tu parte*

Cuándo: cuando Claude te avise que la app está lista (fin Fase 3).

1. Entrá a **https://neon.tech** y creá una cuenta gratuita (podés usar tu Google).
2. Creá un proyecto nuevo (nombre: `horus`).
3. Copiá el **connection string** (`DATABASE_URL`, empieza con `postgres://...`).
4. **Pegámelo en el chat** — con eso configuro la app y cargo los 101 equipos.

> ⚠️ El `DATABASE_URL` es una credencial. Pegándolo en el chat me autorizás a usarlo para configurar TU proyecto. No lo publico en ningún lado.

---

## PASO 2 — Imprimir los QR y montar el panel 🟢 *tu parte*

Cuándo: apenas la base esté cargada (los QR recién existen acá).

1. Abrí la app → pantalla **`/etiquetas`**.
2. "Seleccionar todo" → **Imprimir** → salen los ~101 QR en hojas A4.
3. Recortá. **Plastificá una muestra de ~20** (3 ventiladores + 3 monitores + ~14 bombas) — esos son los que mandás a plastificar.
4. Armá el **panel** (cartulina/foam): 14 zonas "cama" (cada una con su ventilador + monitor) + una zona "pool de bombas" + zona backup.
5. Pegá las tarjetas de bomba con **velcro o doble faz de espuma** (para poder moverlas pool↔cama).

> El panel es también lo que llevás a la defensa. Sacale fotos para el TFI (Anexo D).

---

## PASO 3 — Desplegar en internet (Vercel) 🟢 *tu parte* (opcional pero recomendado)

Cuándo: después de probar en local.

1. Entrá a **https://vercel.com**, cuenta gratuita, conectá tu GitHub.
2. Importá el repo `horus`.
3. En "Environment Variables" pegá tu `DATABASE_URL`.
4. Deploy → te da una URL `https://...vercel.app`.
5. Abrila desde el celular: ya podés escanear de verdad.

*(Si preferís, se puede hacer todo en local desde tu compu; Vercel es para acceder desde el celular por internet.)*

---

## PASO 4 — Las 2 semanas de prueba 🟢 *tu parte*

Tu libreto diario está en **`tfi/cronograma.md`** (te dice los IDs exactos a escanear cada día). Cada día:

1. Abrí `tfi/cronograma.md` en el día que corresponde.
2. Escaneá los equipos que indica (activar/desactivar), apuntando a las celdas del panel.
3. Anotá en **`tfi/planilla-registro.csv`**: cuántos escaneos, lecturas fallidas, condiciones de luz.

**Etapa 3 (días 3, 7, 11):** en medio de unos escaneos, poné el celular en **modo avión** un momento y verificá que el registro no se pierde (la app reintenta). Anotá qué pasó.

**Etapa 4 (días 12-13):** desde la pantalla **`/prueba`**: cargá horas iniciales altas + botón stress a un equipo → **filmá la alerta saltando**. Cargá fallas sintéticas → verificá el MTBF en el tablero.

---

## PASO 5 — Cerrar el TFI

Cuando termines las 2 semanas, pasame las planillas (`planilla-registro.csv` completada + las fotos/videos). Claude reemplaza los **bloques verdes** del documento TFI con tus datos reales. Listo para tu director.

---

## Mientras tanto podés ir mandando a tu director

El documento **`tfi/TFI_Rayts_Yamila.docx`** (Fase 6) tiene TODO lo teórico en **negro** (listo para leer/evaluar) y solo los resultados en **verde** (a completar). Se lo podés mandar apenas esté generado, sin esperar las pruebas.
