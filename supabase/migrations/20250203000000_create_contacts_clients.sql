-- Migration: create contacts, clients, galleries, billing_accounts, and calendar_events tables
-- This schema reflects the Codex CRM contact-to-client workflow.

create extension if not exists "uuid-ossp";

create table if not exists public.contacts (
    id uuid primary key default uuid_generate_v4(),
    owner_user_id uuid references auth.users (id) on delete set null,
    first_name text,
    last_name text,
    email text,
    phone text,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    address text,
    city text,
    state text,
    business text
);

create unique index if not exists contacts_email_owner_idx
    on public.contacts (owner_user_id, lower(coalesce(email, '')))
    where email is not null;

create table if not exists public.clients (
    id uuid primary key default uuid_generate_v4(),
    owner_user_id uuid references auth.users (id) on delete set null,
    first_name text,
    last_name text,
    email text,
    phone text,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    address text,
    city text,
    state text,
    business text,
    contact_id uuid references public.contacts (id) on delete set null,
    client_number text unique not null,
    gallery_id uuid,
    billing_id uuid,
    portal_url text
);

create table if not exists public.galleries (
    id uuid primary key default uuid_generate_v4(),
    client_id uuid not null references public.clients (id) on delete cascade,
    gallery_name text not null,
    gallery_url text,
    status text check (status in ('draft', 'live', 'archived')) not null default 'draft',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.billing_accounts (
    id uuid primary key default uuid_generate_v4(),
    client_id uuid not null references public.clients (id) on delete cascade,
    payment_terms text default 'Due on receipt',
    invoice_history jsonb default '[]'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.calendar_events (
    id uuid primary key default uuid_generate_v4(),
    client_id uuid not null references public.clients (id) on delete cascade,
    event_type text not null,
    event_date date not null,
    notes text
);

alter table public.clients
    add constraint clients_gallery_fk foreign key (gallery_id) references public.galleries (id) on delete set null;

alter table public.clients
    add constraint clients_billing_fk foreign key (billing_id) references public.billing_accounts (id) on delete set null;

create index if not exists galleries_client_id_idx on public.galleries (client_id);
create index if not exists billing_accounts_client_id_idx on public.billing_accounts (client_id);
create index if not exists calendar_events_client_id_idx on public.calendar_events (client_id);
