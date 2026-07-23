-- Migración 001: agrega número de serie y baja lógica a la tabla equipos.
-- Aplicable a instalaciones creadas con el schema anterior.

ALTER TABLE equipos
  ADD COLUMN IF NOT EXISTS numero_serie TEXT,
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS fecha_baja TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_baja TEXT;
