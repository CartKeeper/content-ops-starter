create extension if not exists "pgcrypto";

alter table public.users
    add column if not exists ui_prefs jsonb;

alter table public.users
    alter column permissions set default jsonb_build_object(
        'can_manage_users', false,
        'can_edit_settings', false,
        'can_view_galleries', true,
        'can_manage_integrations', true,
        'can_manage_calendar', true,
        'can_manage_contracts', false,
        'can_view_contracts', true,
        'can_sign_contracts', false
    );

with normalized as (
    select
        id,
        coalesce((coalesce(permissions, '{}'::jsonb)->>'can_manage_users')::boolean, false) as can_manage_users,
        coalesce((coalesce(permissions, '{}'::jsonb)->>'can_edit_settings')::boolean, false) as can_edit_settings,
        coalesce((coalesce(permissions, '{}'::jsonb)->>'can_view_galleries')::boolean, true) as can_view_galleries,
        coalesce((coalesce(permissions, '{}'::jsonb)->>'can_manage_integrations')::boolean, true) as can_manage_integrations,
        coalesce((coalesce(permissions, '{}'::jsonb)->>'can_manage_calendar')::boolean, true) as can_manage_calendar,
        coalesce((coalesce(permissions, '{}'::jsonb)->>'can_manage_contracts')::boolean, false) as can_manage_contracts,
        coalesce((coalesce(permissions, '{}'::jsonb)->>'can_view_contracts')::boolean, true) as can_view_contracts,
        coalesce((coalesce(permissions, '{}'::jsonb)->>'can_sign_contracts')::boolean, false) as can_sign_contracts
    from public.users
)
update public.users as u
set permissions = jsonb_build_object(
        'can_manage_users', n.can_manage_users,
        'can_edit_settings', n.can_edit_settings,
        'can_view_galleries', n.can_view_galleries,
        'can_manage_integrations', n.can_manage_integrations,
        'can_manage_calendar', n.can_manage_calendar,
        'can_manage_contracts', n.can_manage_contracts,
        'can_view_contracts', n.can_view_contracts,
        'can_sign_contracts', n.can_sign_contracts
    )
from normalized as n
where u.id = n.id;

create table if not exists public.counterparties (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    name text not null,
    company_name text,
    contact_email text,
    contact_phone text,
    notes text,
    metadata jsonb,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists counterparties_workspace_id_idx on public.counterparties(workspace_id);

create trigger counterparties_set_updated_at
    before update on public.counterparties
    for each row execute procedure public.set_updated_at();

create table if not exists public.contracts (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    title text not null,
    status text not null default 'draft',
    summary text,
    owner_user_id uuid references public.users(id) on delete set null,
    primary_counterparty_id uuid references public.counterparties(id) on delete set null,
    open_contract_id text,
    open_contract_viewer_url text,
    open_contract_corpus_id text,
    docusign_envelope_id text,
    docusign_status text,
    storage_bucket_key text,
    ui_state jsonb not null default '{}'::jsonb,
    metadata jsonb,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists contracts_workspace_id_idx on public.contracts(workspace_id);
create index if not exists contracts_owner_user_id_idx on public.contracts(owner_user_id);

create trigger contracts_set_updated_at
    before update on public.contracts
    for each row execute procedure public.set_updated_at();

create table if not exists public.contract_versions (
    id uuid primary key default gen_random_uuid(),
    contract_id uuid not null references public.contracts(id) on delete cascade,
    version_number integer not null,
    status text not null default 'draft',
    open_contract_version_id text,
    open_contract_viewer_url text,
    document_url text,
    document_storage_key text,
    document_checksum text,
    created_by uuid references public.users(id) on delete set null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists contract_versions_unique on public.contract_versions(contract_id, version_number);
create trigger contract_versions_set_updated_at
    before update on public.contract_versions
    for each row execute procedure public.set_updated_at();

alter table public.contracts
    add column if not exists current_version_id uuid references public.contract_versions(id) on delete set null;

create table if not exists public.contract_signers (
    id uuid primary key default gen_random_uuid(),
    contract_id uuid not null references public.contracts(id) on delete cascade,
    version_id uuid references public.contract_versions(id) on delete cascade,
    counterparty_id uuid references public.counterparties(id) on delete set null,
    signer_name text not null,
    signer_email text not null,
    role text,
    signing_order integer not null default 1,
    status text not null default 'pending',
    docusign_recipient_id text,
    completed_at timestamptz,
    metadata jsonb,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists contract_signers_contract_id_idx on public.contract_signers(contract_id);
create index if not exists contract_signers_version_id_idx on public.contract_signers(version_id);
create trigger contract_signers_set_updated_at
    before update on public.contract_signers
    for each row execute procedure public.set_updated_at();

create table if not exists public.contract_tasks (
    id uuid primary key default gen_random_uuid(),
    contract_id uuid not null references public.contracts(id) on delete cascade,
    version_id uuid references public.contract_versions(id) on delete cascade,
    task_type text not null,
    status text not null default 'pending',
    due_at timestamptz,
    payload jsonb,
    result jsonb,
    created_by uuid references public.users(id) on delete set null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists contract_tasks_contract_id_idx on public.contract_tasks(contract_id);
create trigger contract_tasks_set_updated_at
    before update on public.contract_tasks
    for each row execute procedure public.set_updated_at();

create table if not exists public.contract_audit (
    id bigserial primary key,
    contract_id uuid not null references public.contracts(id) on delete cascade,
    version_id uuid references public.contract_versions(id) on delete set null,
    actor_id uuid references public.users(id) on delete set null,
    event text not null,
    description text,
    metadata jsonb,
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists contract_audit_contract_id_idx on public.contract_audit(contract_id);
