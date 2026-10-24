-- ============================================================================
-- MIGRACIÓN 004: Tablas de Créditos Curriculares, Pruebas de Suficiencia y Retos
-- Proyecto: Polyglot Voice
-- Objetivo: Almacenamiento auditado y multi-tenant con RLS estricto
-- Idempotente: Se puede ejecutar múltiples veces sin error.
-- ============================================================================

-- 1. Tabla de Créditos y Progreso Curricular por Usuario
CREATE TABLE IF NOT EXISTS public.user_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lang VARCHAR(8) NOT NULL DEFAULT 'en',
  level VARCHAR(8) NOT NULL, -- 'A1', 'A2', 'B1', etc.
  module_id VARCHAR(64) NOT NULL,
  lesson_id VARCHAR(64) NOT NULL,
  credits_earned INTEGER NOT NULL DEFAULT 2,
  score INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_lesson UNIQUE (user_id, lang, level, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_user_credits_user_level ON public.user_credits(user_id, lang, level);

-- Habilitar RLS en user_credits
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_credits_select_own" ON public.user_credits;
DROP POLICY IF EXISTS "user_credits_insert_own" ON public.user_credits;
DROP POLICY IF EXISTS "user_credits_update_own" ON public.user_credits;
DROP POLICY IF EXISTS "user_credits_delete_own" ON public.user_credits;

REVOKE ALL ON public.user_credits FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_credits TO authenticated, service_role;

CREATE POLICY "user_credits_select_own"
  ON public.user_credits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "user_credits_insert_own"
  ON public.user_credits FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "user_credits_update_own"
  ON public.user_credits FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "user_credits_delete_own"
  ON public.user_credits FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);


-- 2. Tabla Inmutable de Auditoría de Pruebas de Suficiencia y Certificados
CREATE TABLE IF NOT EXISTS public.proficiency_audits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lang VARCHAR(8) NOT NULL DEFAULT 'en',
  test_type VARCHAR(32) NOT NULL, -- 'placement' | 'certification_exit'
  target_level VARCHAR(8) NOT NULL,
  assigned_level VARCHAR(8) NOT NULL,
  overall_score NUMERIC(5,2) NOT NULL,
  grammar_score NUMERIC(5,2) NOT NULL,
  vocabulary_score NUMERIC(5,2) NOT NULL,
  fluency_score NUMERIC(5,2) NOT NULL,
  written_score NUMERIC(5,2) NOT NULL,
  audio_transcripts JSONB NOT NULL DEFAULT '[]'::jsonb,
  written_submission TEXT,
  examiner_notes TEXT,
  certificate_code VARCHAR(32) UNIQUE,
  passed BOOLEAN NOT NULL DEFAULT false,
  verification_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proficiency_audits_user ON public.proficiency_audits(user_id, lang);
CREATE INDEX IF NOT EXISTS idx_proficiency_audits_cert ON public.proficiency_audits(certificate_code);

-- Habilitar RLS en proficiency_audits
ALTER TABLE public.proficiency_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proficiency_audits_select_own" ON public.proficiency_audits;
DROP POLICY IF EXISTS "proficiency_audits_insert_own" ON public.proficiency_audits;
DROP POLICY IF EXISTS "proficiency_audits_verify_public" ON public.proficiency_audits;

REVOKE ALL ON public.proficiency_audits FROM anon;
-- Permitir verificación pública solo por certificate_code
GRANT SELECT ON public.proficiency_audits TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proficiency_audits TO authenticated, service_role;

CREATE POLICY "proficiency_audits_select_own"
  ON public.proficiency_audits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "proficiency_audits_insert_own"
  ON public.proficiency_audits FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "proficiency_audits_verify_public"
  ON public.proficiency_audits FOR SELECT
  TO anon
  USING (certificate_code IS NOT NULL);


-- 3. Tabla de Retos Dinámicos
CREATE TABLE IF NOT EXISTS public.user_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_type VARCHAR(16) NOT NULL, -- 'daily', 'weekly'
  title TEXT NOT NULL,
  target_count INTEGER NOT NULL,
  current_count INTEGER NOT NULL DEFAULT 0,
  xp_reward INTEGER NOT NULL DEFAULT 25,
  completed BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_challenges_user ON public.user_challenges(user_id, expires_at);

ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_challenges_select_own" ON public.user_challenges;
DROP POLICY IF EXISTS "user_challenges_insert_own" ON public.user_challenges;
DROP POLICY IF EXISTS "user_challenges_update_own" ON public.user_challenges;

REVOKE ALL ON public.user_challenges FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_challenges TO authenticated, service_role;

CREATE POLICY "user_challenges_select_own"
  ON public.user_challenges FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "user_challenges_insert_own"
  ON public.user_challenges FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "user_challenges_update_own"
  ON public.user_challenges FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);
