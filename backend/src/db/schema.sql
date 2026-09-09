-- Portal TegraPharma — MySQL 8
-- Payload criptografado (AES-256-GCM). Índices operacionais em colunas explícitas.
-- PII (nome, e-mail, telefone, endereço, CRM, histórico) não fica em claro.

CREATE TABLE IF NOT EXISTS schema_migrations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(128) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_schema_migrations_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leads (
  id VARCHAR(64) NOT NULL,
  payload JSON NOT NULL,
  id_zoho VARCHAR(128) NULL,
  protocolo VARCHAR(32) NULL,
  consultor_id VARCHAR(128) NULL,
  sla_status VARCHAR(64) NULL,
  sla_deadline VARCHAR(64) NULL,
  uf_crm VARCHAR(16) NULL,
  entrada_em VARCHAR(64) NULL,
  registro_hmac CHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_leads_id_zoho (id_zoho),
  UNIQUE KEY uq_leads_protocolo (protocolo),
  KEY idx_leads_consultor (consultor_id, entrada_em),
  KEY idx_leads_sla (sla_status, sla_deadline),
  KEY idx_leads_registro_hmac (registro_hmac, uf_crm)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS consultores (
  id VARCHAR(64) NOT NULL,
  payload JSON NOT NULL,
  email_hmac CHAR(64) NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 0,
  regiao VARCHAR(64) NULL,
  gerencia VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_consultores_email_hmac (email_hmac),
  KEY idx_consultores_regiao_ativo (regiao, ativo),
  KEY idx_consultores_gerencia (gerencia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS central_kv (
  pk VARCHAR(64) NOT NULL,
  sk VARCHAR(128) NOT NULL,
  payload JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (pk, sk)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
