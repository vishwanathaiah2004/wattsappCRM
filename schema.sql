-- WhatsApp CRM SaaS — Multi-Tenant Schema
-- Run once: psql -U youruser -d whatsapp_crm_saas -f schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- TENANTS (one row per business client)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name     VARCHAR(255) NOT NULL,
  owner_name        VARCHAR(255),
  email             VARCHAR(255) UNIQUE NOT NULL,
  password_hash     VARCHAR(255) NOT NULL,
  business_type     VARCHAR(50) DEFAULT 'general',
  whatsapp_number   VARCHAR(30),
  twilio_sid        VARCHAR(50),
  gemini_prompt     TEXT,
  plan              VARCHAR(20) DEFAULT 'starter',
  is_active         BOOLEAN DEFAULT true,
  ai_reply_count    INTEGER DEFAULT 0,
  monthly_limit     INTEGER DEFAULT 500,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- SUPER ADMINS (platform owner logins)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS super_admins (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- LEADS (per tenant)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone          VARCHAR(20) NOT NULL,
  name           VARCHAR(255),
  message        TEXT,
  intent         VARCHAR(100),
  budget         VARCHAR(100),
  stage          VARCHAR(50) DEFAULT 'new',
  last_contacted TIMESTAMPTZ DEFAULT NOW(),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, phone)
);

-- ─────────────────────────────────────────────
-- CONVERSATIONS (per lead)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id    UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  direction  VARCHAR(10) NOT NULL CHECK (direction IN ('inbound','outbound')),
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- FOLLOW-UP LOGS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS followup_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id    UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  status     VARCHAR(20) DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_tenant      ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone       ON leads(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_leads_stage       ON leads(tenant_id, stage);
CREATE INDEX IF NOT EXISTS idx_leads_contacted   ON leads(last_contacted);
CREATE INDEX IF NOT EXISTS idx_convos_lead       ON conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_convos_tenant     ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_number    ON tenants(whatsapp_number);
