create extension if not exists "pgcrypto";

-- Rename legacy columns to match new schema requirements
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'calendar_events'
            AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.calendar_events RENAME COLUMN user_id TO owner_user_id;
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'calendar_events'
            AND column_name = 'start_time'
    ) THEN
        ALTER TABLE public.calendar_events RENAME COLUMN start_time TO start_at;
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'calendar_events'
            AND column_name = 'end_time'
    ) THEN
        ALTER TABLE public.calendar_events RENAME COLUMN end_time TO end_at;
    END IF;
END
$$;

-- Ensure required columns exist
ALTER TABLE public.calendar_events
    ADD COLUMN IF NOT EXISTS description text,
    ADD COLUMN IF NOT EXISTS all_day boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS location text,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.calendar_events
    ALTER COLUMN title SET NOT NULL,
    ALTER COLUMN start_at SET NOT NULL,
    ALTER COLUMN end_at SET NOT NULL,
    ALTER COLUMN owner_user_id SET NOT NULL,
    ALTER COLUMN created_at SET DEFAULT now(),
    ALTER COLUMN updated_at SET DEFAULT now();

UPDATE public.calendar_events
SET updated_at = COALESCE(updated_at, now());

ALTER TABLE public.calendar_events
    ALTER COLUMN updated_at SET NOT NULL;

-- Refresh foreign keys and indexes
ALTER TABLE public.calendar_events
    DROP CONSTRAINT IF EXISTS calendar_events_user_id_fkey;

ALTER TABLE public.calendar_events
    ADD CONSTRAINT calendar_events_owner_user_id_fkey
        FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE CASCADE;

DROP INDEX IF EXISTS idx_calendar_events_user_id;
DROP INDEX IF EXISTS idx_calendar_events_start_time;
DROP INDEX IF EXISTS idx_calendar_events_end_time;

CREATE INDEX IF NOT EXISTS calendar_events_owner_user_id_idx ON public.calendar_events(owner_user_id);
CREATE INDEX IF NOT EXISTS calendar_events_client_id_idx ON public.calendar_events(client_id);
CREATE INDEX IF NOT EXISTS calendar_events_start_at_idx ON public.calendar_events(start_at);
CREATE INDEX IF NOT EXISTS calendar_events_end_at_idx ON public.calendar_events(end_at);

-- Ensure updated_at stays in sync
DROP TRIGGER IF EXISTS calendar_events_set_updated_at ON public.calendar_events;
CREATE TRIGGER calendar_events_set_updated_at
    BEFORE UPDATE ON public.calendar_events
    FOR EACH ROW
    EXECUTE PROCEDURE public.set_updated_at();

-- Tasks table for event assignments
CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    details text,
    status text NOT NULL DEFAULT 'open',
    priority text DEFAULT 'normal',
    due_at timestamptz,
    created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_to uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_id uuid REFERENCES public.calendar_events(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS tasks_event_id_idx ON public.tasks(event_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks(status);
CREATE INDEX IF NOT EXISTS tasks_due_at_idx ON public.tasks(due_at);

UPDATE public.tasks
SET updated_at = COALESCE(updated_at, now());

DROP TRIGGER IF EXISTS tasks_set_updated_at ON public.tasks;
CREATE TRIGGER tasks_set_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE PROCEDURE public.set_updated_at();

-- Event assignees join table
CREATE TABLE IF NOT EXISTS public.event_assignees (
    event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'assistant',
    PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS event_assignees_user_id_idx ON public.event_assignees(user_id);

-- Helper to check admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid;
    user_record public.users;
BEGIN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN false;
    END IF;

    SELECT u.* INTO user_record
    FROM public.users u
    WHERE u.id = current_user_id;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    IF user_record.role = 'admin' THEN
        RETURN true;
    END IF;

    IF user_record.roles IS NOT NULL AND array_position(user_record.roles, 'admin') IS NOT NULL THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO public;

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_assignees ENABLE ROW LEVEL SECURITY;

-- Calendar event policies
DROP POLICY IF EXISTS calendar_events_select ON public.calendar_events;
DROP POLICY IF EXISTS calendar_events_insert ON public.calendar_events;
DROP POLICY IF EXISTS calendar_events_update ON public.calendar_events;
DROP POLICY IF EXISTS calendar_events_delete ON public.calendar_events;

CREATE POLICY calendar_events_select ON public.calendar_events
    FOR SELECT
    USING (
        owner_user_id = auth.uid()
        OR public.is_admin()
        OR EXISTS (
            SELECT 1
            FROM public.event_assignees ea
            WHERE ea.event_id = public.calendar_events.id
              AND ea.user_id = auth.uid()
        )
    );

CREATE POLICY calendar_events_insert ON public.calendar_events
    FOR INSERT
    WITH CHECK (owner_user_id = auth.uid() OR public.is_admin());

CREATE POLICY calendar_events_update ON public.calendar_events
    FOR UPDATE
    USING (owner_user_id = auth.uid() OR public.is_admin())
    WITH CHECK (owner_user_id = auth.uid() OR public.is_admin());

CREATE POLICY calendar_events_delete ON public.calendar_events
    FOR DELETE
    USING (owner_user_id = auth.uid() OR public.is_admin());

-- Event assignee policies
DROP POLICY IF EXISTS event_assignees_select ON public.event_assignees;
DROP POLICY IF EXISTS event_assignees_insert ON public.event_assignees;
DROP POLICY IF EXISTS event_assignees_update ON public.event_assignees;
DROP POLICY IF EXISTS event_assignees_delete ON public.event_assignees;

CREATE POLICY event_assignees_select ON public.event_assignees
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR public.is_admin()
        OR EXISTS (
            SELECT 1
            FROM public.calendar_events ce
            WHERE ce.id = public.event_assignees.event_id
              AND ce.owner_user_id = auth.uid()
        )
    );

CREATE POLICY event_assignees_insert ON public.event_assignees
    FOR INSERT
    WITH CHECK (
        public.is_admin()
        OR EXISTS (
            SELECT 1
            FROM public.calendar_events ce
            WHERE ce.id = public.event_assignees.event_id
              AND ce.owner_user_id = auth.uid()
        )
    );

CREATE POLICY event_assignees_update ON public.event_assignees
    FOR UPDATE
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1
            FROM public.calendar_events ce
            WHERE ce.id = public.event_assignees.event_id
              AND ce.owner_user_id = auth.uid()
        )
    )
    WITH CHECK (
        public.is_admin()
        OR EXISTS (
            SELECT 1
            FROM public.calendar_events ce
            WHERE ce.id = public.event_assignees.event_id
              AND ce.owner_user_id = auth.uid()
        )
    );

CREATE POLICY event_assignees_delete ON public.event_assignees
    FOR DELETE
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1
            FROM public.calendar_events ce
            WHERE ce.id = public.event_assignees.event_id
              AND ce.owner_user_id = auth.uid()
        )
    );

-- Task policies
DROP POLICY IF EXISTS tasks_select ON public.tasks;
DROP POLICY IF EXISTS tasks_insert ON public.tasks;
DROP POLICY IF EXISTS tasks_update ON public.tasks;
DROP POLICY IF EXISTS tasks_delete ON public.tasks;

CREATE POLICY tasks_select ON public.tasks
    FOR SELECT
    USING (
        created_by = auth.uid()
        OR assigned_to = auth.uid()
        OR public.is_admin()
    );

CREATE POLICY tasks_insert ON public.tasks
    FOR INSERT
    WITH CHECK (created_by = auth.uid() OR public.is_admin());

CREATE POLICY tasks_update ON public.tasks
    FOR UPDATE
    USING (
        created_by = auth.uid()
        OR assigned_to = auth.uid()
        OR public.is_admin()
    )
    WITH CHECK (
        created_by = auth.uid()
        OR assigned_to = auth.uid()
        OR public.is_admin()
    );

CREATE POLICY tasks_delete ON public.tasks
    FOR DELETE
    USING (
        created_by = auth.uid()
        OR assigned_to = auth.uid()
        OR public.is_admin()
    );
