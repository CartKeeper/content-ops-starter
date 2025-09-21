create extension if not exists "uuid-ossp";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

create table if not exists public.dropbox_assets (
    id uuid primary key default uuid_generate_v4(),
    dropbox_file_id text not null,
    dropbox_path text,
    folder_path text,
    file_name text,
    size_in_bytes bigint,
    preview_url text,
    thumbnail_url text,
    client_name text,
    gallery_id uuid references public.galleries (id) on delete set null,
    gallery_name text,
    status text not null default 'Pending' check (status in ('Synced', 'Syncing', 'Pending', 'Error', 'Archived')),
    client_modified timestamptz,
    server_modified timestamptz,
    imported_at timestamptz not null default timezone('utc', now()),
    payload jsonb,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    unique (dropbox_file_id)
);

create index if not exists dropbox_assets_gallery_idx on public.dropbox_assets (gallery_id);
create index if not exists dropbox_assets_status_idx on public.dropbox_assets (status);

create trigger dropbox_assets_set_updated_at
    before update on public.dropbox_assets
    for each row
    execute function public.set_updated_at();

create table if not exists public.gallery_publications (
    id uuid primary key default uuid_generate_v4(),
    gallery_id uuid not null references public.galleries (id) on delete cascade,
    publish_target text not null,
    publish_url text,
    status text not null default 'success' check (status in ('success', 'failed', 'pending')),
    payload jsonb,
    published_at timestamptz not null default timezone('utc', now()),
    published_by text,
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists gallery_publications_gallery_idx on public.gallery_publications (gallery_id);

alter table public.galleries
    add column if not exists deliver_by timestamptz,
    add column if not exists expires_at timestamptz,
    add column if not exists published_at timestamptz,
    add column if not exists published_url text,
    add column if not exists published_by text,
    add column if not exists dropbox_sync_cursor text,
    add column if not exists welcome_message text,
    add column if not exists portal_password text,
    add column if not exists portal_hint text,
    add column if not exists default_view text default 'pinterest';
