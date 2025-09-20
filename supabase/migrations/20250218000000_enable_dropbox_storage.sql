alter table if exists public.dropbox_assets
    add column if not exists storage_bucket text,
    add column if not exists storage_path text;

insert into storage.buckets (id, name, public)
values ('dropbox_assets', 'dropbox_assets', true)
on conflict (id) do update set public = excluded.public;

do $$
begin
    if not exists (
        select 1 from pg_policy where polname = 'Allow public read access to Dropbox storage'
    ) then
        create policy "Allow public read access to Dropbox storage"
            on storage.objects
            for select
            using (bucket_id = 'dropbox_assets');
    end if;
end $$;

do $$
begin
    if not exists (
        select 1 from pg_policy where polname = 'Allow service role to manage Dropbox storage'
    ) then
        create policy "Allow service role to manage Dropbox storage"
            on storage.objects
            for all
            using (auth.role() = 'service_role' and bucket_id = 'dropbox_assets')
            with check (auth.role() = 'service_role' and bucket_id = 'dropbox_assets');
    end if;
end $$;
