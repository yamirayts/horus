-- Migración 003: umbral de ciclo atípicamente largo, editable por equipo.
-- NULL = usar el valor por defecto de su tipo (ver lib/cicloLargo.ts: 14 días para bombas y
-- monitores, 21 días para ventiladores, derivados del Informe SATI-Q UCI Adultos 2025).

ALTER TABLE equipos
  ADD COLUMN IF NOT EXISTS umbral_ciclo_largo_dias NUMERIC(5,1);
