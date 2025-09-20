create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

create table if not exists public.user_calendars (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid not null unique references public.users(id) on delete cascade,
    name text not null default 'Primary Calendar',
    timezone text not null default 'UTC',
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create trigger user_calendars_set_updated_at
    before update on public.user_calendars
    for each row execute procedure public.set_updated_at();

alter table public.users
    add column if not exists role text not null default 'standard',
    add column if not exists permissions jsonb not null default jsonb_build_object(
        'can_manage_users', false,
        'can_edit_settings', false,
        'can_view_galleries', true,
        'can_manage_integrations', true,
        'can_manage_calendar', true
    ),
    add column if not exists calendar_id uuid,
    add column if not exists updated_at timestamptz not null default timezone('utc', now()),
    add column if not exists email_verified_at timestamptz,
    add column if not exists verification_token text,
    add column if not exists verification_expires_at timestamptz,
    add column if not exists invitation_sent_at timestamptz,
    add column if not exists deactivated_at timestamptz,
    add column if not exists password_reset_token text,
    add column if not exists password_reset_expires_at timestamptz,
    add column if not exists last_login_at timestamptz;

alter table public.users
    add constraint users_calendar_id_fkey foreign key (calendar_id) references public.user_calendars(id) on delete set null;

create trigger users_set_updated_at
    before update on public.users
    for each row execute procedure public.set_updated_at();

insert into public.user_calendars (owner_user_id)
select u.id
from public.users u
where not exists (
    select 1
    from public.user_calendars c
    where c.owner_user_id = u.id
);

update public.users
set calendar_id = c.id
from public.user_calendars c
where c.owner_user_id = public.users.id
  and (public.users.calendar_id is distinct from c.id or public.users.calendar_id is null);

update public.users
set role = case
        when array_position(coalesce(roles, array[]::text[]), 'admin') is not null then 'admin'
        when array_position(coalesce(roles, array[]::text[]), 'restricted') is not null then 'restricted'
        else 'standard'
    end,
    permissions = jsonb_build_object(
        'can_manage_users', array_position(coalesce(roles, array[]::text[]), 'admin') is not null,
        'can_edit_settings', array_position(coalesce(roles, array[]::text[]), 'admin') is not null,
        'can_view_galleries', true,
        'can_manage_integrations', true,
        'can_manage_calendar', true
    ),
    email_verified_at = coalesce(email_verified_at, created_at),
    updated_at = coalesce(updated_at, created_at);

create unique index if not exists users_verification_token_unique on public.users(verification_token)
where verification_token is not null;

create unique index if not exists users_password_reset_token_unique on public.users(password_reset_token)
where password_reset_token is not null;

alter table if exists public.contacts
    drop constraint if exists contacts_owner_user_id_fkey;

alter table if exists public.contacts
    add constraint contacts_owner_user_id_fkey foreign key (owner_user_id) references public.users(id) on delete set null;

alter table if exists public.clients
    drop constraint if exists clients_owner_user_id_fkey;

alter table if exists public.clients
    add constraint clients_owner_user_id_fkey foreign key (owner_user_id) references public.users(id) on delete set null;
