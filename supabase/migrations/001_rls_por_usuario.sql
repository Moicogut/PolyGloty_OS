-- ============================================================================
-- MIGRACIÓN 001: RLS Estricto por Usuario (PASO HUMANO: Ejecutar en Supabase SQL Editor)
-- Proyecto: Polyglot Voice
-- Objetivo: Garantizar aislamiento total de datos multi-tenant por auth.uid()
-- ============================================================================

-- 1. Eliminar políticas abiertas o permisivas anteriores
DROP POLICY IF EXISTS "Public profiles access" ON public.profiles;
DROP POLICY IF EXISTS "Cards user access" ON public.cards;
DROP POLICY IF EXISTS "Competencies user access" ON public.competencies;
DROP POLICY IF EXISTS "Conversations user access" ON public.conversations;
DROP POLICY IF EXISTS "Vocab user access" ON public.session_vocab;

DROP POLICY IF EXISTS "Users can only read and write their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can only read and write their own cards" ON public.cards;
DROP POLICY IF EXISTS "Users can only read and write their own competencies" ON public.competencies;
DROP POLICY IF EXISTS "Users can only read and write their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can only read and write their own vocab" ON public.session_vocab;

-- 2. Asegurar que Row Level Security (RLS) esté activado en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_vocab ENABLE ROW LEVEL SECURITY;

-- 3. Revocar permisos de acceso a usuarios anónimos (anon)
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.cards FROM anon;
REVOKE ALL ON public.competencies FROM anon;
REVOKE ALL ON public.conversations FROM anon;
REVOKE ALL ON public.session_vocab FROM anon;

-- Otorgar permisos únicamente al rol autenticado (authenticated) y al backend de servicio (service_role)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competencies TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_vocab TO authenticated, service_role;

-- 4. Políticas por operación para usuarios autenticados:

-- PROFILES (usa id = auth.uid())
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid()::text);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid()::text);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);

CREATE POLICY "profiles_delete_own"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (id = auth.uid()::text);

-- CARDS (usa user_id = auth.uid())
CREATE POLICY "cards_select_own"
  ON public.cards FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "cards_insert_own"
  ON public.cards FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "cards_update_own"
  ON public.cards FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "cards_delete_own"
  ON public.cards FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);

-- COMPETENCIES (usa user_id = auth.uid())
CREATE POLICY "competencies_select_own"
  ON public.competencies FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "competencies_insert_own"
  ON public.competencies FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "competencies_update_own"
  ON public.competencies FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "competencies_delete_own"
  ON public.competencies FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);

-- CONVERSATIONS (usa user_id = auth.uid())
CREATE POLICY "conversations_select_own"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "conversations_insert_own"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "conversations_update_own"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "conversations_delete_own"
  ON public.conversations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);

-- SESSION_VOCAB (usa user_id = auth.uid())
CREATE POLICY "vocab_select_own"
  ON public.session_vocab FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "vocab_insert_own"
  ON public.session_vocab FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "vocab_update_own"
  ON public.session_vocab FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "vocab_delete_own"
  ON public.session_vocab FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);
