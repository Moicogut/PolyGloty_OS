-- ============================================================================
-- MIGRACIÓN 006: Sincronización Automática de auth.users con public.profiles y public.user_usage
-- Proyecto: Polyglot Voice SaaS
-- Objetivo: Garantizar persistencia y cuota en tiempo real para todos los usuarios registrados
-- Idempotente: Se puede ejecutar múltiples veces sin error.
-- ============================================================================

-- 0. Asegurar compatibilidad en public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 1. Trigger para sincronizar auth.users con public.profiles y user_usage
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Insertar o actualizar perfil público
  INSERT INTO public.profiles (id, email, full_name, created_at)
  VALUES (NEW.id::text, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NOW())
  ON CONFLICT (id) DO NOTHING;

  -- 2. Asegurar registro inicial en user_usage para el día actual
  INSERT INTO public.user_usage (user_id, usage_date, seconds_used, turns_count, updated_at)
  VALUES (NEW.id::text, CURRENT_DATE, 0, 0, NOW())
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Asociar trigger al evento de auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Políticas RLS permisivas y seguras para user_usage
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_usage_select_own" ON public.user_usage;
DROP POLICY IF EXISTS "user_usage_insert_own" ON public.user_usage;
DROP POLICY IF EXISTS "user_usage_update_own" ON public.user_usage;
DROP POLICY IF EXISTS "user_usage_delete_own" ON public.user_usage;

CREATE POLICY "user_usage_select_own" ON public.user_usage
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "user_usage_insert_own" ON public.user_usage
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "user_usage_update_own" ON public.user_usage
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_usage TO authenticated, service_role;

-- 4. Asegurar políticas RLS en public.profiles para inserción y actualización por usuario propio y service_role
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid()::text);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid()::text);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated, service_role;

-- 5. Sincronización retroactiva para usuarios preexistentes en auth.users
INSERT INTO public.profiles (id, email, full_name, created_at)
SELECT id::text, email, COALESCE(raw_user_meta_data->>'full_name', email), created_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_usage (user_id, usage_date, seconds_used, turns_count, updated_at)
SELECT id::text, CURRENT_DATE, 0, 0, NOW()
FROM auth.users
ON CONFLICT (user_id, usage_date) DO NOTHING;

-- ============================================================================
-- VERIFICACIÓN INMEDIATA (PASO HUMANO EN SUPABASE SQL EDITOR):
-- ============================================================================
-- SELECT count(*) AS total_profiles FROM public.profiles;
-- SELECT count(*) AS total_user_usage FROM public.user_usage;
-- SELECT * FROM public.user_usage LIMIT 10;
