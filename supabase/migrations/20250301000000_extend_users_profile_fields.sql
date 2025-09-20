alter table public.users
    add column if not exists role_title text,
    add column if not exists phone text,
    add column if not exists welcome_message text,
    add column if not exists avatar_url text,
    add column if not exists status text;
