create extension if not exists "pgcrypto";

-- Align existing public.users rows with auth.users identifiers based on email so
-- foreign-keyed owner references stay valid.
create temporary table temp_mismatched_users on commit drop as
select
    pu.id as old_id,
    au.id as new_id,
    au.email,
    coalesce(au.created_at, timezone('utc', now())) as created_at,
    greatest(
        coalesce(au.updated_at, au.created_at, timezone('utc', now())),
        coalesce(au.created_at, timezone('utc', now()))
    ) as updated_at,
    coalesce(au.email_confirmed_at, au.confirmed_at) as email_verified_at
from auth.users au
join public.users pu on lower(pu.email) = lower(au.email)
where pu.id <> au.id;

update public.contacts c
set owner_user_id = m.new_id
from temp_mismatched_users m
where c.owner_user_id = m.old_id;

update public.clients c
set owner_user_id = m.new_id
from temp_mismatched_users m
where c.owner_user_id = m.old_id;

update public.calendar_events ce
set owner_user_id = m.new_id
from temp_mismatched_users m
where ce.owner_user_id = m.old_id;

update public.user_calendars uc
set owner_user_id = m.new_id
from temp_mismatched_users m
where uc.owner_user_id = m.old_id;

update public.tasks t
set created_by = m.new_id
from temp_mismatched_users m
where t.created_by = m.old_id;

update public.tasks t
set assigned_to = m.new_id
from temp_mismatched_users m
where t.assigned_to = m.old_id;

update public.event_assignees ea
set user_id = m.new_id
from temp_mismatched_users m
where ea.user_id = m.old_id;

update public.users u
set id = m.new_id,
    email = m.email,
    created_at = least(u.created_at, m.created_at),
    updated_at = greatest(u.updated_at, m.updated_at),
    email_verified_at = coalesce(m.email_verified_at, u.email_verified_at)
from temp_mismatched_users m
where u.id = m.old_id;

-- Backfill public.users with auth.users records and keep them aligned by id.
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
        email_verified_at = coalesce(excluded.email_verified_at, u.email_verified_at),
        password_hash = u.password_hash,
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
            password_hash = u.password_hash,
            created_at = least(u.created_at, excluded.created_at);

    return new;
end;
$$;

drop trigger if exists sync_public_users_from_auth on auth.users;
create trigger sync_public_users_from_auth
    after insert or update on auth.users
    for each row
    execute function public.sync_public_user_from_auth();
