create extension if not exists "pgcrypto";

alter table public.clients
    add column if not exists name text;

update public.clients
set name = coalesce(
        nullif(trim(name), ''),
        nullif(trim(concat_ws(' ', nullif(trim(first_name), ''), nullif(trim(last_name), ''))), ''),
        nullif(trim(business), ''),
        'Client'
    )
where name is null or trim(name) = '';

alter table public.clients
    alter column name set not null;

alter table public.clients
    add column if not exists status text default 'Lead';

update public.clients
set status = 'Lead'
where status is null or trim(status) = '';

alter table public.clients
    alter column status set not null,
    alter column status set default 'Lead';

alter table public.clients
    add column if not exists outstanding_cents integer default 0;

update public.clients
set outstanding_cents = 0
where outstanding_cents is null;

alter table public.clients
    alter column outstanding_cents set not null,
    alter column outstanding_cents set default 0;

alter table public.clients
    add column if not exists last_activity date,
    add column if not exists upcoming_shoot date,
    add column if not exists portal_enabled boolean default false,
    add column if not exists tags text[];

alter table public.clients
    alter column portal_enabled set not null,
    alter column portal_enabled set default false,
    alter column created_at set default timezone('utc'::text, now()),
    alter column updated_at set default timezone('utc'::text, now());

create unique index if not exists clients_email_unique_idx
    on public.clients (lower(email))
    where email is not null;

create or replace function public.set_clients_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
    before update on public.clients
    for each row
    execute function public.set_clients_updated_at();

create or replace function public.get_client_metrics()
returns table (
    active_count bigint,
    outstanding_cents bigint,
    upcoming_count_60d bigint,
    portal_ready_count bigint
)
language sql
as $$
    select
        count(*) filter (where status = 'Active') as active_count,
        coalesce(sum(outstanding_cents), 0)::bigint as outstanding_cents,
        count(*) filter (
            where upcoming_shoot is not null
              and upcoming_shoot >= current_date
              and upcoming_shoot <= current_date + interval '60 days'
        ) as upcoming_count_60d,
        count(*) filter (
            where portal_enabled is true
               or (portal_url is not null and length(trim(portal_url)) > 0)
        ) as portal_ready_count
    from public.clients;
$$;
