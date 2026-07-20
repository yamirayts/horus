# Diseño — Sistema de registro de uso de equipamiento crítico de UCI (proyecto "horus")

**Fecha:** 2026-07-16
**Autora:** Yamila Belén Rayts — TFI, Especialización en Ingeniería Clínica (UNAJ)
**Director:** Bioing. Ramiro Barreiro
**Estado:** Diseño aprobado en brainstorming; pendiente de revisión del spec antes de writing-plans.

---

## 1. Contexto y objetivo del proyecto

Este repositorio produce **dos entregables complementarios** para el Trabajo Final Integrador (TFI):

1. **La aplicación** — una PWA web mobile-first para registrar horas de uso de equipamiento crítico de UCI mediante escaneo de QR, con tablero de indicadores para Ingeniería Clínica. Es el prototipo funcional y la base de la prueba de concepto del TFI.
2. **El documento TFI** — el informe académico completo (Word, normas UNAJ), redactado con las partes teóricas y de diseño en negro (listas para revisión del director) y los datos a completar tras las pruebas marcados en verde.

El proyecto responde al Plan de TFI ya aprobado por el Comité Académico y a las aclaraciones de los docentes (mails de julio 2026): 3 tipos de equipamiento (ventiladores, monitores multiparamétricos, bombas de infusión), escenario de referencia de una UCI de 14 camas del municipio de La Matanza.

### Principio rector de honestidad de datos

Regla no negociable, heredada del plan aprobado y del prompt de la app: **todo dato generado para prueba (no capturado por un escaneo humano real) se marca con el flag `origen='sintetico'` y se declara explícitamente como tal en el informe.** Los datos sintéticos sirven para validar que el sistema *procesa* correctamente el dato y dispara alertas — nunca para presentarse como mediciones reales del mundo. La ejecución de la prueba de concepto la realiza Yamila manualmente (escaneo real del flujo completo de 14 camas); lo sintético se limita a horas iniciales, prueba de stress y fallas para demostrar el cálculo del MTBF.

---

## 2. Escenario de referencia (base del dimensionamiento)

Parametrizado con fuentes reales verificadas + supuestos declarados.

### Fuente principal: SATI-Q UCI Adultos 2025

Informe oficial de benchmarking de la Sociedad Argentina de Terapia Intensiva (período 01/01/2025–31/12/2025; 21.317 episodios, 18.849 pacientes, 128.568 días/cama; incluye UTIs bonaerenses). Datos usados:

- **Días-cama con ARM y ventilación invasiva: 35,75%** → en 14 camas ≈ **5 camas ventiladas** en simultáneo (promedio).
- **Estadía media en UTI: 6,03 días** (mediana 3) → rotación ≈ **2,3 ingresos/egresos por día** con ocupación plena.
- Duración media de episodio ventilado: 9,20 días (mediana 5) → ciclos de ventilador de días.
- ARM invasiva: 23,44% de los episodios.

### Fuentes de apoyo (carga de bombas)

- **ECLIPSE / Blandford et al. 2018** (BMJ Qual Saf) — estudio observacional de infusiones IV (1.326 pacientes, 2.008 infusiones simultáneas, 16 hospitales NHS): la infusión múltiple simultánea es la norma en cuidados críticos.
- **HQ Ontario, Multiple IV Infusions Phase 2b (2014)** — escenario de paciente crítico complejo con 11 infusiones continuas simultáneas → cota superior.

### Parámetros del escenario (supuestos declarados en el TFI)

| Parámetro | Valor | Origen |
|---|---|---|
| Camas | 14 | dato del escenario |
| Ocupación | ~85-90% | supuesto declarado |
| Rotación pacientes | ~2,3/día | derivado de estadía media SATI-Q |
| Camas ventiladas simultáneas | ~5 | SATI-Q (35,75% días-cama VI) |
| Duración ciclo ventilador | ~9 días | SATI-Q |
| Bombas por paciente | 1-8, media ~3,5-4 | supuesto declarado (ECLIPSE, HQ Ontario, experiencia clínica) |
| Perfil bombas | baja 1-2 (30%) / media 3-5 (50%) / alta 6-8 (20%) | supuesto declarado |
| Monitor | 1 por cama ocupada, ciclo = estadía | supuesto |
| Parque total | 17 ventiladores (14+3 backup), 14 monitores, 70 bombas | dato del escenario |
| Flujo diario resultante | ~40-60 escaneos/día (toda la UCI) | derivado |

### Alcance del equipamiento: por qué solo los 3 de cama

Observación del jefe de carrera (Ignacio, jul-2026): contemplar ecógrafos, ECG y RX, y que el sistema sea robusto ante distintos formatos de uso. Resolución acordada:

- **El software es genérico**: el campo `tipo` es libre, de modo que cualquier institución puede dar de alta cualquier equipo. Lo acotado es el **alcance de validación del TFI**, no la capacidad del sistema.
- **Fundamento de la exclusión de itinerantes** (ecógrafo, ECG, RX): el QR captura *inicio y fin de ciclo*, por lo que la relación señal-ruido depende de la duración del ciclo. En equipos de cama (ciclos de horas o días) el tiempo de escaneo es despreciable y el dato es confiable; en itinerantes (uso de pocos minutos) el escaneo insume un tiempo comparable al uso, lo que vuelve ruidosa la medición. Además, su desgaste **no correlaciona con horas**: el RX se desgasta por disparos y el ECG por estudios realizados.
- Conclusión: el método propuesto tiene mejor sustento para equipos de alto uso horario, que son el objeto de estudio.

### Validación de las horas registradas (dos niveles)

Respuesta a la observación de validar el dato del QR contra un sistema independiente:

1. **Exactitud del cálculo (empírico, en esta etapa)**: se contrasta la acumulación del sistema contra los tiempos reales de cada ciclo, conocidos porque se controlan los timestamps. La referencia es el tiempo real transcurrido.
2. **Contraste con medición independiente (teórico, requiere equipo físico)**: el **horómetro interno del ventilador** actúa como patrón; el ventilador cumple doble rol (equipo registrado y patrón de contraste). El sistema incorpora el registro de lecturas de horómetro para hacerlo operativo en un piloto real.

**Descarte del sensor de corriente** (sugerido como alternativa): no es confiable como patrón porque ventiladores y bombas tienen **baterías internas**, de modo que el consumo durante la carga de batería se confundiría con uso real del equipo. Por eso se propone el horómetro del ventilador como fuente de contraste. (Hallazgo propio; va a Discusión/limitaciones.)

### Reglas de dominio (aportadas por la autora, kinesióloga/fisiatra)

- El escaneo ocurre **solo** al asignar la bomba al paciente y al retirarla. No hay escaneos intermedios.
- Las bombas se suman/retiran dinámicamente durante la estadía según indicación médica; cada uso es un ciclo independiente.
- **Sin memoria bomba-paciente**: al retirarse, la bomba vuelve al pool de disponibles; una nueva necesidad toma cualquier bomba disponible.
- No todos los pacientes están ventilados.

---

## 3. Arquitectura y estructura del repositorio

**Stack:** Next.js 14 (App Router) + TypeScript + Tailwind CSS; Postgres en Neon (serverless, free); deploy en Vercel (free); escaneo con `html5-qrcode`; generación de QR con `qrcode`. Licencia MIT.

```
horus/
├── app/
│   ├── page.tsx               → / (Escaneo — pantalla principal, acción rápida)
│   ├── equipos/page.tsx       → lista de equipos
│   ├── equipos/[id]/page.tsx  → detalle + editar umbral/% + QR imprimible
│   ├── tablero/page.tsx       → tablero Ing. Clínica (alertas, indicadores EN 15341)
│   ├── alta/page.tsx          → alta de equipo + genera QR (incl. horas iniciales)
│   ├── etiquetas/page.tsx     → grilla de QRs imprimible (panel de defensa)
│   ├── prueba/page.tsx        → MODO PRUEBA (horas iniciales, stress, fallas sintéticas)
│   └── api/                   → routes: /scan, /equipos, /mantenimiento, /falla, /stress
├── lib/                       → lógica de negocio (horas, indicadores, estado del pool)
├── db/
│   ├── schema.sql             → 4 tablas
│   └── seed.sql               → ~101 equipos del escenario SATI-Q
├── docs/superpowers/specs/    → este diseño
├── tfi/                       → documento TFI (Word) + cronograma + planilla de registro
└── README.md                  → despliegue + nota de datos mínimos / honestidad
```

Arquitectura en tres capas (fiel al plan): presentación (cliente Next.js), lógica/datos (API routes + Neon), despliegue (GitHub + Vercel).

---

## 4. Modelo de datos

### Tabla `equipos`
```
id                TEXT PRIMARY KEY        -- codifica el QR (ej. "BIC-014", "MON-03", "VEN-07")
tipo              TEXT NOT NULL           -- 'bomba_infusion' | 'monitor' | 'ventilador'
marca             TEXT
modelo            TEXT
fecha_alta        DATE DEFAULT CURRENT_DATE
umbral_horas      INTEGER NOT NULL        -- editable por equipo
pct_alerta        NUMERIC(4,3) DEFAULT 0.80  -- % de aviso, editable (nivel amarillo)
pct_vencido       NUMERIC(4,3) DEFAULT 1.00  -- % de vencido, editable (nivel rojo)
horas_acumuladas  NUMERIC(10,2) DEFAULT 0
horas_iniciales   NUMERIC(10,2) DEFAULT 0  -- registro separado del uso previo cargado
estado            TEXT DEFAULT 'disponible' -- 'disponible' | 'en_uso' | 'mantenimiento'
ubicacion         TEXT                    -- cama/sector del equipo (NUNCA paciente)
```

### Tabla `ciclos_uso`
```
id           SERIAL PRIMARY KEY
equipo_id    TEXT NOT NULL REFERENCES equipos(id)
inicio       TIMESTAMPTZ NOT NULL
fin          TIMESTAMPTZ                  -- NULL mientras está en uso
horas_ciclo  NUMERIC(10,2)               -- se calcula al cerrar
ubicacion    TEXT
origen       TEXT NOT NULL DEFAULT 'real' -- 'real' | 'sintetico'
```

### Tabla `mantenimientos`
```
id                SERIAL PRIMARY KEY
equipo_id         TEXT NOT NULL REFERENCES equipos(id)
fecha             TIMESTAMPTZ DEFAULT now()
tipo              TEXT                    -- 'preventivo' | 'correctivo'
descripcion       TEXT
horas_al_momento  NUMERIC(10,2)
tecnico           TEXT
```

### Tabla `fallas`
```
id           SERIAL PRIMARY KEY
equipo_id    TEXT NOT NULL REFERENCES equipos(id)
fecha        TIMESTAMPTZ DEFAULT now()
tipo         TEXT                        -- 'no_enciende' | 'alarma' | 'bateria' | 'mecanica' | 'otra'
descripcion  TEXT
origen       TEXT NOT NULL DEFAULT 'real' -- 'real' (reporte de enfermería) | 'sintetico' (demo MTBF)
```

### Tabla `lecturas_horometro`
Registro de lecturas del horómetro interno del equipo (ventiladores), para contrastar contra las horas calculadas por QR.
```
id                SERIAL PRIMARY KEY
equipo_id         TEXT NOT NULL REFERENCES equipos(id)
fecha             TIMESTAMPTZ NOT NULL DEFAULT now()
horas_horometro   NUMERIC(10,2) NOT NULL   -- lectura del contador interno del equipo
horas_qr_al_momento NUMERIC(10,2)          -- horas acumuladas por el sistema al momento de la lectura
observacion       TEXT
```
El detalle del equipo muestra la comparación y el **desvío** (`horas_qr − horas_horometro`) entre ambas fuentes.

### Reglas de negocio
- **Toggle por escaneo**: equipo `disponible` → abre ciclo (`inicio=now()`), estado `en_uso`; equipo `en_uso` → cierra ciclo (`fin=now()`, `horas_ciclo=fin−inicio`, suma a `horas_acumuladas`), estado `disponible`.
- **Alerta AMP (aviso)**: `horas_acumuladas ≥ umbral_horas × pct_alerta`.
- **Alerta vencido**: `horas_acumuladas ≥ umbral_horas × pct_vencido`.
- **Mantenimiento** resetea `horas_acumuladas=0` y `horas_iniciales=0`.
- **Reporte de falla** (desde el escaneo, enfermería): crea fila en `fallas` con `origen='real'`; opcionalmente pone el equipo en estado `mantenimiento`.
- **Config por tipo**: valores por defecto de umbral/% por tipo aplicados en el alta, pisables por equipo. (Se puede resolver con una tabla `config_tipos` o con defaults en el seed; decisión de implementación.)
- **Anti-doble-lectura**: ignora el mismo QR escaneado dos veces en <3 s.

---

## 5. Pantallas y flujo

### `/` — Escaneo (crítica; optimizada para velocidad, <5 s por registro)
- Cámara **abierta al cargar** (sin paso previo).
- Al leer el QR → tarjeta grande con equipo, estado y **un botón** que ya dice la acción correcta (ACTIVAR verde / DESACTIVAR naranja). El sistema decide, el enfermero no piensa.
- Un toque → registra → confirmación ~1,5 s ("✓ BIC-014 ACTIVADO — 14:32") → la cámara vuelve sola.
- Botón **"⚠ Reportar falla"** secundario (chico, abajo): abre mini-form (tipo + descripción opcional), guarda con `origen='real'`.
- Robustez: reintento automático si falla la red (no se pierde el escaneo); anti-doble-lectura.
- Operable con una mano, sin logins en el camino del escaneo.

### `/equipos` — Lista
Cards/tabla: id, tipo, estado, horas acumuladas, % del umbral con barra de color (verde/amarillo/rojo), ubicación. Filtros por tipo y estado. Link al detalle.

### `/equipos/[id]` — Detalle
Datos; horas acumuladas discriminando carga inicial vs. ciclos reales; % del umbral; historial de ciclos, mantenimientos y fallas. Botones: Registrar mantenimiento (resetea), **Editar umbral / % de alerta / % de vencido**, Ver/Imprimir QR.
**Bloque de contraste con horómetro**: formulario para cargar una lectura del horómetro interno (fecha + horas) y tabla del historial de lecturas mostrando horas-QR vs horas-horómetro y el **desvío** entre ambas.

### `/tablero` — Ingeniería Clínica
- Panel de alertas: aviso (≥ pct_alerta), vencidos (≥ pct_vencido), equipos en falla.
- Resumen: total, en uso, disponibles, en mantenimiento (por tipo).
- Lista con % del umbral y barras.
- Indicadores EN 15341 (ver §6).
- Gráfico de horas por equipo/tipo (recharts si es simple; si no, barras CSS).

### `/alta` — Alta de equipo
Form mínimo: id, tipo, marca, modelo, umbral, % alerta, % vencido, horas iniciales. Al guardar genera el QR imprimible.

### `/etiquetas` — Generación e impresión de QR (con selección y reimpresión)
Función genuina del producto de código abierto: cualquier institución genera e imprime los QR que necesite sin tocar código.
- **Selección de qué imprimir**: todos; filtrados por tipo (bombas/monitores/ventiladores); o **individual con checkboxes** (para reimprimir solo los que se arruinaron, sin gastar la hoja entera). "Seleccionar todo" / "limpiar selección".
- **Copias por equipo**: campo para N copias del mismo QR (dos caras, backup).
- **Vista de grilla imprimible** (hoja de etiquetas A4), cada QR con su id debajo → recortar → plastificar → armar el panel de 14 camas + pool. Botón Imprimir usa el diálogo nativo del navegador (cualquier impresora hogareña).
- Reimpresión puntual de un equipo también disponible desde `/equipos/[id]` ("Ver/Imprimir QR").

### `/prueba` — MODO PRUEBA (banner visible)
Separado del uso normal. Todo lo que se genera acá queda `origen='sintetico'`:
- Carga de horas iniciales (individual y masiva).
- Botón de stress: empuja un equipo sobre el umbral para demostrar el disparo de la alerta AMP.
- Carga de fallas sintéticas para demostrar el cálculo del MTBF.

---

## 6. Indicadores del tablero (EN 15341:2019)

| Indicador | Fórmula | Datos |
|---|---|---|
| Horas acumuladas (HAM) | Σ horas_ciclo desde último mant. = `horas_acumuladas` | ✅ |
| Alerta mant. próximo (AMP) | 1 si HAM ≥ umbral × pct_alerta | ✅ |
| Alerta vencido | 1 si HAM ≥ umbral × pct_vencido | ✅ |
| Tasa de uso por equipo (TUE) | (horas_uso_periodo / horas_periodo) × 100; sobreexigido ≥85, subutilizado ≤30; mes = 720 h | ✅ |
| Disponibilidad por tipo | conteo estado='disponible' / total, por tipo | ✅ |
| Proyección de próximo PM | estimación por regresión simple sobre horas/día | ✅ |
| **MTBF** | tiempo medio entre fallas | ⚠ **solo con fallas sintéticas** — se declara como demostración del cálculo, NO como confiabilidad real del parque |

**Componentes de desgaste por tipo** (contenido teórico, Objetivo Específico 1; documentado desde literatura/fabricante, editable; sin seguimiento de horas por componente):
- Bomba: mecanismo peristáltico/dedos, motor, batería, sensores de oclusión y aire.
- Ventilador: turbina/blower, válvulas, sensores de flujo/O₂, batería, filtros.
- Monitor: batería, sensores y cables (SpO₂, ECG, PNI), pantalla.

El mantenimiento se modela a nivel de equipo (no por componente), fiel a la práctica real (OMS, AAMI, CMMS hospitalarios).

**Umbrales referenciales** (calibrables por institución): bomba 4.000-6.000 h, monitor 8.000-10.000 h, ventilador 5.000-8.000 h.

---

## 7. Documento TFI y sistema de marcado en verde

Base: borrador `TFI_Rayts_Yamila_completo.docx` (estructura Anexo 2 UNAJ). Formato UNAJ: A4, Times New Roman 12, interlineado 1,5, justificado, 20-30 páginas (sin contar figuras/anexos).

**Estados visuales:**
- **Negro**: texto definitivo, listo para evaluación del director.
- **Verde**: marcador de dato a completar tras las pruebas, redactado como instrucción concreta (qué dato, de qué etapa, placeholder de ejemplo).
- **Resaltado (opcional)**: nota/decisión pendiente de confirmar.

**Contenido incorporado por las observaciones del jefe de carrera** (jul-2026), todo en negro:
- **Criterios de inclusión del equipamiento**: fundamento de la exclusión de itinerantes (relación señal-ruido según duración del ciclo; desgaste no correlacionado con horas en RX/ECG) y aclaración de que el software es genérico mientras el alcance de validación es el acotado.
- **Estrategia de validación en dos niveles**: exactitud del cálculo (empírica) + contraste con horómetro del ventilador (teórico, con el ventilador en doble rol).
- **Discusión/limitaciones**: descarte del sensor de corriente como patrón por las baterías internas de ventiladores y bombas.
- **Matriz de validez**: fila "Contraste con medición independiente (horómetro) → No validado en esta etapa → Piloto real con ventilador como patrón".

**En negro ya** (evaluable de inmediato): Resumen (sin cifras de resultados), Introducción con marco teórico y citas reales, Objetivos (6), Metodología completa (con tabla de supuestos SATI-Q 2025, estrategia de validación en dos planos y en dos niveles, 6 fases, criterios de inclusión fundamentados), Diseño del sistema (arquitectura, modelo de datos, indicadores EN 15341, umbrales, componentes de desgaste, arquitectura informática), Discusión (viabilidad técnica/operativa/normativa, matriz de validez, limitaciones y hoja de ruta), Referencias verificadas, Anexos A-C.

**En verde** (tras pruebas): cifras de resultados en Resumen/Abstract; 5.4.4 capturas + URLs; 5.5 resultados de las 4 etapas; MTBF con nota de datos sintéticos; tabla resumen de resultados; 6.1.1 y 6.3 interpretación; conclusión de validación empírica; Anexo D protocolo ejecutado.

**Fuentes nuevas verificadas en esta sesión** (se suman a la bibliografía ya armada): SATI-Q UCI Adultos 2025; ECLIPSE/Blandford 2018 (BMJ Qual Saf); HQ Ontario Multiple IV Infusions Phase 2b 2014. **No se agrega ninguna cita no verificada**; todo dato sin fuente se marca en verde "[VERIFICAR FUENTE]" y se consulta con la autora, nunca se inventa.

Entregable: `tfi/TFI_Rayts_Yamila.docx`, renderizado a PDF y revisado visualmente antes de la entrega.

---

## 8. Orden de construcción

- **Hito 1 — Núcleo**: `schema.sql` + `seed.sql` (~101 equipos) → lógica de negocio (toggle, cálculo de horas) → pantalla `/` de escaneo.
- **Hito 2 — Gestión/visualización**: `/equipos`, `/equipos/[id]` (editar umbral/%), `/alta`, `/tablero` (indicadores + alertas).
- **Hito 3 — Fallas + modo prueba**: botón reportar falla (`origen='real'`) → `/prueba` (horas iniciales, stress, fallas sintéticas) → `/etiquetas`.
- **Hito 4 — Despliegue**: GitHub → Neon → Vercel → prueba end-to-end desde celular real (quedan las URLs para el TFI). Requiere que la autora cree sus cuentas gratuitas de Neon y Vercel (Claude no crea cuentas ni maneja credenciales).
- **Hito 5 — Documento TFI**: Word con marcado en verde (puede ir en paralelo; se entrega al director sin esperar las pruebas).

---

## 9. Plan de ejecución de la prueba de concepto (2 semanas)

Herramienta central: **cronograma día por día generado desde el escenario SATI-Q**, que indica los **IDs exactos** a escanear llevando el estado del pool (disponible/en uso). Garantiza distribución de horas verosímil entre las 70 bombas (ninguna en cero, ninguna con valor imposible), respeta la regla sin-memoria bomba-paciente, y es internamente coherente (nunca pide desactivar algo no activo ni asignar algo ya en uso).

Ejemplo de un día:
> **Día 4 — mañana:** Ingreso cama 7 (ventilado): activar VEN-07, MON-07, y bombas BIC-23, BIC-08, BIC-41, BIC-52 (próximas del pool). Egreso cama 2: desactivar MON-02, BIC-14, BIC-30, BIC-05 → vuelven al pool. Cama 11: retirar BIC-19 → vuelve al pool. (~11 escaneos, ~4 min.)

Mapeo de las 4 etapas de la Fase 5:

| Etapa | Cuándo | Qué |
|---|---|---|
| 1 — Maqueta física | Día 0 | Imprimir QRs; plastificar muestra ~20 (3 ventiladores + 3 monitores + ~12-14 bombas — las de mayor rotación); armar panel 14 camas + pool. Adhesivo reposicionable (doble faz de espuma / velcro) para mover tarjetas pool↔cama. |
| 2 — Carga dinámica | Días 1-14 | Seguir el cronograma (~40-60 escaneos/día). Registrar tasa de lectura y condiciones de luz. |
| 3 — Red y persistencia | Días 3, 7, 11 | Forzar cortes (modo avión a mitad de escaneo); verificar que no se pierden registros y exactitud de horas. |
| 4 — Stress y alertas | Días 12-13 | Desde `/prueba`: horas iniciales altas + stress → filmar alerta AMP. Fallas sintéticas → verificar MTBF. |

Entregables del plan: cronograma con IDs (imprimible / móvil) + planilla de registro de resultados que se vuelca en los bloques verdes del TFI.

**Especificación de etiquetas** (Anexo C del TFI): QRs plastificados (resistentes a limpieza con alcohol/desinfectante), muestra de ~20 plastificados para evaluar durabilidad/legibilidad; resto del parque impreso en papel sobre el panel; adhesivo reposicionable. Nivel de corrección de errores Q (25%); tamaño mínimo 25×25 mm.

---

## 10. Alcance explícito / fuera de alcance

**Dentro:** app completa (5+2 pantallas), 4 tablas, indicadores EN 15341, reporte de falla real, modo prueba (horas iniciales + stress + fallas sintéticas para MTBF), umbrales/% editables, generación/impresión de QR con selección individual y reimpresión + copias por equipo, despliegue gratuito; documento TFI con marcado en verde apoyado en fuentes reales; cronograma de ejecución con IDs + planilla.

**Fuera:** simulador de carga concurrente (descartado: la autora escanea el flujo completo a mano); seguimiento de desgaste por componente (se documenta la lista, no se rastrea por horas); autenticación compleja (PIN opcional por env var para el tablero); datos de pacientes (nunca se registran); validación clínica del mantenimiento basado en condición (excede el TFI, ya discutido en la literatura); MTBF como medición real (solo demostración de cálculo con datos sintéticos declarados).

---

## 11. Principios no negociables (recordatorio)

- Costo cero de operación; stack gratuito y de código abierto (MIT).
- Sin datos de pacientes en ninguna tabla ni log.
- Flag `origen` en todo dato sintético; regla de honestidad comentada en código y README, y declarada en el TFI.
- Solo se citan fuentes verificadas; lo no verificado se marca y se consulta, no se inventa.
