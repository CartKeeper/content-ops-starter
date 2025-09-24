create extension if not exists "pgcrypto";

create or replace function public.default_workspace_id()
returns uuid
language plpgsql
stable
as $$
declare
    result uuid;
begin
    select id
    into result
    from public.workspaces
    order by created_at asc
    limit 1;

    return result;
end;
$$;

create table if not exists public.projects (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null default public.default_workspace_id() references public.workspaces(id) on delete cascade,
    client_id uuid not null references public.clients(id) on delete cascade,
    title text not null,
    status text not null default 'PLANNING' check (status in ('PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETE', 'CANCELLED')),
    start_date timestamptz,
    end_date timestamptz,
    description text,
    tags text[] not null default array[]::text[],
    created_by uuid references public.users(id) on delete set null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists projects_workspace_id_idx on public.projects(workspace_id);
create index if not exists projects_client_id_idx on public.projects(client_id);
create index if not exists projects_status_idx on public.projects(status);
create index if not exists projects_tags_idx on public.projects using gin (tags);

create trigger projects_set_updated_at
    before update on public.projects
    for each row execute procedure public.set_updated_at();

create table if not exists public.project_tasks (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    name text not null,
    date timestamptz,
    location text,
    status text not null default 'PENDING' check (status in ('PENDING', 'CONFIRMED', 'EDITING', 'COMPLETE')),
    order_index integer not null default 0,
    completed_at timestamptz,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists project_tasks_project_id_idx on public.project_tasks(project_id);
create index if not exists project_tasks_workspace_id_idx on public.project_tasks(workspace_id);
create index if not exists project_tasks_status_idx on public.project_tasks(status);
create index if not exists project_tasks_date_idx on public.project_tasks(date);

create or replace function public.sync_project_task_workspace()
returns trigger
language plpgsql
as $$
declare
    project_workspace uuid;
begin
    select workspace_id into project_workspace from public.projects where id = new.project_id;

    if project_workspace is null then
        raise exception 'Unable to resolve workspace for project %', new.project_id;
    end if;

    new.workspace_id = project_workspace;
    return new;
end;
$$;

create trigger project_tasks_set_workspace
    before insert or update on public.project_tasks
    for each row execute procedure public.sync_project_task_workspace();

create trigger project_tasks_set_updated_at
    before update on public.project_tasks
    for each row execute procedure public.set_updated_at();
