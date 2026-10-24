-- ============================================================================
-- MIGRACIÓN 005: Salas de Microgrupos y Social Co-Op (Aprendizaje Colaborativo)
-- Proyecto: Polyglot Voice SaaS - Fase II
-- Objetivo: Almacenamiento multi-tenant, membresías y registro de sesiones grupales
-- Idempotente: Ejecutable múltiples veces sin conflicto de esquema.
-- Orden DDL: Todas las tablas se crean primero para evitar errores 42P01 de forward-reference.
-- ============================================================================

-- ============================================================================
-- PASO 1: Creación de Tablas e Índices
-- ============================================================================

-- 1.1 Tabla de Salas de Microgrupos
CREATE TABLE IF NOT EXISTS public.coop_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code VARCHAR(32) NOT NULL UNIQUE,
  max_capacity INTEGER NOT NULL DEFAULT 6 CHECK (max_capacity >= 2 AND max_capacity <= 6),
  level_cefr VARCHAR(16) NOT NULL, -- 'A1', 'A2', 'B1', 'B2', 'C1', 'HSK1', etc.
  professional_domain VARCHAR(32) NOT NULL DEFAULT 'general', -- 'tech', 'medical', 'corporate', 'general'
  status VARCHAR(16) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  target_task JSONB NOT NULL DEFAULT '{"name":"Daily Scrum","goal":"Share sprint updates and resolve blockers"}'::jsonb,
  created_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coop_rooms_matching 
  ON public.coop_rooms(level_cefr, professional_domain, status);

CREATE INDEX IF NOT EXISTS idx_coop_rooms_code 
  ON public.coop_rooms(room_code);


-- 1.2 Tabla de Membresías en Salas Co-Op
CREATE TABLE IF NOT EXISTS public.coop_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.coop_rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role VARCHAR(16) NOT NULL DEFAULT 'member' CHECK (role IN ('host', 'member')),
  peer_feedback_score NUMERIC(4,2) DEFAULT NULL,
  talking_time_seconds INTEGER NOT NULL DEFAULT 0,
  turn_count INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_coop_room_user UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_coop_memberships_user ON public.coop_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_coop_memberships_room ON public.coop_memberships(room_id);


-- 1.3 Tabla de Registro y Auditoría de Sesiones Grupales Co-Op
CREATE TABLE IF NOT EXISTS public.coop_sessions_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.coop_rooms(id) ON DELETE CASCADE,
  transcript_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  task_goals_achieved JSONB NOT NULL DEFAULT '[]'::jsonb,
  facilitator_summary TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coop_sessions_log_room ON public.coop_sessions_log(room_id);


-- ============================================================================
-- PASO 2: Habilitación de Row Level Security (RLS) y Permisos
-- ============================================================================

ALTER TABLE public.coop_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coop_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coop_sessions_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.coop_rooms FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.coop_rooms TO authenticated, service_role;

REVOKE ALL ON public.coop_memberships FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coop_memberships TO authenticated, service_role;

REVOKE ALL ON public.coop_sessions_log FROM anon;
GRANT SELECT, INSERT ON public.coop_sessions_log TO authenticated, service_role;


-- ============================================================================
-- PASO 3: Políticas RLS de Seguridad Multi-Tenant
-- ============================================================================

-- 3.1 Políticas para public.coop_rooms
DROP POLICY IF EXISTS "coop_rooms_select_accessible" ON public.coop_rooms;
DROP POLICY IF EXISTS "coop_rooms_insert_authenticated" ON public.coop_rooms;
DROP POLICY IF EXISTS "coop_rooms_update_members" ON public.coop_rooms;

-- Lectura: salas en espera/activas o creadas por el usuario o donde sea miembro
CREATE POLICY "coop_rooms_select_accessible"
  ON public.coop_rooms FOR SELECT
  TO authenticated
  USING (
    status IN ('waiting', 'active') OR
    created_by = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.coop_memberships m
      WHERE m.room_id = public.coop_rooms.id
        AND m.user_id = auth.uid()::text
    )
  );

-- Inserción: creador autenticado
CREATE POLICY "coop_rooms_insert_authenticated"
  ON public.coop_rooms FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid()::text);

-- Actualización: creador o participantes
CREATE POLICY "coop_rooms_update_members"
  ON public.coop_rooms FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.coop_memberships m
      WHERE m.room_id = public.coop_rooms.id
        AND m.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    created_by = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.coop_memberships m
      WHERE m.room_id = public.coop_rooms.id
        AND m.user_id = auth.uid()::text
    )
  );


-- 3.2 Políticas para public.coop_memberships
DROP POLICY IF EXISTS "coop_memberships_select_room" ON public.coop_memberships;
DROP POLICY IF EXISTS "coop_memberships_insert_own" ON public.coop_memberships;
DROP POLICY IF EXISTS "coop_memberships_update_own" ON public.coop_memberships;
DROP POLICY IF EXISTS "coop_memberships_delete_own" ON public.coop_memberships;

-- Lectura: miembros de salas en espera/activas o sus propias membresías (sin recursión)
CREATE POLICY "coop_memberships_select_room"
  ON public.coop_memberships FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.coop_rooms r
      WHERE r.id = public.coop_memberships.room_id
        AND (r.status IN ('waiting', 'active') OR r.created_by = auth.uid()::text)
    )
  );

-- Inserción: solo unirse a sí mismo
CREATE POLICY "coop_memberships_insert_own"
  ON public.coop_memberships FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

-- Actualización: actualizar métricas propias
CREATE POLICY "coop_memberships_update_own"
  ON public.coop_memberships FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- Salir de la sala: borrar su propia membresía
CREATE POLICY "coop_memberships_delete_own"
  ON public.coop_memberships FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);


-- 3.3 Políticas para public.coop_sessions_log
DROP POLICY IF EXISTS "coop_sessions_log_select_members" ON public.coop_sessions_log;
DROP POLICY IF EXISTS "coop_sessions_log_insert_members" ON public.coop_sessions_log;

CREATE POLICY "coop_sessions_log_select_members"
  ON public.coop_sessions_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coop_memberships m
      WHERE m.room_id = public.coop_sessions_log.room_id
        AND m.user_id = auth.uid()::text
    )
  );

CREATE POLICY "coop_sessions_log_insert_members"
  ON public.coop_sessions_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coop_memberships m
      WHERE m.room_id = public.coop_sessions_log.room_id
        AND m.user_id = auth.uid()::text
    )
  );
