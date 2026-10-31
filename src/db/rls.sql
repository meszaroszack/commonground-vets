-- Apply in the Supabase SQL editor after `npm run db:push`.
-- Drizzle creates the public tables. This script turns on row-level security
-- and the private evidence bucket. The server uses the service role for the
-- public witness flow, so anonymous visitors never get a database key.

alter table public.profiles enable row level security;
alter table public.claim_conditions enable row level security;
alter table public.witness_requests enable row level security;
alter table public.evidence_documents enable row level security;
alter table public.community_providers enable row level security;

alter table public.profiles
  drop constraint if exists profiles_id_fkey;
alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth.users (id) on delete cascade;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy conditions_own on public.claim_conditions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy witnesses_own on public.witness_requests
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy evidence_own on public.evidence_documents
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy providers_read on public.community_providers
  for select to authenticated using (true);
create policy providers_insert on public.community_providers
  for insert to authenticated with check (true);
create policy providers_update on public.community_providers
  for update to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('evidence-vault', 'evidence-vault', false)
on conflict (id) do nothing;

create policy evidence_vault_read_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'evidence-vault'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
