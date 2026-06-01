-- Migración: verificación de correo electrónico
-- Ejecutar este script en la base de datos existente

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS tokens_verificacion_email (
  id          SERIAL PRIMARY KEY,
  id_usuario  INT NOT NULL REFERENCES usuarios(id),
  token       VARCHAR(6) NOT NULL,
  expira_en   TIMESTAMP NOT NULL,
  usado       BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tokens_verificacion_usuario ON tokens_verificacion_email(id_usuario);
