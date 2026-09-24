-- Migración 002: marca de corrección manual en ciclos de uso.
-- Ingeniería Clínica puede corregir un olvido de escaneo (activación, cierre o ciclo
-- completo con hora pasada). El ciclo queda identificado como corrección, con su motivo,
-- para distinguirlo en todo momento de un ciclo registrado por escaneo.

ALTER TABLE ciclos_uso
  ADD COLUMN IF NOT EXISTS correccion_manual BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS motivo_correccion TEXT;
