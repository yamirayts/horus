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
