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
