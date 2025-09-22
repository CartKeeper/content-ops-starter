create extension if not exists "pgcrypto";

-- Identify users whose primary keys diverged between auth.users and public.users
-- so the mirrored records can be rebuilt with the correct identifiers.
create temporary table temp_users_to_merge on commit drop as
select
    pu.id as old_id,
    au.id as new_id,
    au.email as email,
    coalesce(pu.password_hash, crypt('temporary-password-change-me', gen_salt('bf'))) as password_hash,
    pu.name,
    coalesce(pu.roles, array['photographer']::text[]) as roles,
    pu.role_title,
    pu.phone,
    pu.welcome_message,
    pu.avatar_url,
    pu.status,
    coalesce(pu.role, 'standard') as role,
    coalesce(
        pu.permissions,
        jsonb_build_object(
            'can_manage_users', false,
            'can_edit_settings', false,
            'can_view_galleries', true,
            'can_manage_integrations', true,
            'can_manage_calendar', true
        )
    ) as permissions,
    pu.calendar_id,
    least(pu.created_at, coalesce(au.created_at, timezone('utc', now()))) as created_at,
    greatest(
        coalesce(au.updated_at, au.created_at, timezone('utc', now())),
        coalesce(pu.updated_at, pu.created_at, timezone('utc', now()))
    ) as updated_at,
    coalesce(au.email_confirmed_at, au.confirmed_at, pu.email_verified_at) as email_verified_at,
    pu.verification_token,
    pu.verification_expires_at,
    pu.invitation_sent_at,
    pu.deactivated_at,
    pu.password_reset_token,
    pu.password_reset_expires_at,
    pu.last_login_at
from auth.users au
join public.users pu on lower(pu.email) = lower(au.email)
where pu.id <> au.id;

-- Move the legacy records out of the way so fresh mirrors can be inserted.
update public.users u
set email = concat(u.email, '::legacy::', u.id::text)
from temp_users_to_merge m
where u.id = m.old_id;

-- Rebuild the public.users mirrors with the correct auth.users identifiers while
-- keeping the existing profile metadata intact.
insert into public.users (
    id,
    email,
    password_hash,
    name,
    roles,
    role_title,
    phone,
    welcome_message,
    avatar_url,
    status,
    role,
    permissions,
    calendar_id,
    created_at,
    updated_at,
    email_verified_at,
    verification_token,
    verification_expires_at,
    invitation_sent_at,
    deactivated_at,
    password_reset_token,
    password_reset_expires_at,
    last_login_at
)
select
    m.new_id,
    m.email,
    m.password_hash,
    m.name,
    m.roles,
    m.role_title,
    m.phone,
    m.welcome_message,
    m.avatar_url,
    m.status,
    m.role,
    m.permissions,
    m.calendar_id,
    m.created_at,
    m.updated_at,
    m.email_verified_at,
    m.verification_token,
    m.verification_expires_at,
    m.invitation_sent_at,
    m.deactivated_at,
    m.password_reset_token,
    m.password_reset_expires_at,
    m.last_login_at
from temp_users_to_merge m
on conflict (id) do update
    set email = excluded.email,
        password_hash = coalesce(excluded.password_hash, public.users.password_hash),
        name = coalesce(excluded.name, public.users.name),
        roles = coalesce(excluded.roles, public.users.roles),
        role_title = coalesce(excluded.role_title, public.users.role_title),
        phone = coalesce(excluded.phone, public.users.phone),
        welcome_message = coalesce(excluded.welcome_message, public.users.welcome_message),
        avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url),
        status = coalesce(excluded.status, public.users.status),
        role = coalesce(excluded.role, public.users.role),
        permissions = coalesce(excluded.permissions, public.users.permissions),
        calendar_id = coalesce(excluded.calendar_id, public.users.calendar_id),
        created_at = least(public.users.created_at, excluded.created_at),
        updated_at = greatest(public.users.updated_at, excluded.updated_at),
        email_verified_at = coalesce(public.users.email_verified_at, excluded.email_verified_at),
        verification_token = coalesce(public.users.verification_token, excluded.verification_token),
        verification_expires_at = coalesce(public.users.verification_expires_at, excluded.verification_expires_at),
        invitation_sent_at = coalesce(public.users.invitation_sent_at, excluded.invitation_sent_at),
        deactivated_at = coalesce(public.users.deactivated_at, excluded.deactivated_at),
        password_reset_token = coalesce(public.users.password_reset_token, excluded.password_reset_token),
        password_reset_expires_at = coalesce(public.users.password_reset_expires_at, excluded.password_reset_expires_at),
        last_login_at = coalesce(public.users.last_login_at, excluded.last_login_at);

-- Cascade the new identifiers through dependent tables now that the mirror exists.
update public.contacts c
set owner_user_id = m.new_id
from temp_users_to_merge m
where c.owner_user_id = m.old_id;

update public.clients c
set owner_user_id = m.new_id
from temp_users_to_merge m
where c.owner_user_id = m.old_id;

update public.calendar_events ce
set owner_user_id = m.new_id
from temp_users_to_merge m
where ce.owner_user_id = m.old_id;

update public.user_calendars uc
set owner_user_id = m.new_id
from temp_users_to_merge m
where uc.owner_user_id = m.old_id;

update public.tasks t
set created_by = m.new_id
from temp_users_to_merge m
where t.created_by = m.old_id;

update public.tasks t
set assigned_to = m.new_id
from temp_users_to_merge m
where t.assigned_to = m.old_id;

update public.event_assignees ea
set user_id = m.new_id
from temp_users_to_merge m
where ea.user_id = m.old_id;

-- Retire the legacy rows once the dependent data has been updated.
delete from public.users u
using temp_users_to_merge m
where u.id = m.old_id;

-- Backfill any remaining auth.users that still do not have a mirror in public.users.
with auth_source as (
    select
        au.id,
        au.email,
        coalesce(au.created_at, timezone('utc', now())) as created_at,
        greatest(
            coalesce(au.updated_at, au.created_at, timezone('utc', now())),
            coalesce(au.created_at, timezone('utc', now()))
        ) as updated_at,
        coalesce(au.email_confirmed_at, au.confirmed_at) as email_verified_at
    from auth.users au
)
insert into public.users as u (id, email, password_hash, created_at, updated_at, email_verified_at)
select
    s.id,
    s.email,
    crypt('temporary-password-change-me', gen_salt('bf')),
    s.created_at,
    s.updated_at,
    s.email_verified_at
from auth_source s
on conflict (id) do update
    set email = excluded.email,
        updated_at = greatest(excluded.updated_at, u.updated_at),
        email_verified_at = coalesce(u.email_verified_at, excluded.email_verified_at),
        password_hash = coalesce(u.password_hash, excluded.password_hash),
        created_at = least(u.created_at, excluded.created_at);

-- Keep public.users synced with auth.users going forward.
create or replace function public.sync_public_user_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    now_utc timestamptz := timezone('utc', now());
    created_ts timestamptz := coalesce(new.created_at, now_utc);
    updated_ts timestamptz := greatest(coalesce(new.updated_at, now_utc), created_ts);
    verified_ts timestamptz := coalesce(new.email_confirmed_at, new.confirmed_at);
begin
    insert into public.users as u (id, email, password_hash, created_at, updated_at, email_verified_at)
    values (
        new.id,
        new.email,
        crypt('temporary-password-change-me', gen_salt('bf')),
        created_ts,
        updated_ts,
        verified_ts
    )
    on conflict (id) do update
        set email = excluded.email,
            updated_at = greatest(excluded.updated_at, u.updated_at),
            email_verified_at = coalesce(excluded.email_verified_at, u.email_verified_at),
            password_hash = coalesce(u.password_hash, excluded.password_hash),
            created_at = least(u.created_at, excluded.created_at);

    return new;
end;
$$;

drop trigger if exists sync_public_users_from_auth on auth.users;
create trigger sync_public_users_from_auth
    after insert or update on auth.users
    for each row
    execute function public.sync_public_user_from_auth();
