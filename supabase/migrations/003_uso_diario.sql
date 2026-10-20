-- ============================================================================
-- MIGRACIÓN 003: Tabla de Uso Diario por Usuario (PASO HUMANO: Ejecutar en Supabase SQL Editor)
-- Proyecto: Polyglot Voice
-- Objetivo: Persistir el consumo diario (segundos y turnos) por usuario con RLS
-- Idempotente: Se puede ejecutar múltiples veces sin error.
-- ============================================================================

-- 1. Crear tabla de uso diario si no existe
CREATE TABLE IF NOT EXISTS public.user_usage (
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  seconds_used INTEGER NOT NULL DEFAULT 0,
  turns_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_user_usage_date ON public.user_usage(user_id, usage_date);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;

-- 3. Limpiar políticas previas para idempotencia
DROP POLICY IF EXISTS "user_usage_select_own" ON public.user_usage;
DROP POLICY IF EXISTS "user_usage_insert_own" ON public.user_usage;
DROP POLICY IF EXISTS "user_usage_update_own" ON public.user_usage;
DROP POLICY IF EXISTS "user_usage_delete_own" ON public.user_usage;

-- 4. Revocar accesos anónimos
REVOKE ALL ON public.user_usage FROM anon;

-- Otorgar permisos únicamente a authenticated y service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_usage TO authenticated, service_role;

-- 5. Políticas estrictas por usuario (auth.uid() = user_id)
CREATE POLICY "user_usage_select_own"
  ON public.user_usage FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "user_usage_insert_own"
  ON public.user_usage FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "user_usage_update_own"
  ON public.user_usage FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "user_usage_delete_own"
  ON public.user_usage FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);

-- ============================================================================
-- CONSULTAS DE CONTROL (PASO HUMANO)
-- ============================================================================
-- 1. Verificar RLS en user_usage:
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'user_usage';
-- 2. Verificar políticas creadas:
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'user_usage';
