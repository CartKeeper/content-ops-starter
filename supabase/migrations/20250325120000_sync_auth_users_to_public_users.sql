create extension if not exists "pgcrypto";

-- Backfill public.users with any auth.users records that are missing.
insert into public.users as u (id, email, password_hash, created_at, updated_at, email_verified_at)
select
    au.id,
    au.email,
    crypt('temporary-password-change-me', gen_salt('bf')),
    coalesce(au.created_at, timezone('utc', now())),
    greatest(coalesce(au.updated_at, au.created_at, timezone('utc', now())), coalesce(au.created_at, timezone('utc', now()))),
    coalesce(au.email_confirmed_at, au.confirmed_at)
from auth.users au
where not exists (
    select 1
    from public.users pu
    where pu.id = au.id
);

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
            updated_at = excluded.updated_at,
            email_verified_at = coalesce(excluded.email_verified_at, u.email_verified_at),
            password_hash = u.password_hash,
            created_at = u.created_at;

    return new;
end;
$$;

drop trigger if exists sync_public_users_from_auth on auth.users;
create trigger sync_public_users_from_auth
    after insert or update on auth.users
    for each row
    execute function public.sync_public_user_from_auth();
