-- Migración: agregar campos SMTP por empresa
ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS smtp_host        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS smtp_port        INTEGER DEFAULT 587,
  ADD COLUMN IF NOT EXISTS smtp_user        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS smtp_password_enc TEXT,
  ADD COLUMN IF NOT EXISTS smtp_from_name   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS smtp_secure      BOOLEAN DEFAULT FALSE;
