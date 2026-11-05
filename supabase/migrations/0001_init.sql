-- BRAND GENIUS — initial schema
--
-- Every table is owner-scoped and protected by RLS. The generation endpoints
-- call a paid model API, so `generation_events` doubles as the audit log and
-- the rate-limit ledger (see `enforce_generation_quota`).

create extension if not exists "pgcrypto";

/* -------------------------------------------------------------------------- */
/*  Organisations                                                             */
/* -------------------------------------------------------------------------- */

create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  plan        text not null default 'free'
              check (plan in ('free', 'pro', 'studio')),
  created_at  timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null default 'member'
                  check (role in ('owner', 'admin', 'member')),
  created_at      timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index if not exists organization_members_user_idx
  on public.organization_members (user_id);

/* -------------------------------------------------------------------------- */
/*  Brand projects                                                            */
/* -------------------------------------------------------------------------- */

create table if not exists public.projects (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  name            text not null check (char_length(name) between 1 and 120),
  industry        text not null default '',
  keywords        text not null default '',
  audience        text not null default '',
  mode            text not null default 'generate_logo'
                  check (mode in ('generate_logo', 'import_logo', 'guide_only')),
  status          text not null default 'draft'
                  check (status in ('draft', 'guide_generated', 'complete')),
  -- The full BrandGuide object produced by the pipeline.
  guide           jsonb,
  -- Path in the `brand-assets` storage bucket for an imported logo.
  imported_logo_path text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists projects_owner_updated_idx
  on public.projects (owner_id, updated_at desc);

create index if not exists projects_organization_idx
  on public.projects (organization_id);

/* -------------------------------------------------------------------------- */
/*  Generation ledger — audit trail and rate-limit source of truth            */
/* -------------------------------------------------------------------------- */

create table if not exists public.generation_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete cascade,
  kind        text not null
              check (kind in ('directions', 'guide', 'logo', 'palette',
                              'typography', 'mockups', 'export')),
  status      text not null default 'started'
              check (status in ('started', 'succeeded', 'failed')),
  error       text,
  created_at  timestamptz not null default now()
);

create index if not exists generation_events_user_window_idx
  on public.generation_events (user_id, created_at desc);

/* -------------------------------------------------------------------------- */
/*  updated_at maintenance                                                    */
/* -------------------------------------------------------------------------- */

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();

/* -------------------------------------------------------------------------- */
/*  Rate limiting                                                             */
/* -------------------------------------------------------------------------- */

-- Server-side quota check. Runs as the caller (invoker rights) so it can never
-- be used to read another user's ledger.
create or replace function public.generation_count_since(window_start timestamptz)
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::int
  from public.generation_events
  where user_id = auth.uid()
    and created_at >= window_start
    and status <> 'failed';
$$;

/* -------------------------------------------------------------------------- */
/*  Row Level Security                                                        */
/* -------------------------------------------------------------------------- */

alter table public.organizations        enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects             enable row level security;
alter table public.generation_events    enable row level security;

-- Membership lookup used by the organisation policies. SECURITY DEFINER so the
-- policy on organization_members cannot recurse into itself.
create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = org
      and m.user_id = auth.uid()
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;

-- Organisations: visible to members only.
drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

drop policy if exists organizations_insert on public.organizations;
create policy organizations_insert on public.organizations
  for insert to authenticated
  with check (true);

drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations
  for update to authenticated
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

-- Membership rows: a user sees their own rows and those of orgs they belong to.
drop policy if exists organization_members_select on public.organization_members;
create policy organization_members_select on public.organization_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(organization_id));

drop policy if exists organization_members_write on public.organization_members;
create policy organization_members_write on public.organization_members
  for all to authenticated
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = organization_members.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = organization_members.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

-- Projects: owner has full control; org members get read access.
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select to authenticated
  using (
    owner_id = auth.uid()
    or (organization_id is not null and public.is_org_member(organization_id))
  );

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects
  for delete to authenticated
  using (owner_id = auth.uid());

-- Generation ledger: strictly own-rows. No update or delete policy exists, so
-- the audit trail is append-only from the client's perspective.
drop policy if exists generation_events_select on public.generation_events;
create policy generation_events_select on public.generation_events
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists generation_events_insert on public.generation_events;
create policy generation_events_insert on public.generation_events
  for insert to authenticated
  with check (user_id = auth.uid());

/* -------------------------------------------------------------------------- */
/*  Storage                                                                   */
/* -------------------------------------------------------------------------- */

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand-assets',
  'brand-assets',
  false,
  5242880, -- 5 MB
  array['image/svg+xml', 'image/png', 'image/jpeg', 'application/pdf']
)
on conflict (id) do nothing;

-- Objects live under `<user-id>/<project-id>/<filename>`, so the first path
-- segment is the ownership check.
drop policy if exists brand_assets_read on storage.objects;
create policy brand_assets_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists brand_assets_insert on storage.objects;
create policy brand_assets_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists brand_assets_update on storage.objects;
create policy brand_assets_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists brand_assets_delete on storage.objects;
create policy brand_assets_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
