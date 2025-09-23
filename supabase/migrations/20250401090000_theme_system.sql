create extension if not exists "pgcrypto";

create table if not exists public.workspaces (
    id uuid primary key default gen_random_uuid(),
    name text not null default 'Primary Workspace',
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

do $$
begin
    if not exists (select 1 from pg_trigger where tgname = 'workspaces_set_updated_at') then
        create trigger workspaces_set_updated_at
            before update on public.workspaces
            for each row execute procedure public.set_updated_at();
    end if;
end
$$;

insert into public.workspaces (name)
select 'Primary Workspace'
where not exists (select 1 from public.workspaces);

alter table public.users
    add column if not exists theme_prefs jsonb,
    add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;

update public.users
set workspace_id = sub.id
from (
    select id
    from public.workspaces
    order by created_at asc
    limit 1
) as sub
where public.users.workspace_id is null;

create table if not exists public.workspace_theme_settings (
    workspace_id uuid primary key references public.workspaces(id) on delete cascade,
    theme jsonb not null default jsonb_build_object(
        'mode', 'dark',
        'accent', 'indigo',
        'background', jsonb_build_object('light', 'slate', 'dark', 'zinc'),
        'outline', jsonb_build_object('enabled', false, 'level', 'medium')
    ),
    updated_at timestamptz not null default timezone('utc', now())
);

do $$
begin
    if not exists (select 1 from pg_trigger where tgname = 'workspace_theme_settings_set_updated_at') then
        create trigger workspace_theme_settings_set_updated_at
            before update on public.workspace_theme_settings
            for each row execute procedure public.set_updated_at();
    end if;
end
$$;

insert into public.workspace_theme_settings (workspace_id)
select w.id
from public.workspaces w
where not exists (
    select 1
    from public.workspace_theme_settings s
    where s.workspace_id = w.id
);
