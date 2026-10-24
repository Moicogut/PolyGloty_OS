-- ============================================================================
-- MIGRACIÓN 006: Sincronización Automática de auth.users con public.profiles y public.user_usage
-- Solución Definitiva: Resolución de conflicto profiles_email_key y soporte para IDs preexistentes
-- Idempotente: Se puede ejecutar múltiples veces sin error.
-- ============================================================================

-- 0. Asegurar compatibilidad de columnas en public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 1. Habilitar ON UPDATE CASCADE en claves foráneas para permitir unificación de IDs
ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_user_id_fkey;
ALTER TABLE public.cards ADD CONSTRAINT cards_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.competencies DROP CONSTRAINT IF EXISTS competencies_user_id_fkey;
ALTER TABLE public.competencies ADD CONSTRAINT competencies_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.session_vocab DROP CONSTRAINT IF EXISTS session_vocab_user_id_fkey;
ALTER TABLE public.session_vocab ADD CONSTRAINT session_vocab_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.user_usage DROP CONSTRAINT IF EXISTS user_usage_user_id_fkey;
ALTER TABLE public.user_usage ADD CONSTRAINT user_usage_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Resolver perfiles existentes cuyo id no coincide con auth.users.id (evita error 23505 profiles_email_key)
UPDATE public.profiles p
SET id = u.id::text,
    full_name = COALESCE(u.raw_user_meta_data->>'full_name', p.full_name, u.email),
    updated_at = NOW()
FROM auth.users u
WHERE lower(p.email) = lower(u.email)
  AND p.id <> u.id::text;

-- 3. Trigger para sincronizar auth.users con public.profiles y user_usage
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  target_id TEXT := NEW.id::text;
BEGIN
  -- Si ya existe un perfil con el mismo email, unificar su ID con auth.users y actualizar datos
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(email) = lower(NEW.email)) THEN
    UPDATE public.profiles
    SET id = target_id,
        full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name, NEW.email),
        updated_at = NOW()
    WHERE lower(email) = lower(NEW.email);
  ELSE
    -- Si no existe, insertar nuevo perfil
    INSERT INTO public.profiles (id, email, full_name, created_at)
    VALUES (target_id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NOW())
    ON CONFLICT (id) DO UPDATE
      SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  END IF;

  -- Asegurar registro inicial en user_usage para la fecha actual
  INSERT INTO public.user_usage (user_id, usage_date, seconds_used, turns_count, updated_at)
  VALUES (target_id, CURRENT_DATE, 0, 0, NOW())
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Asociar trigger al evento de auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Políticas RLS permisivas y seguras para user_usage
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

-- 6. Políticas RLS en public.profiles
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

-- 7. Sincronización retroactiva segura (filtra usuarios existentes para evitar colisión de email)
INSERT INTO public.profiles (id, email, full_name, created_at)
SELECT u.id::text, u.email, COALESCE(u.raw_user_meta_data->>'full_name', u.email), u.created_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE lower(p.email) = lower(u.email) OR p.id = u.id::text
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_usage (user_id, usage_date, seconds_used, turns_count, updated_at)
SELECT p.id, CURRENT_DATE, 0, 0, NOW()
FROM public.profiles p
ON CONFLICT (user_id, usage_date) DO NOTHING;

-- ============================================================================
-- VERIFICACIÓN INMEDIATA (PASO HUMANO EN SUPABASE SQL EDITOR):
-- ============================================================================
-- SELECT count(*) AS total_profiles FROM public.profiles;
-- SELECT count(*) AS total_user_usage FROM public.user_usage;
-- SELECT * FROM public.user_usage LIMIT 10;
