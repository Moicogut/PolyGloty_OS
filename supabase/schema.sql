-- Polyglot Voice: Supabase Schema SQL
-- Ejecuta este script en el SQL Editor de tu proyecto en Supabase (https://app.supabase.com)

-- 1. Tabla de Perfiles de Usuario
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak INTEGER DEFAULT 0,
  last_day TEXT,
  badges TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Tarjetas de Repaso Espaciado (SRS)
CREATE TABLE IF NOT EXISTS public.cards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  pinyin TEXT,
  lang TEXT NOT NULL DEFAULT 'en',
  interval INTEGER DEFAULT 0,
  ease REAL DEFAULT 2.5,
  due BIGINT NOT NULL,
  tone_best INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_user_due ON public.cards(user_id, due);

-- 3. Tabla de Evaluación de Competencias y Progreso CEFR
CREATE TABLE IF NOT EXISTS public.competencies (
  user_id TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  grammar INTEGER DEFAULT 60,
  vocabulary INTEGER DEFAULT 65,
  fluency INTEGER DEFAULT 55,
  comprehension INTEGER DEFAULT 70,
  milestones TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Historial de Conversaciones
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lang TEXT NOT NULL,
  level TEXT NOT NULL,
  mission TEXT NOT NULL,
  turns JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de Vocabulario de Avance Aprendido
CREATE TABLE IF NOT EXISTS public.session_vocab (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  translation TEXT NOT NULL,
  phonetic TEXT,
  pos TEXT,
  lang TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Habilitar Row Level Security (RLS) en TODAS las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_vocab ENABLE ROW LEVEL SECURITY;

-- Limpieza de políticas anteriores
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

-- Políticas estrictas: Cada usuario solo puede leer y modificar sus propios datos
-- Permite acceso directo mediante auth.uid() = user_id o mediante SERVICE_ROLE del backend

CREATE POLICY "Users can only read and write their own profile"
  ON public.profiles
  FOR ALL
  USING (auth.uid()::text = id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid()::text = id OR auth.role() = 'service_role');

CREATE POLICY "Users can only read and write their own cards"
  ON public.cards
  FOR ALL
  USING (auth.uid()::text = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can only read and write their own competencies"
  ON public.competencies
  FOR ALL
  USING (auth.uid()::text = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can only read and write their own conversations"
  ON public.conversations
  FOR ALL
  USING (auth.uid()::text = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can only read and write their own vocab"
  ON public.session_vocab
  FOR ALL
  USING (auth.uid()::text = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');

