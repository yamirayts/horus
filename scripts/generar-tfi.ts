/**
 * Generador del Trabajo Final Integrador (Tarea 6).
 *
 * Arma `tfi/TFI_Rayts_Yamila.docx` con formato UNAJ: A4, Times New Roman 12,
 * interlineado 1,5, texto justificado, márgenes de 2,54 cm.
 *
 * Esta parte (Tarea 6.1) define los helpers de marcado y el esqueleto del
 * documento: carátula + índice placeholder. El contenido real (secciones
 * 1-9) se completa en las Tareas 6.2 y 6.3.
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
    spacing: { line: 360 }, // interlineado 1.5 (240 * 1.5)
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

// ---------------------------------------------------------------------------
// Secciones del índice (placeholder — se completan en 6.2/6.3)
// ---------------------------------------------------------------------------

const SECCIONES_INDICE = [
  "1. Resumen",
  "2. Introducción",
  "3. Objetivos",
  "4. Metodología",
  "5. Resultados",
  "6. Discusión",
  "7. Conclusiones",
  "8. Referencias",
  "9. Anexos",
];

const RUTA_SALIDA = path.join(__dirname, "..", "tfi", "TFI_Rayts_Yamila.docx");

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
          // Índice (placeholder — se completa en Tasks 6.2 y 6.3)
          // -------------------------------------------------------------
          titulo("Índice", 1),
          ...SECCIONES_INDICE.map((s) => izquierda(s)),

          saltoPagina(),

          // -------------------------------------------------------------
          // Contenido (placeholder)
          // -------------------------------------------------------------
          parrafo(verde("[contenido del TFI se completa en Tasks 6.2 y 6.3]")),
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
