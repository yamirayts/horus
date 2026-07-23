/**
 * Generador del Trabajo Final Integrador (Tarea 6).
 *
 * Arma `tfi/TFI_Rayts_Yamila.docx` con formato UNAJ: A4, Times New Roman 12,
 * interlineado 1,5, texto justificado, márgenes de 2,54 cm.
 *
 * La Tarea 6.1 definió los helpers de marcado y el esqueleto del documento
 * (carátula + índice). La Tarea 6.2 vuelca el contenido definitivo en negro
 * de las nueve secciones del cuerpo (Resumen, Introducción, Objetivos,
 * Metodología, Resultados, Discusión, Conclusiones, Referencias y Anexos).
 * Los datos que dependen de la ejecución empírica de la prueba de concepto
 * quedan como placeholders neutros en negro; la Tarea 6.3 los reemplaza por
 * marcadores en verde con instrucciones concretas de qué completar.
 *
 * Convención de color:
 *   - negro(texto): dato definitivo, redactado y verificado.
 *   - verde(texto): dato PENDIENTE de completar tras ejecutar las pruebas
 *     (Fase 5). Se marca en verde y negrita para que salte a la vista al
 *     revisar el docx antes de la entrega. Nunca se usa para inventar datos:
 *     solo para señalar qué falta completar con resultados reales.
 *
 * Uso: npm run tfi
 */
import fs from "node:fs";
import path from "node:path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";

// ---------------------------------------------------------------------------
// Helpers de marcado
// ---------------------------------------------------------------------------

/** Color verde usado para marcar datos pendientes de completar. */
export const VERDE = "008000";

/** Fragmento de texto definitivo (negro). */
export const negro = (t: string) =>
  new TextRun({ text: t, font: "Times New Roman", size: 24 });

/**
 * Marcador de dato pendiente de completar tras las pruebas.
 * Sale en verde y negrita para que se vea claramente en el docx.
 * NUNCA se usa para inventar datos — solo para marcar qué falta.
 */
export const verde = (t: string) =>
  new TextRun({ text: t, color: VERDE, bold: true, font: "Times New Roman", size: 24 });

/** Párrafo con runs mixtos (negro/verde), justificado, interlineado 1,5. */
export function parrafo(...runs: TextRun[]): Paragraph {
  return new Paragraph({
    children: runs,
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 360, after: 120 }, // interlineado 1.5 (240 * 1.5)
  });
}

/** Título con nivel de heading (1 = título de sección, 2 y 3 = subtítulos). */
export function titulo(t: string, nivel: 1 | 2 | 3 = 1): Paragraph {
  const heading =
    nivel === 1 ? HeadingLevel.HEADING_1 : nivel === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
  return new Paragraph({
    children: [
      new TextRun({ text: t, bold: true, font: "Times New Roman", size: nivel === 1 ? 32 : 28 }),
    ],
    heading,
    spacing: { before: 240, after: 120 },
  });
}

/** Párrafo centrado simple, sin justificar (para carátula). */
function centrado(t: string, opts: { bold?: boolean; size?: number } = {}): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: t,
        bold: opts.bold ?? false,
        font: "Times New Roman",
        size: opts.size ?? 24,
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { line: 360, after: 120 },
  });
}

/** Párrafo simple alineado a la izquierda (para datos de carátula, índice). */
function izquierda(t: string, opts: { bold?: boolean } = {}): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: t, bold: opts.bold ?? false, font: "Times New Roman", size: 24 })],
    alignment: AlignmentType.LEFT,
    spacing: { line: 360, after: 60 },
  });
}

/** Párrafo vacío, útil para espaciar la carátula. */
function vacio(): Paragraph {
  return new Paragraph({ children: [] });
}

/** Salto de página. */
function saltoPagina(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

/** Ítem de lista con viñeta, alineado a la izquierda (no justificado). */
function item(t: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: `•\t${t}`, font: "Times New Roman", size: 24 })],
    alignment: AlignmentType.LEFT,
    spacing: { line: 360, after: 100 },
    indent: { left: 360, hanging: 360 },
  });
}

/** Referencia bibliográfica: sangría francesa, no justificada. */
function referencia(t: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: t, font: "Times New Roman", size: 24 })],
    alignment: AlignmentType.LEFT,
    spacing: { line: 360, after: 120 },
    indent: { left: 360, hanging: 360 },
  });
}

/** Celda de tabla con texto en Times New Roman 11, con margen interno. */
function celda(t: string, opts: { bold?: boolean; widthPct?: number } = {}): TableCell {
  return new TableCell({
    width: opts.widthPct !== undefined ? { size: opts.widthPct, type: WidthType.PERCENTAGE } : undefined,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [
      new Paragraph({
        children: [new TextRun({ text: t, font: "Times New Roman", size: 22, bold: opts.bold ?? false })],
        spacing: { line: 276 },
      }),
    ],
  });
}

/** Fila de tabla a partir de un arreglo de textos de celda. */
function fila(celdas: string[], opts: { header?: boolean; widths?: number[] } = {}): TableRow {
  return new TableRow({
    tableHeader: opts.header ?? false,
    children: celdas.map((c, i) => celda(c, { bold: opts.header ?? false, widthPct: opts.widths?.[i] })),
  });
}

/** Tabla simple de ancho completo, con fila de encabezado en negrita. */
function tabla(encabezados: string[], filas: string[][], widths?: number[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [fila(encabezados, { header: true, widths }), ...filas.map((f) => fila(f, { widths }))],
  });
}

// ---------------------------------------------------------------------------
// Secciones del índice
// ---------------------------------------------------------------------------

const SECCIONES_INDICE = [
  "1. Resumen",
  "2. Introducción",
  "3. Objetivos",
  "4. Metodología",
  "5. Resultados: diseño del sistema y prueba de concepto",
  "6. Discusión: análisis de viabilidad y validez",
  "7. Conclusiones",
  "8. Referencias bibliográficas",
  "9. Anexos",
];

const RUTA_SALIDA = path.join(__dirname, "..", "tfi", "TFI_Rayts_Yamila.docx");

// ---------------------------------------------------------------------------
// 1. Resumen
// ---------------------------------------------------------------------------

function seccionResumen(): Paragraph[] {
  return [
    titulo("1. Resumen", 1),
    parrafo(
      negro(
        "El presente trabajo aborda el diseño de un sistema de registro de uso de equipamiento crítico de Unidades de Cuidados Intensivos (UCI) para un hospital público de la Provincia de Buenos Aires, con el objetivo de habilitar estrategias de mantenimiento basadas en la condición real de uso, y desarrolla una prueba de concepto que valida la infraestructura de captura y procesamiento del dato en un entorno controlado. El equipamiento crítico de UCI —bombas de infusión, monitores multiparamétricos y ventiladores mecánicos— requiere un seguimiento riguroso que garantice su disponibilidad operativa. Sin embargo, la práctica habitual en los hospitales públicos provinciales se basa en el mantenimiento preventivo por calendario, sin considerar las horas reales de funcionamiento de cada equipo.",
      ),
    ),
    parrafo(
      negro(
        "El sistema propuesto calcula las horas de uso mediante el registro de activación y desactivación con códigos QR y un dispositivo institucional. Cuando el personal de enfermería asigna un equipo a un paciente, el sistema inicia el conteo; cuando lo desasigna, el conteo se detiene y las horas se acumulan automáticamente. Para los equipos que ya cuentan con horómetro incorporado, como los ventiladores, el sistema centraliza la información que hoy permanece dispersa en cada equipo.",
      ),
    ),
    parrafo(
      negro(
        "El trabajo incluye el diseño de la arquitectura funcional, el desarrollo de un prototipo funcional de bajo costo (repositorio abierto, despliegue en la nube y base de datos gratuita) y una prueba de concepto en entorno controlado orientada a validar la robustez técnica de la infraestructura de datos (captura por QR, tolerancia a cortes de red, persistencia, exactitud en la acumulación de horas y disparo de alertas). Se toma como escenario de referencia una UCI de 14 camas de un hospital público del municipio de La Matanza, con supuestos declarados de forma explícita. Complementariamente se analiza la viabilidad técnica, operativa y normativa.",
      ),
    ),
    parrafo(
      negro(
        "Resultados: [los resultados cuantitativos de la prueba de concepto —tasa de lectura correcta de QR, exactitud de la acumulación de horas, comportamiento ante microcortes de red, latencia de sincronización y disparo correcto de alertas— se incorporan a este resumen al finalizar la ejecución del protocolo descripto en la metodología].",
      ),
    ),
    parrafo(
      negro(
        "Palabras clave: mantenimiento basado en condición, equipamiento médico, UCI, código QR, ingeniería clínica, prueba de concepto, infraestructura de datos.",
      ),
    ),
    titulo("Abstract", 2),
    parrafo(
      negro(
        "El resumen en inglés (Abstract) se incorporará al finalizar la ejecución del protocolo, con los resultados cuantitativos de la prueba de concepto.",
      ),
    ),
  ];
}

// ---------------------------------------------------------------------------
// 2. Introducción
// ---------------------------------------------------------------------------

function seccionIntroduccion(): Paragraph[] {
  return [
    titulo("2. Introducción", 1),
    titulo("2.1. Contexto y planteamiento del problema", 2),
    parrafo(
      negro(
        "La gestión del equipamiento médico en las Unidades de Cuidados Intensivos representa uno de los desafíos más complejos para la Ingeniería Clínica en el sistema de salud público argentino. Los dispositivos de soporte vital —bombas de infusión, monitores multiparamétricos y ventiladores mecánicos— constituyen la columna vertebral de la atención crítica, y su disponibilidad operativa puede significar la diferencia entre la vida y la muerte de un paciente (Alshamasneh et al., 2021).",
      ),
    ),
    parrafo(
      negro(
        "La Organización Mundial de la Salud (OMS, 2012) establece que un programa efectivo de mantenimiento de equipos médicos debe basarse en información objetiva sobre el uso y el estado de los dispositivos. Sin embargo, la realidad en los hospitales públicos de la Provincia de Buenos Aires dista de este estándar: la práctica predominante consiste en realizar mantenimiento preventivo por intervalos fijos de calendario, sin considerar las horas reales de funcionamiento de cada equipo. En el ámbito provincial, la financiación del mantenimiento y la pequeña aparatología se apoya en gran medida en el Sistema de Atención Médica Organizada (SAMO), mecanismo de recupero de costos que refuerza la necesidad de asignar los recursos limitados de forma eficiente (Ministerio de Salud de la Provincia de Buenos Aires, s.f.).",
      ),
    ),
    parrafo(
      negro(
        "Esta situación genera dos ineficiencias documentadas. Por un lado, equipos con alto nivel de uso pueden no recibir mantenimiento oportuno porque el intervalo programado aún no se cumplió. Por otro lado, equipos con bajo uso reciben intervenciones innecesarias que consumen recursos limitados del servicio de Ingeniería Clínica (Iadanza et al., 2019). El resultado es una asignación subóptima de recursos y un riesgo incrementado de fallas no planificadas en equipamiento crítico.",
      ),
    ),
    parrafo(
      negro(
        "El problema se agrava por la ausencia de registros sistemáticos de uso. Las bombas de infusión y los monitores multiparamétricos, a diferencia de los ventiladores mecánicos, carecen de horómetro incorporado, lo que impide conocer su tiempo real de operación y planificar intervenciones basadas en su desgaste efectivo. Si bien los ventiladores cuentan con este registro, la información permanece aislada en cada equipo y debe relevarse manualmente, tarea que en la práctica no se realiza de forma sistemática.",
      ),
    ),
    titulo("2.2. Marco teórico", 2),
    parrafo(
      negro(
        "La norma UNE-EN 13306:2018 define el mantenimiento basado en condición como aquel que se realiza siguiendo una predicción obtenida del análisis de parámetros significativos de la degradación del elemento. A diferencia del mantenimiento predeterminado (por calendario), el mantenimiento basado en condición permite optimizar la utilización de recursos al intervenir únicamente cuando los indicadores de desgaste lo justifican. La norma EN 15341:2019 establece los indicadores clave de desempeño (KPIs) de la función de mantenimiento —disponibilidad, tasa de utilización, tiempo medio entre fallas y cumplimiento del programa preventivo—, que permiten evaluar objetivamente la efectividad de la estrategia adoptada.",
      ),
    ),
    parrafo(
      negro(
        "Es preciso señalar que la superioridad del mantenimiento basado en condición sobre el preventivo por calendario, si bien es un enfoque reconocido y respaldado por casos de aplicación (por ejemplo, estudios de costo-beneficio de mantenimiento basado en condición en dispositivos médicos que utilizan datos de campo y de uso para reducir intervenciones innecesarias), no está universalmente establecida para todos los tipos de equipamiento. Parte de la literatura sobre gestión de mantenimiento de dispositivos médicos no ha hallado diferencias determinantes entre distintas frecuencias y estrategias de mantenimiento para ciertas clases de equipos (Wang et al., 2013). En el caso particular de las bombas de infusión, revisiones sistemáticas sobre su precisión y confiabilidad en el tiempo (Pereira et al., 2023) muestran que el desempeño de estos equipos puede variar de forma relevante a lo largo de su vida útil, lo que refuerza la necesidad de contar con datos de uso reales que permitan contextualizar ese desempeño y sustentar decisiones de mantenimiento con evidencia, y no únicamente con el paso del calendario. Esta discusión, lejos de debilitar la propuesta, la refuerza: para poder evaluar y sustentar decisiones de mantenimiento basadas en evidencia se requiere, en primer lugar, disponer del dato de uso de forma accesible —brecha que este trabajo aborda—.",
      ),
    ),
    parrafo(
      negro(
        "Diversos estudios han demostrado la viabilidad de utilizar tecnologías de identificación automática para el seguimiento de equipamiento médico. Ma et al. (2021) reportaron que la implementación de códigos QR en equipamiento hospitalario redujo significativamente los tiempos y costos de gestión. Alshamasneh et al. (2021) propusieron un paradigma basado en Internet de las Cosas (IoT) para la gestión de equipamiento médico en UCIs, demostrando que el etiquetado electrónico y el seguimiento automatizado mejoran la transparencia y la eficiencia. Revisiones sistemáticas sobre la aplicación de RFID y códigos en hospitales señalan que la adopción real, aunque todavía se concentra mayormente en experiencias piloto, reporta beneficios consistentes en la gestión del equipamiento y la eficiencia operativa. La elección tecnológica del presente trabajo —códigos QR en lugar de RFID/RTLS— se fundamenta precisamente en el contexto de recursos limitados del hospital público provincial: el QR constituye la vía de captura de menor costo y mayor accesibilidad.",
      ),
    ),
    titulo("2.3. Justificación", 2),
    parrafo(
      negro(
        "La relevancia de este trabajo radica en la necesidad de modernizar las prácticas de gestión de mantenimiento en los hospitales públicos de la Provincia de Buenos Aires. El mantenimiento basado en condición, aunque adoptado en otros sectores industriales, tiene escasa penetración en el ámbito hospitalario argentino, principalmente por la falta de sistemas de registro de uso que provean los datos necesarios para su implementación. El aporte central de esta propuesta es, por lo tanto, la capa habilitadora del dato: un mecanismo simple para registrar las horas de uso y ponerlas a disposición de la gestión de forma centralizada.",
      ),
    ),
    parrafo(
      negro(
        "El beneficio principal del sistema es evitar que el equipamiento no se encuentre en condiciones operativas en momentos de urgencia. Adicionalmente, el sistema genera información valiosa para la gestión del parque tecnológico: estadísticas reales de demanda por tipo de equipo, patrones de rotación, identificación de unidades subutilizadas o sobreexigidas, y datos objetivos para justificar presupuestos y planificar adquisiciones.",
      ),
    ),
    parrafo(
      negro(
        "Es importante destacar que el sistema no involucra datos sensibles de pacientes: el registro se limita a información del equipo (identificación, timestamps de inicio y fin de uso, y ubicación), lo que elimina potenciales barreras normativas relacionadas con la protección de datos personales de salud.",
      ),
    ),
  ];
}

// ---------------------------------------------------------------------------
// 3. Objetivos
// ---------------------------------------------------------------------------

function seccionObjetivos(): Paragraph[] {
  return [
    titulo("3. Objetivos", 1),
    titulo("3.1. Objetivo general", 2),
    parrafo(
      negro(
        "Diseñar la arquitectura funcional de un sistema de registro de uso de equipamiento crítico de UCI —que permita obtener horas de funcionamiento en equipos sin horómetro incorporado y centralizar los datos de uso de los ventiladores mecánicos—, desarrollar un prototipo funcional de bajo costo y validar, mediante una prueba de concepto en entorno controlado, la robustez de su infraestructura de captura y procesamiento del dato, analizando además su viabilidad técnica, operativa y normativa para hospitales públicos de la Provincia de Buenos Aires, tomando como referencia una UCI de 14 camas del municipio de La Matanza.",
      ),
    ),
    titulo("3.2. Objetivos específicos", 2),
    item(
      "Identificar y caracterizar el equipamiento crítico de UCI objeto del sistema —bombas de infusión y monitores multiparamétricos (sin horómetro) y ventiladores mecánicos (con horómetro pero sin integración centralizada)— y los componentes sujetos a desgaste por funcionamiento, con base en normativa técnica y literatura especializada.",
    ),
    item(
      "Diseñar el flujo operativo del sistema de registro basado en códigos QR y dispositivo institucional, definiendo los momentos de activación y desactivación.",
    ),
    item("Definir los indicadores que el sistema debería calcular y diseñar el tablero de control para el Servicio de Ingeniería Clínica."),
    item(
      "Desarrollar un prototipo funcional del sistema con tecnologías de bajo costo y acceso abierto, que reproduzca el flujo completo de captura, almacenamiento y visualización del dato.",
    ),
    item(
      "Validar, mediante una prueba de concepto en entorno controlado, la robustez técnica de la infraestructura de datos: captura por QR, tolerancia a cortes de red, persistencia, exactitud en la acumulación de horas y disparo de alertas.",
    ),
    item(
      "Analizar la viabilidad técnica, operativa y normativa del sistema, y declarar de forma explícita el alcance y los límites de validez de la prueba respecto de un entorno hospitalario real.",
    ),
  ];
}

// ---------------------------------------------------------------------------
// 4. Metodología
// ---------------------------------------------------------------------------

function seccionMetodologia(): (Paragraph | Table)[] {
  return [
    titulo("4. Metodología", 1),
    titulo("4.1. Enfoque metodológico", 2),
    parrafo(
      negro(
        "El trabajo combina dos componentes complementarios. El diseño del sistema adopta un enfoque teórico-propositivo, fundamentado en normativa y literatura especializada. La validación adopta un enfoque empírico bajo la modalidad de prueba de concepto (proof of concept): se construye un prototipo funcional y se lo somete a un protocolo de pruebas en un entorno controlado, con el fin de validar la robustez de la infraestructura de captura, transporte, persistencia y procesamiento del dato de horas de uso. El diseño y la prueba se proyectan tomando como referencia las características de una UCI de 14 camas de un hospital público del municipio de La Matanza.",
      ),
    ),

    titulo("4.2. Definición del escenario de referencia", 2),
    parrafo(
      negro(
        "Para dimensionar el protocolo de pruebas se define un escenario de referencia basado en una UCI real de 14 camas del municipio de La Matanza. Los parámetros de carga del escenario (cantidad y tipo de equipos, frecuencia de asignación y desasignación por turno, cantidad de equipos activos en simultáneo y estructura de turnos) se establecen como supuestos explícitos del modelo, declarados como tales y no como valores normativos o estándares universales.",
      ),
    ),
    parrafo(
      negro(
        "La fuente principal para caracterizar la ocupación y la dinámica de camas ventiladas del escenario es el Informe SATI-Q UCI Adultos 2025, del programa de benchmarking de la Sociedad Argentina de Terapia Intensiva (Sociedad Argentina de Terapia Intensiva, 2025), que releva 21.317 episodios, 18.849 pacientes y 128.568 días-cama en unidades de terapia intensiva de adultos de todo el país durante el período 2025, incluyendo unidades de terapia intensiva de la Provincia de Buenos Aires. De este informe se toman dos datos: el porcentaje de días-cama con asistencia respiratoria mecánica invasiva (35,75%) y la estadía media en UTI (6,03 días, mediana 3 días), que permiten estimar, respectivamente, la cantidad de camas ventiladas en simultáneo y la frecuencia de rotación de pacientes del escenario.",
      ),
    ),
    parrafo(
      negro(
        "Como fuentes de apoyo para caracterizar la carga de bombas de infusión —dato que el informe SATI-Q no releva— se utilizan dos estudios internacionales sobre infusión intravenosa múltiple en cuidados críticos: el estudio observacional ECLIPSE (Blandford et al., 2020), realizado sobre 1.326 pacientes y 2.008 infusiones simultáneas en 16 hospitales del sistema de salud del Reino Unido, que documenta que la infusión múltiple simultánea es la práctica habitual en cuidados críticos; y el estudio de laboratorio de Health Quality Ontario (2014), que describe un escenario de paciente crítico complejo con hasta 11 infusiones continuas simultáneas, tomado como cota superior de referencia. Los parámetros que no pueden derivarse directamente de estas fuentes —el perfil de distribución de bombas por paciente, el tamaño total del parque de equipos y el porcentaje de ocupación de camas— se declaran como supuestos explícitos del modelo, fundamentados en las fuentes citadas y en la experiencia clínica de la autora.",
      ),
    ),
    tabla(
      ["Parámetro", "Valor adoptado", "Origen / fundamento"],
      [
        ["Camas de la UCI de referencia", "14", "Dato del escenario de referencia"],
        ["Ocupación", "Aproximadamente 85-90%", "Supuesto declarado"],
        ["Rotación de pacientes", "Aproximadamente 2,3 ingresos/egresos por día con ocupación plena", "Derivado de la estadía media SATI-Q (6,03 días)"],
        ["Camas con ventilación simultánea", "Aproximadamente 5 de las 14 camas", "SATI-Q 2025 (35,75% de días-cama con ARM invasiva)"],
        ["Duración media del ciclo de ventilador", "Aproximadamente 9 días", "SATI-Q 2025 (duración media de episodio ventilado: 9,20 días; mediana 5)"],
        ["Bombas de infusión por paciente", "Entre 1 y 8, con media aproximada de 3,5 a 4", "Supuesto declarado, apoyado en ECLIPSE (Blandford et al., 2020) y HQ Ontario (2014)"],
        ["Perfil de distribución de bombas por paciente", "Carga baja (1-2 bombas): 30%; carga media (3-5): 50%; carga alta (6-8): 20%", "Supuesto declarado"],
        ["Monitores multiparamétricos", "1 por cama ocupada; ciclo de uso equivalente a la estadía del paciente", "Supuesto declarado"],
        ["Tamaño del parque de equipos", "17 ventiladores (14 en uso + 3 de respaldo), 14 monitores, 70 bombas de infusión", "Dato del escenario de referencia"],
        ["Flujo diario de eventos resultante", "Aproximadamente 40 a 60 escaneos por día en el conjunto de la UCI", "Valor derivado de los parámetros anteriores"],
      ],
      [34, 30, 36],
    ),
    parrafo(
      negro(
        "Estos parámetros determinan el volumen y el ritmo de eventos que estructuran el cronograma de la prueba de concepto descripta en 4.4 (Fase 5).",
      ),
    ),

    titulo("4.3. Estrategia de validación y representatividad", 2),
    parrafo(
      negro(
        "La validación se organiza en dos planos, a fin de delimitar con precisión qué es lo que la prueba en entorno controlado puede sostener:",
      ),
    ),
    parrafo(
      negro(
        "Plano técnico. La robustez de la infraestructura de datos —captura por QR, tolerancia a microcortes de red, latencia de sincronización, exactitud en la acumulación de horas y disparo de alertas— constituye un conjunto de propiedades intrínsecas del sistema que no dependen del entorno de despliegue. Por ello, se validan directamente con el prototipo. Adicionalmente, el protocolo somete al sistema a condiciones más adversas que las esperables (cortes de red agresivos, tasas de error elevadas y sobreuso continuo), de modo que la validación se realiza sobre el peor caso.",
      ),
    ),
    parrafo(
      negro(
        "Plano organizacional. Los factores propios de la dinámica asistencial real —carga de trabajo, concurrencia de equipos a escala completa, rotación en cambios de turno y errores humanos por fatiga— no se pretenden validar empíricamente en el entorno controlado. Esta dimensión se sostiene de tres formas: (a) evidencia por precedente, a partir de literatura que documenta mecanismos de captura equivalentes en entornos de salud reales; (b) el escenario de referencia definido en 4.2, con sus supuestos declarados; y (c) una hoja de ruta explícita que enumera los factores no validables en esta etapa y el modo en que se resolverían en una implementación piloto real posterior (ver 6.4).",
      ),
    ),
    parrafo(
      negro(
        "Dentro del plano técnico, la exactitud en la acumulación de horas admite a su vez dos niveles de validación, de alcance y exigencia distintos, que se explicitan por separado a partir de una observación formulada durante la revisión del proyecto:",
      ),
    ),
    parrafo(
      negro(
        "Nivel 1 — Exactitud del cálculo (empírico, validado en esta etapa). Consiste en contrastar las horas que acumula el sistema contra el tiempo real transcurrido en cada ciclo de uso, tomando como referencia timestamps controlados por la propia ejecución del protocolo. Esta validación no requiere ningún patrón de medición externo: alcanza con conocer, para cada ciclo, el instante real de inicio y de fin del escaneo, y comparar la diferencia contra el valor calculado por el sistema. Es la validación que se ejecuta en la prueba de concepto (etapa 3, ver 4.4).",
      ),
    ),
    parrafo(
      negro(
        "Nivel 2 — Contraste con una medición independiente (teórico en esta etapa, requiere piloto real). Consiste en contrastar las horas acumuladas por el sistema contra una fuente de medición externa al propio sistema: el horómetro interno del ventilador mecánico. El ventilador cumple así un doble rol, como equipo registrado por el sistema y, simultáneamente, como patrón de contraste independiente. Este nivel de validación exige contar con el equipo físico y con su uso clínico real, condición que excede el alcance de un entorno controlado y doméstico como el de la prueba de concepto de este trabajo. Por ello, el mecanismo que lo hace operativo —el registro de lecturas de horómetro y el cálculo del desvío entre ambas fuentes, descripto en 5.4.1— se incorpora al diseño y al prototipo como propuesta metodológica lista para usarse, mientras que su ejecución empírica se difiere a una prueba piloto en un entorno hospitalario real (ver 6.4).",
      ),
    ),

    titulo("4.4. Fases del trabajo", 2),
    titulo("Fase 1 — Revisión bibliográfica y normativa", 3),
    parrafo(
      negro(
        "Revisión de literatura técnica y normativa sobre mantenimiento basado en condición (UNE-EN 13306:2018, EN 15341:2019, documentos de la OMS), sobre precedentes de sistemas de captura por QR/RFID en entornos de salud, y sobre el marco de gestión y normativo del sistema de salud público de la Provincia de Buenos Aires (SAMO, fiscalización sanitaria provincial, régimen de hospitales públicos de gestión descentralizada).",
      ),
    ),
    titulo("Fase 2 — Caracterización del escenario y definición de supuestos", 3),
    parrafo(
      negro(
        "Descripción del flujo de trabajo de enfermería respecto de la asignación y desasignación de equipos, identificación del momento óptimo de captura y definición del escenario de referencia con sus supuestos (4.2).",
      ),
    ),
    titulo("Fase 3 — Diseño del sistema", 3),
    parrafo(
      negro(
        "Diseño de la arquitectura funcional: identificación por QR, flujo de activación/desactivación, estructura de datos, indicadores y tablero de control.",
      ),
    ),
    titulo("Fase 4 — Desarrollo del prototipo funcional", 3),
    parrafo(
      negro(
        "Implementación de un prototipo funcional de bajo costo. La aplicación se desarrolla como aplicación web (accesible desde el navegador de cualquier smartphone), con el código alojado en un repositorio abierto, desplegada en una plataforma de hosting gratuita y respaldada por una base de datos en la nube sin costo. El prototipo reproduce el flujo completo: generación de QR, escaneo de activación/desactivación, acumulación de horas, cálculo de indicadores y visualización en el tablero.",
      ),
    ),
    titulo("Fase 5 — Prueba de concepto y validación en entorno controlado", 3),
    parrafo(negro("El prototipo se somete a un protocolo de pruebas de cuatro etapas:")),
    item(
      "Montaje de la maqueta física. Generación, impresión y colocación de etiquetas QR sobre un conjunto de objetos que operan como “gemelos” de los equipos médicos, en un entorno doméstico/controlado.",
    ),
    item(
      "Protocolo de carga dinámica. Durante un período acotado se aplica un protocolo de escaneo que simula ingresos, altas y rotación de equipos conforme al escenario de referencia, utilizando smartphones reales, para evaluar la usabilidad del QR bajo distintas condiciones de luz y la tasa de errores de lectura.",
    ),
    item(
      "Validación de infraestructura de red y persistencia. Se monitorea el impacto de los eventos en la base de datos en la nube, probando la tolerancia del sistema a microcortes de conectividad, la latencia de sincronización y la exactitud de la acumulación de horas (nivel 1 de la estrategia de validación, 4.3).",
    ),
    item(
      "Prueba de stress y disparo de alertas. Se fuerzan escenarios críticos de sobreuso para verificar que el tablero procesa el indicador y dispara correctamente la alerta de mantenimiento.",
    ),
    parrafo(
      negro(
        "Generación de datos de uso para la prueba. En condiciones reales, un equipo alcanza su umbral de mantenimiento tras miles de horas de funcionamiento, plazo incompatible con un protocolo acotado. Por ello, para observar el comportamiento del sistema se emplean mecanismos controlados de generación de datos, declarados explícitamente como tales: carga de un valor inicial de horas acumuladas (que representa el uso previo real del equipo al incorporarse al sistema), generación de ciclos de uso sintéticos con timestamps realistas, y/o un factor de aceleración temporal para la prueba de stress. Todo registro generado por estos mecanismos queda identificado con el valor `sintetico` en el campo `origen` correspondiente (ver 5.4.1), de modo que puede distinguirse en todo momento de un registro producido por un escaneo real. La afirmación que se valida no es un uso real prolongado, sino que el sistema calcula correctamente el indicador de horas acumuladas y activa la alerta al superar el umbral, con independencia de la vía por la que se poblaron las horas. Esta condición se refleja en la matriz de validez (6.2).",
      ),
    ),
    titulo("Fase 6 — Análisis de viabilidad y elaboración de conclusiones", 3),
    parrafo(
      negro(
        "Análisis de viabilidad técnica, operativa y normativa; construcción de la matriz de validez; y elaboración de conclusiones y recomendaciones para una eventual implementación.",
      ),
    ),

    titulo("4.5. Criterios de inclusión del equipamiento", 2),
    parrafo(
      negro(
        "Se incluyó en el diseño el equipamiento que cumple: (a) ser equipamiento crítico de UCI (soporte vital directo o monitoreo de funciones vitales); (b) carecer de horómetro incorporado o poseerlo sin centralización; y (c) ser equipamiento móvil (asignable a diferentes pacientes en el tiempo). El equipamiento resultante incluye bombas de infusión volumétricas, bombas de jeringa, monitores multiparamétricos portátiles y ventiladores mecánicos.",
      ),
    ),
    parrafo(
      negro(
        "Este criterio excluye deliberadamente del alcance de validación del presente trabajo a equipamiento itinerante de uso puntual, como ecógrafos, electrocardiógrafos y equipos de radiología portátil, aun cuando también constituyen equipamiento crítico del hospital. El fundamento de esta exclusión es doble. En primer lugar, el mecanismo de registro propuesto captura el inicio y el fin de cada ciclo de uso mediante el escaneo del código QR, por lo que la relación señal-ruido de la medición depende directamente de la duración del ciclo de uso frente al tiempo que insume el propio acto de escanear. En los equipos de cama —bombas de infusión, monitores y ventiladores—, cuyos ciclos se extienden por horas o días, el tiempo de escaneo resulta despreciable frente a la duración del ciclo, y el dato de horas resultante es confiable. En los equipos itinerantes, en cambio, el uso efectivo puede durar apenas unos minutos —el tiempo de un estudio o de una toma—, mientras que el escaneo de activación y desactivación insume un tiempo comparable al del propio uso, lo que introduce un margen de error relativo elevado y vuelve ruidosa la medición de horas. En segundo lugar, el desgaste de estos equipos no correlaciona con las horas de funcionamiento: un equipo de radiología se desgasta principalmente por la cantidad de disparos realizados, y un electrocardiógrafo por la cantidad de estudios efectuados, no por el tiempo que el equipo permanece encendido. En consecuencia, aun si se registrara con precisión el tiempo de uso de estos equipos, ese dato no resultaría un buen predictor de su desgaste ni un insumo útil para programar su mantenimiento.",
      ),
    ),
    parrafo(
      negro(
        "Cabe aclarar que esta acotación es un límite del alcance de validación del presente trabajo, no una limitación del software desarrollado. El sistema es genérico: el campo que identifica el tipo de equipo es de texto libre, por lo que cualquier institución puede dar de alta y monitorear cualquier tipo de equipo biomédico con un ciclo de uso identificable, sin modificar el código. Lo que este trabajo acota, por razones metodológicas vinculadas a la relación señal-ruido de la medición y a la correlación entre horas y desgaste, es el conjunto de equipos sobre el cual se sostienen las conclusiones de validez del sistema: los tres tipos de equipo de cama de alto uso horario mencionados.",
      ),
    ),
  ];
}

// ---------------------------------------------------------------------------
// 5. Resultados: diseño del sistema y prueba de concepto
// ---------------------------------------------------------------------------

function seccionResultados(): (Paragraph | Table)[] {
  return [
    titulo("5. Resultados: diseño del sistema y prueba de concepto", 1),

    titulo("5.1. Arquitectura funcional", 2),
    parrafo(
      negro(
        "El sistema se estructura en tres componentes principales: (1) identificación del equipamiento, (2) registro de uso, y (3) tablero de control para Ingeniería Clínica.",
      ),
    ),
    titulo("5.1.1. Identificación del equipamiento", 3),
    parrafo(
      negro(
        "Cada equipo se identifica mediante un código QR único adherido al dispositivo. El código contiene un identificador alfanumérico que permite reconocer unívocamente cada equipo. La información asociada incluye: número de inventario institucional, tipo de equipo, marca y modelo, fecha de adquisición y umbral de horas para mantenimiento preventivo. Se optó por códigos QR frente a otras tecnologías (RFID, NFC) por su menor costo, por no requerir hardware especializado de lectura, por poder leerse con dispositivos móviles estándar y por su resistencia a las condiciones de limpieza hospitalaria cuando se imprimen en materiales apropiados.",
      ),
    ),
    titulo("5.1.2. Registro de uso", 3),
    parrafo(
      negro(
        "El registro se basa en un flujo simple de activación y desactivación, a cargo del enfermero/a de turno, en el mismo momento en que realiza la asignación o desasignación del equipo como parte de su rutina habitual. No se agrega una tarea nueva: se instrumenta digitalmente una acción existente. El dispositivo de registro es un dispositivo institucional ubicado en el área de UCI.",
      ),
    ),
    parrafo(
      negro(
        "Activación. Al asignar un equipo a un paciente, el enfermero/a escanea el QR del equipo; el sistema registra el timestamp de inicio y vincula el equipo a la cama.",
      ),
    ),
    parrafo(
      negro(
        "Desactivación. Al retirar el equipo, se escanea nuevamente el QR; el sistema registra el timestamp de fin y calcula las horas de ese ciclo.",
      ),
    ),
    parrafo(
      negro(
        "Acumulación. Las horas se acumulan automáticamente en el registro del equipo; al alcanzar el umbral definido, el sistema genera una alerta de mantenimiento.",
      ),
    ),
    parrafo(negro("El sistema no registra datos del paciente: el vínculo con la cama es únicamente para ubicar el equipo.")),
    titulo("5.1.3. Estructura de datos", 3),
    parrafo(
      negro(
        "El sistema almacena, a nivel funcional, tres tipos de registros: Equipo (ID, tipo, marca, modelo, fecha de adquisición, umbral de horas, horas acumuladas, estado); Ciclo de uso (ID del ciclo, ID del equipo, timestamps de inicio y fin, horas del ciclo, ubicación); y Mantenimiento (ID, ID del equipo, fecha, tipo, descripción, horas al momento, técnico responsable). El modelo de datos efectivamente implementado en el prototipo, que amplía esta estructura funcional con las tablas de fallas y de lecturas de horómetro, se detalla en 5.4.1.",
      ),
    ),

    titulo("5.2. Indicadores del tablero de control", 2),
    parrafo(negro("El tablero para el Servicio de Ingeniería Clínica muestra los siguientes indicadores:")),
    tabla(
      ["Indicador", "Definición"],
      [
        [
          "Horas acumuladas por equipo (HAM)",
          "Tiempo total de funcionamiento desde la última intervención: HAM = Σ(t_finᵢ − t_inicioᵢ) para i = 1 a n sesiones desde el último mantenimiento.",
        ],
        [
          "Alerta de mantenimiento próximo (AMP)",
          "AMP = 1 si HAM ≥ (U_equipo × 0,80); AMP = 0 en caso contrario. U_equipo es el umbral de horas del tipo de equipo. AMP = 1 activa la alerta en el tablero.",
        ],
        [
          "Tasa de uso por equipo (TUE)",
          "TUE = (H_uso / H_disponibles) × 100. Identifica equipos sobreexigidos (TUE ≥ 85%) o subutilizados (TUE ≤ 30%).",
        ],
        ["Equipos disponibles", "Cantidad de equipos no asignados actualmente, por tipo."],
        ["Historial de uso", "Patrón de uso de cada equipo en el tiempo."],
        ["Proyección de mantenimiento", "Estimación de fecha del próximo mantenimiento según la tasa de uso promedio."],
        [
          "Tiempo medio entre fallas (MTBF)",
          "MTBF = tiempo total de operación del equipo / número de fallas registradas en el período. Se calcula a partir de los registros de falla asociados a cada equipo.",
        ],
      ],
      [34, 66],
    ),
    parrafo(
      negro(
        "El indicador de tiempo medio entre fallas requiere, para resultar significativo, un volumen de fallas registradas que el uso real acumulado durante el desarrollo de este trabajo no permite alcanzar. Por ello, en la prueba de concepto su cálculo se demuestra mediante fallas cargadas desde el modo de prueba del sistema, identificadas explícitamente con el valor `sintetico` en el campo `origen` (ver 5.4.1 y 4.4, Fase 5). Esta demostración acredita que el sistema calcula correctamente el indicador a partir de los registros de falla disponibles; no constituye, en esta etapa, una medición real de la confiabilidad del parque de equipos.",
      ),
    ),
    parrafo(negro("Estos indicadores se alinean con las recomendaciones de la norma EN 15341:2019.")),

    titulo("5.3. Umbrales de mantenimiento", 2),
    parrafo(
      negro(
        "Los umbrales de horas se determinan siguiendo una jerarquía de fuentes: en primer lugar, las recomendaciones del fabricante documentadas en el manual técnico; cuando el fabricante no documenta un umbral en horas —situación habitual en bombas y monitores de gama media—, se estima a partir del análisis de datos históricos de fallas del servicio de Ingeniería Clínica; y en ausencia de datos propios, se recurre a la literatura y a organismos de referencia (OMS, AAMI). A modo orientativo: bombas de infusión volumétricas (4.000–6.000 h), monitores multiparamétricos (8.000–10.000 h) y ventiladores mecánicos (5.000–8.000 h). Estos valores deben calibrarse según las condiciones de cada institución.",
      ),
    ),

    titulo("5.4. Arquitectura informática del prototipo", 2),
    parrafo(
      negro(
        "El prototipo se concibió como una aplicación web progresiva (PWA), de diseño mobile-first, construida íntegramente con tecnologías de bajo costo y acceso abierto, de modo que cualquier institución pueda replicarla sin licencias ni hardware especializado. El único dispositivo requerido para operar es un smartphone o tablet institucional con navegador y cámara. La arquitectura se organiza en tres capas: presentación, lógica/datos y despliegue.",
      ),
    ),
    tabla(
      ["Capa", "Tecnología", "Función"],
      [
        [
          "Presentación (cliente)",
          "Next.js (App Router) + TypeScript + Tailwind CSS",
          "Interfaz web accesible desde el navegador de cualquier smartphone. Pantallas de escaneo, lista de equipos, detalle y tablero de control.",
        ],
        [
          "Escaneo / generación de QR",
          "Librería de lectura de QR por cámara en el navegador (ZXing/html5-qrcode) y librería de generación de QR",
          "Lectura del código QR del equipo con la cámara del dispositivo; generación e impresión de las etiquetas QR de cada equipo.",
        ],
        [
          "Lógica de aplicación (servidor)",
          "API routes de Next.js",
          "Reglas de activación/desactivación, cálculo de horas de uso e indicadores, y validaciones.",
        ],
        [
          "Datos",
          "PostgreSQL en Neon (serverless, plan gratuito)",
          "Persistencia de equipos, ciclos de uso, mantenimientos, fallas y lecturas de horómetro.",
        ],
        [
          "Despliegue",
          "Repositorio abierto en GitHub (licencia MIT) + Vercel (plan gratuito)",
          "Código versionado y público; despliegue continuo con acceso por HTTPS.",
        ],
      ],
      [22, 34, 44],
    ),

    titulo("5.4.1. Modelo de datos", 3),
    parrafo(
      negro(
        "La base de datos se estructura en cinco tablas, con los datos mínimos necesarios para operar el sistema y para sostener la estrategia de validación descripta en 4.3.",
      ),
    ),
    parrafo(
      negro(
        "Equipos: identificador único (codificado en el QR), tipo de equipo (campo de texto libre, lo que hace al sistema genérico frente a cualquier tipo de equipamiento, según se explicita en 4.5), marca, modelo, fecha de alta, umbral de horas para mantenimiento preventivo, porcentajes de aviso y de vencido, horas acumuladas, horas iniciales (uso previo real cargado al momento del alta, registrado de forma separada de las horas generadas por ciclos), estado (disponible, en uso o en mantenimiento) y ubicación (cama o sector, nunca el paciente).",
      ),
    ),
    parrafo(
      negro(
        "Ciclos de uso: una fila por cada sesión de uso del equipo, con identificador del equipo, timestamp de inicio, timestamp de fin (nulo mientras el equipo permanece en uso), horas del ciclo (calculadas al cerrarlo) y ubicación. Incluye el campo origen, con los valores 'real' (ciclo generado por un escaneo efectivo del personal) o 'sintetico' (ciclo generado por el modo de prueba del sistema con fines de validación), lo que permite auditar en todo momento la procedencia de cada registro de horas.",
      ),
    ),
    parrafo(
      negro(
        "Mantenimientos: identificador del equipo, fecha, tipo (preventivo o correctivo), descripción, horas acumuladas al momento de la intervención y técnico responsable. El registro de un mantenimiento reinicia el contador de horas acumuladas del equipo.",
      ),
    ),
    parrafo(
      negro(
        "Fallas: identificador del equipo, fecha, tipo de falla, descripción y el mismo campo origen: 'real' para los reportes efectuados por el personal de enfermería desde la pantalla de escaneo, y 'sintetico' para las fallas cargadas desde el modo de prueba con el fin de demostrar el cálculo del indicador de tiempo medio entre fallas (5.2).",
      ),
    ),
    parrafo(
      negro(
        "Lecturas de horómetro: tabla destinada específicamente a instrumentar el nivel 2 de la estrategia de validación descripta en 4.3 —el contraste con una medición independiente—. Registra, para cada lectura, el identificador del equipo, la fecha, las horas indicadas por el horómetro interno del equipo (dato disponible en los ventiladores mecánicos) y las horas acumuladas por el sistema en ese mismo momento, lo que permite calcular y exhibir el desvío entre ambas fuentes en el detalle del equipo.",
      ),
    ),

    titulo("5.4.2. Flujo de datos", 3),
    parrafo(
      negro(
        "Al asignar un equipo, el personal de enfermería escanea el QR: la aplicación reconoce el equipo, abre un ciclo de uso con el timestamp de inicio y marca el equipo como “en uso”. Al retirarlo, un nuevo escaneo del mismo equipo cierra el ciclo, calcula las horas transcurridas, las suma a las horas acumuladas y vuelve a marcar el equipo como “disponible”. Un mismo escaneo funciona como conmutador (activa o desactiva según el estado). El registro de un mantenimiento reinicia las horas acumuladas. El tablero de control consulta estos datos y calcula los indicadores en tiempo real.",
      ),
    ),

    titulo("5.4.3. Requisitos no funcionales y justificación tecnológica", 3),
    item(
      "Costo cero de operación. El único dispositivo necesario es un celular con navegador; el repositorio, el hosting y la base de datos utilizan planes gratuitos.",
    ),
    item(
      "Elección de QR frente a RFID/RTLS. En el contexto de recursos limitados del hospital público provincial, el QR es la vía de captura de menor costo y mayor accesibilidad, al no requerir lectores ni etiquetas electrónicas especializadas.",
    ),
    item("Sin datos de pacientes. El sistema no almacena información personal de salud; solo registra datos del equipo."),
    item(
      "Tolerancia a cortes de red. El sistema contempla el reintento del envío ante fallas de conectividad, de modo de no perder registros; esta propiedad es objeto específico de la prueba de concepto.",
    ),
    item(
      "Replicabilidad. Al ser de código abierto y desplegable sobre servicios gratuitos, cualquier hospital puede clonar el repositorio, crear su propia base de datos y desplegar el sistema de forma autónoma.",
    ),

    titulo("5.4.4. Prototipo desarrollado", 3),
    parrafo(
      negro(
        "[la descripción del prototipo efectivamente construido, las URLs del repositorio y de la aplicación desplegada, y las capturas de pantalla de la vista de escaneo, el detalle de un equipo y el tablero de control se incorporan a este apartado al finalizar el desarrollo].",
      ),
    ),

    titulo("5.5. Resultados de la prueba de concepto", 2),
    parrafo(
      negro(
        "La prueba de concepto se ejecuta conforme al protocolo de cuatro etapas descripto en la metodología (4.4, Fase 5). Los resultados obtenidos para cada etapa, así como la tabla resumen correspondiente, se incorporan a este apartado al finalizar la ejecución del protocolo.",
      ),
    ),
  ];
}

// ---------------------------------------------------------------------------
// 6. Discusión: análisis de viabilidad y validez
// ---------------------------------------------------------------------------

function seccionDiscusion(): (Paragraph | Table)[] {
  return [
    titulo("6. Discusión: análisis de viabilidad y validez", 1),

    titulo("6.1. Análisis de viabilidad", 2),
    titulo("6.1.1. Viabilidad técnica", 3),
    parrafo(
      negro(
        "Los componentes tecnológicos necesarios son accesibles y de bajo costo: la generación e impresión de códigos QR puede realizarse con software gratuito e impresoras estándar; el dispositivo de lectura es un smartphone o tablet institucional; el software se desarrolla como aplicación web sobre plataformas de hosting y base de datos gratuitas; y la conectividad requerida (WiFi/datos móviles) está mayormente disponible.",
      ),
    ),
    parrafo(
      negro(
        "La prueba de concepto aportará evidencia empírica adicional sobre esta dimensión, a partir de los resultados que se obtengan en las etapas 2 y 3 del protocolo (ver 4.4 y 5.5).",
      ),
    ),
    titulo("6.1.2. Viabilidad operativa", 3),
    parrafo(
      negro(
        "El acto de escanear un código QR toma pocos segundos y coincide con acciones que el personal ya realiza (conectar/desconectar equipos), por lo que no agrega una tarea nueva sino que instrumenta digitalmente una acción existente. Un factor de riesgo es la dependencia del factor humano para el registro, mitigable mediante capacitación, recordatorios, indicadores de cumplimiento por turno y alertas visuales cuando un equipo en uso no tiene registro de activación.",
      ),
    ),
    titulo("6.1.3. Viabilidad normativa", 3),
    parrafo(
      negro(
        "El sistema no registra datos de pacientes: la información se limita a identificación del equipo, timestamps de uso y ubicación, ninguno de los cuales constituye información de salud personal protegida por la Ley 25.326. En el ámbito provincial, la habilitación de establecimientos y equipamiento se rige por la fiscalización sanitaria del Ministerio de Salud de la Provincia de Buenos Aires (Ministerio de Salud de la Provincia de Buenos Aires, s.f.), y el marco nacional de ANMAT regula el equipamiento médico; el sistema propuesto no interfiere con esas responsabilidades, sino que aporta información objetiva para mejorar el cumplimiento de los programas de mantenimiento. El uso de un dispositivo institucional (no personal) evita conflictos con las políticas que restringen el uso de celulares personales en áreas críticas.",
      ),
    ),

    titulo("6.2. Matriz de validez", 2),
    parrafo(
      negro(
        "La siguiente matriz explicita, para cada afirmación, el grado en que la prueba en entorno controlado la sostiene y la vía por la que se completaría su validación.",
      ),
    ),
    tabla(
      ["Afirmación / factor", "¿Validado en entorno controlado?", "Vía de validación / cierre de brecha"],
      [
        ["Captura correcta por QR", "Sí (directo)", "Prueba de concepto — etapa 2"],
        ["Tolerancia a microcortes de red y persistencia", "Sí (directo)", "Prueba de concepto — etapa 3"],
        ["Exactitud de la acumulación de horas (nivel 1)", "Sí (directo)", "Prueba de concepto — etapa 3"],
        ["Disparo correcto de alertas", "Sí (directo)", "Prueba de concepto — etapa 4"],
        [
          "Contraste con medición independiente (horómetro) (nivel 2)",
          "No validado en esta etapa",
          "Piloto real con el ventilador como patrón de contraste",
        ],
        ["Adopción real y comportamiento del personal de enfermería", "No", "Piloto real; literatura sobre adopción de tecnología en enfermería"],
        ["Patrones de error por fatiga a escala de turno", "No", "Piloto real con muestreo; literatura sobre error humano en UCI"],
        [
          "Concurrencia real de decenas de equipos en simultáneo",
          "Parcial (simulada según escenario de referencia)",
          "Modelado de carga + validación en piloto real",
        ],
        ["Factores institucionales / resistencia al cambio", "No", "Estrategia de sensibilización + evaluación en implementación real"],
      ],
      [34, 24, 42],
    ),

    titulo("6.3. Interpretación de los resultados", 2),
    parrafo(
      negro(
        "La interpretación de los resultados de la prueba de concepto a la luz de los objetivos planteados —el grado en que confirman la robustez de la infraestructura de datos y su relación con los antecedentes de la literatura citados en el marco teórico— se desarrolla en este apartado una vez finalizada la ejecución del protocolo descripto en 4.4.",
      ),
    ),

    titulo("6.4. Limitaciones y hoja de ruta", 2),
    parrafo(
      negro(
        "El trabajo valida empíricamente la capa técnica de captura y procesamiento del dato, no la efectividad clínica del mantenimiento basado en condición —que la literatura ya discute— ni la dinámica organizacional real de una UCI. La prueba se realiza en un entorno controlado con un escenario de referencia parametrizado mediante supuestos declarados; por lo tanto, la generalización a un entorno hospitalario real requiere las etapas de validación indicadas en la matriz (6.2). Como hoja de ruta hacia una implementación real se propone: (1) una prueba piloto en una UCI con acompañamiento de Ingeniería Clínica, que permita ejecutar el nivel 2 de la estrategia de validación (contraste con el horómetro del ventilador, 4.3); (2) un estudio de adopción y usabilidad con personal de enfermería; y (3) —si se buscara demostrar la utilidad del mantenimiento basado en condición— un control de calibración periódico contrastado con las horas de uso acumuladas, para analizar la correlación entre desvío de calibración y horas.",
      ),
    ),
    parrafo(
      negro(
        "En relación con el nivel 2 de la estrategia de validación descripta en 4.3 —el contraste con una medición independiente de las horas de uso—, se evaluó como alternativa instrumentar dicho contraste mediante un sensor de corriente conectado al equipo, bajo el supuesto de que el consumo eléctrico permitiría inferir el tiempo de funcionamiento efectivo. Esta alternativa se descartó: los ventiladores mecánicos y las bombas de infusión utilizados en UCI poseen baterías internas que se recargan de forma continua mientras el equipo permanece conectado a la red eléctrica, esté o no en uso sobre un paciente. En consecuencia, el consumo de corriente durante la carga de la batería se confundiría con el consumo asociado al uso real del equipo, lo que comprometería la validez de la medición como patrón de contraste. Por este motivo se optó por proponer el horómetro interno del ventilador —que registra directamente el tiempo de funcionamiento del equipo y no su consumo eléctrico— como fuente de contraste confiable, según se describe en 4.3 (nivel 2) y en el modelo de datos (5.4.1).",
      ),
    ),
  ];
}

// ---------------------------------------------------------------------------
// 7. Conclusiones
// ---------------------------------------------------------------------------

function seccionConclusiones(): Paragraph[] {
  return [
    titulo("7. Conclusiones", 1),
    parrafo(
      negro(
        "El trabajo desarrolló el diseño de un sistema de registro de uso de equipamiento crítico de UCI para mantenimiento basado en condición, construyó un prototipo funcional de bajo costo y lo sometió a una prueba de concepto en entorno controlado. A partir del desarrollo realizado se concluye:",
      ),
    ),
    item(
      "El sistema propuesto permite resolver la brecha de información sobre el uso real del equipamiento crítico de UCI: mediante el registro de activación y desactivación con códigos QR, es posible calcular horas de funcionamiento acumuladas para equipos sin horómetro y centralizar la información dispersa de aquellos que sí lo poseen.",
    ),
    item(
      "El diseño incluye indicadores alineados con la norma EN 15341:2019 que habilitan una gestión del mantenimiento basada en evidencia de uso: horas acumuladas, alertas de mantenimiento próximo, tasa de uso, disponibilidad, historial, proyección y tiempo medio entre fallas.",
    ),
    item("El prototipo demuestra que el sistema puede construirse con tecnología accesible, de bajo costo y de acceso abierto, sin infraestructura especializada."),
    item(
      "La conclusión sobre el grado de validación de la robustez técnica de la infraestructura de datos —captura, red y persistencia, exactitud de la acumulación de horas y disparo de alertas— se incorpora a este apartado una vez finalizada la prueba de concepto.",
    ),
    item(
      "El análisis de viabilidad indica que no existen barreras técnicas, operativas ni normativas insalvables para una eventual implementación; el factor crítico identificado es la adherencia del personal al registro, abordable mediante estrategias de sensibilización.",
    ),
    titulo("7.1. Recomendaciones", 2),
    item("Realizar una prueba piloto en una UCI real, con acompañamiento del Servicio de Ingeniería Clínica, antes de escalar."),
    item("Involucrar al personal de enfermería en el diseño de la interfaz de usuario."),
    item("Calibrar los umbrales de mantenimiento según las recomendaciones específicas de los fabricantes y los datos históricos de la institución."),
    item("Evaluar la integración con los sistemas de gestión de mantenimiento existentes."),
    item("Documentar los resultados de la implementación piloto para facilitar la replicación en otros hospitales."),
    titulo("7.2. Limitaciones del trabajo", 2),
    parrafo(
      negro(
        "La validación empírica se circunscribe a la infraestructura de datos en un entorno controlado; no comprende la validación clínica del mantenimiento basado en condición ni la dinámica organizacional de una UCI real. Los umbrales de mantenimiento y los costos son referenciales y deben ajustarse a cada institución.",
      ),
    ),
  ];
}

// ---------------------------------------------------------------------------
// 8. Referencias bibliográficas
// ---------------------------------------------------------------------------

function seccionReferencias(): Paragraph[] {
  return [
    titulo("8. Referencias bibliográficas", 1),
    referencia("Alshamasneh, W. A. M., Jaaffar, J., & Obiedat, A. M. (2021). IoT MEMS: IoT-Based Paradigm for Medical Equipment Management Systems of ICUs in Light of COVID-19 Outbreak. IEEE Access, 9, 147917-147929."),
    referencia("Asociación Española de Normalización. (2018). UNE-EN 13306:2018. Mantenimiento. Terminología del mantenimiento. AENOR."),
    referencia("Blandford, A., Furniss, D., Galal-Edeen, G. H., et al. (2020). Intravenous infusion practices across England and their impact on patient safety (ECLIPSE): a mixed-methods observational study. NIHR Journals Library, Health Services and Delivery Research, 8(7)."),
    referencia("European Committee for Standardization. (2019). EN 15341:2019. Maintenance — Maintenance Key Performance Indicators. CEN."),
    referencia("Health Quality Ontario. (2014). Multiple Intravenous Infusions Phase 2b: Laboratory Study."),
    referencia("Iadanza, E., Gonnelli, V., Satta, F., & Gherardelli, M. (2019). Evidence-based medical equipment management: a convenient implementation. Medical & Biological Engineering & Computing, 57(10), 2215-2230."),
    referencia("Ma, L., Wang, Y., Wang, L., & Wang, X. (2021). Practical Application of QR Code Electronic Manuals in Equipment Management and Training. Frontiers in Surgery, 8, 766006."),
    referencia("Ministerio de Salud de la Provincia de Buenos Aires. (s.f.). Dirección de Fiscalización Sanitaria: habilitación de establecimientos y equipamiento."),
    referencia("Ministerio de Salud de la Provincia de Buenos Aires. (s.f.). Sistema de Atención Médica Organizada (SAMO)."),
    referencia("Organización Mundial de la Salud. (2012). Introducción al programa de mantenimiento de equipos médicos. Serie de documentos técnicos de la OMS sobre dispositivos médicos. Ginebra: OMS."),
    referencia("Pereira, M. T., Silva, I. N. S., Lima, J. F. P., et al. (2023). Precision and reliability study of hospital infusion pumps: a systematic review. BioMedical Engineering OnLine, 22(1), 26."),
    referencia("Sociedad Argentina de Terapia Intensiva. (2025). Informe SATI-Q UCI Adultos 2025. Programa SATI-Q. Recuperado de https://archive.org/download/resultado-2025/info2025.pdf"),
    referencia("Wang, B., Rui, T., & Balar, S. (2013). An estimate of patient incidents caused by medical equipment maintenance omissions. Biomedical Instrumentation & Technology, 47(1), 84-91."),
  ];
}

// ---------------------------------------------------------------------------
// 9. Anexos
// ---------------------------------------------------------------------------

function seccionAnexos(): Paragraph[] {
  return [
    titulo("9. Anexos", 1),
    titulo("Anexo A — Componentes del tablero de control", 2),
    parrafo(
      negro(
        "El tablero para el Servicio de Ingeniería Clínica se divide en cuatro secciones: (1) panel de alertas (equipos que superaron el 80% del umbral); (2) resumen de estado (total de equipos, en uso, disponibles, en mantenimiento); (3) lista de equipos (tabla filtrable con ID, tipo, ubicación, horas acumuladas, porcentaje del umbral y estado); y (4) gráficos de tendencia (evolución del uso por tipo de equipo y proyección de mantenimientos).",
      ),
    ),
    titulo("Anexo B — Flujo operativo de registro", 2),
    parrafo(
      negro(
        "(1) Enfermería asigna equipo a paciente → (2) escanea QR con dispositivo institucional → (3) el sistema registra el timestamp de inicio y vincula a la cama → (4) equipo en uso con conteo activo → (5) enfermería retira el equipo → (6) escanea el QR nuevamente → (7) el sistema registra el timestamp de fin, calcula las horas del ciclo y las acumula al total.",
      ),
    ),
    titulo("Anexo C — Especificaciones de los códigos QR", 2),
    item("Tamaño mínimo: 25 × 25 mm (lectura a 15–20 cm)."),
    item("Material: poliéster o vinilo resistente a la limpieza con alcohol y desinfectantes."),
    item("Adhesivo permanente, resistente a temperaturas de 0 °C a 50 °C."),
    item("Nivel de corrección de errores: Q (25%)."),
    item("Contenido: URL corta que apunta al registro del equipo en el sistema."),
    item("Ubicación: zona visible, no sujeta a fricción frecuente, cerca del panel de control."),
    titulo("Anexo D — Protocolo detallado de la prueba de concepto", 2),
    parrafo(
      negro(
        "El protocolo detallado efectivamente ejecutado —listado de “gemelos” y sus QR, cronograma del protocolo de carga, planilla de registro de escaneos, escenarios de corte de red y de stress, y planilla de resultados por etapa— se incorpora a este anexo al finalizar la prueba de concepto.",
      ),
    ),
  ];
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              // A4 en twips (1 cm = 566.9 twips aprox.): 21 cm x 29,7 cm.
              width: 11906,
              height: 16838,
            },
            margin: {
              // 2,54 cm ≈ 1440 twips (márgenes estándar UNAJ).
              top: 1440,
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children: [
          // -------------------------------------------------------------
          // Carátula
          // -------------------------------------------------------------
          vacio(),
          vacio(),
          centrado("ESPECIALIZACIÓN EN INGENIERÍA CLÍNICA", { bold: true }),
          centrado("TRABAJO FINAL INTEGRADOR", { bold: true }),
          vacio(),
          vacio(),
          centrado(
            "Sistema de registro de uso de equipamiento crítico de UCI para gestión centralizada y mantenimiento basado en condición",
            { bold: true, size: 28 },
          ),
          vacio(),
          vacio(),
          vacio(),
          vacio(),
          izquierda("Estudiante: Yamila Belén Rayts"),
          izquierda("DNI: 36873926"),
          izquierda("Número de cohorte: N°1 (2024)"),
          izquierda("Correo electrónico: yamilarayts@gmail.com"),
          izquierda("Director/a: Bioing. Ramiro Barreiro"),
          izquierda("Fecha: [Julio 2026]"),

          saltoPagina(),

          // -------------------------------------------------------------
          // Índice
          // -------------------------------------------------------------
          titulo("Índice", 1),
          ...SECCIONES_INDICE.map((s) => izquierda(s)),

          saltoPagina(),

          // -------------------------------------------------------------
          // Cuerpo del documento (Tarea 6.2: contenido definitivo en negro)
          // -------------------------------------------------------------
          ...seccionResumen(),
          saltoPagina(),
          ...seccionIntroduccion(),
          saltoPagina(),
          ...seccionObjetivos(),
          saltoPagina(),
          ...seccionMetodologia(),
          saltoPagina(),
          ...seccionResultados(),
          saltoPagina(),
          ...seccionDiscusion(),
          saltoPagina(),
          ...seccionConclusiones(),
          saltoPagina(),
          ...seccionReferencias(),
          saltoPagina(),
          ...seccionAnexos(),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.mkdirSync(path.dirname(RUTA_SALIDA), { recursive: true });
  fs.writeFileSync(RUTA_SALIDA, buffer);
  console.log(`TFI generado: ${path.relative(process.cwd(), RUTA_SALIDA)}`);
}

main();
