create extension if not exists "pgcrypto";

-- Backfill public.users with auth.users rows so owner references remain valid.
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
