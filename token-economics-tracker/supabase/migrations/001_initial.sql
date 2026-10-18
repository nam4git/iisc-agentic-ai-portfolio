-- Nanotokens — initial database schema
-- Run this in your Supabase SQL editor after creating a new project.

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  display_name TEXT,
  tier         TEXT NOT NULL DEFAULT 'observer'
                CHECK (tier IN ('observer', 'analyst', 'enterprise')),
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE platforms (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slug       TEXT NOT NULL,
  label      TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#64748b',
  is_custom  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE models (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id    UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  catalogue_id   TEXT,                 -- maps to pricing-catalogue.ts model id
  name           TEXT NOT NULL,
  input_usd_m    NUMERIC(12,6) NOT NULL,
  output_usd_m   NUMERIC(12,6) NOT NULL,
  cache_create_m NUMERIC(12,6) NOT NULL DEFAULT 0,
  cache_read_m   NUMERIC(12,6) NOT NULL DEFAULT 0,
  is_default     BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE usage_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  model_id      UUID REFERENCES models(id) ON DELETE SET NULL,
  logged_at     TIMESTAMPTZ DEFAULT now(),
  session_label TEXT,
  input_tokens  BIGINT NOT NULL DEFAULT 0,
  output_tokens BIGINT NOT NULL DEFAULT 0,
  cache_create  BIGINT NOT NULL DEFAULT 0,
  cache_read    BIGINT NOT NULL DEFAULT 0,
  turns         INT NOT NULL DEFAULT 1,
  successful    BOOLEAN NOT NULL DEFAULT true,
  billed_usd    NUMERIC(14,8) NOT NULL DEFAULT 0,
  notes         TEXT
);

CREATE INDEX idx_usage_logs_user_logged ON usage_logs(user_id, logged_at DESC);
CREATE INDEX idx_models_platform         ON models(platform_id);
CREATE INDEX idx_platforms_user          ON platforms(user_id);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms  ENABLE ROW LEVEL SECURITY;
ALTER TABLE models     ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: each user sees only their own row
CREATE POLICY "profiles: own row"  ON profiles
  FOR ALL USING (auth.uid() = id);

-- Platforms: own rows only
CREATE POLICY "platforms: own rows" ON platforms
  FOR ALL USING (auth.uid() = user_id);

-- Models: reachable through a platform the user owns
CREATE POLICY "models: via own platform" ON models
  FOR ALL USING (
    platform_id IN (
      SELECT id FROM platforms WHERE user_id = auth.uid()
    )
  );

-- Usage logs: own rows only
CREATE POLICY "usage_logs: own rows" ON usage_logs
  FOR ALL USING (auth.uid() = user_id);
