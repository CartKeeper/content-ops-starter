create extension if not exists "pgcrypto";

create table if not exists public.users (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    password_hash text not null,
    name text,
    roles text[] not null default array['photographer']::text[],
    created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.calendar_events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    title text not null,
    description text,
    start_time timestamptz not null,
    end_time timestamptz not null,
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_calendar_events_user_id on public.calendar_events(user_id);
create index if not exists idx_calendar_events_start_time on public.calendar_events(start_time);
