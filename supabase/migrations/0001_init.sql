-- ============================================================================
-- FlowBoard — initial schema, RLS, realtime, triggers
-- Run this in the Supabase SQL Editor (or via `supabase db push`).
-- Safe to re-run: every object is created with `if not exists` / `or replace`.
-- ============================================================================

create extension if not exists pgcrypto;

-- ── profiles ────────────────────────────────────────────────────────────────
-- One row per auth user. Auto-created by a trigger on signup (see below).
create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  email        text,
  display_name text,
  avatar_color text default '#6366f1',
  created_at   timestamptz default now()
);

-- ── workspaces ──────────────────────────────────────────────────────────────
create table if not exists public.workspaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'My Workspace',
  owner_id   uuid not null references auth.users on delete cascade,
  created_at timestamptz default now()
);

-- ── workspace_members ───────────────────────────────────────────────────────
-- role: owner | editor | viewer
create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces on delete cascade,
  user_id      uuid not null references auth.users on delete cascade,
  role         text not null default 'editor',
  created_at   timestamptz default now(),
  primary key (workspace_id, user_id)
);

-- ── boards ──────────────────────────────────────────────────────────────────
-- `data` holds the full board document (columns, cards, labels) as JSONB,
-- matching the frontend `Board` type. members/currentUserId are derived from
-- workspace_members at runtime, so they are not authoritative here.
create table if not exists public.boards (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  title        text not null default 'Untitled Board',
  description  text default '',
  data         jsonb not null default '{}'::jsonb,
  updated_at   timestamptz default now(),
  updated_by   uuid references auth.users,
  created_at   timestamptz default now()
);
create index if not exists boards_workspace_idx on public.boards (workspace_id);

-- ── invites ─────────────────────────────────────────────────────────────────
create table if not exists public.invites (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  email        text not null,
  role         text not null default 'editor',
  token        text not null unique default encode(gen_random_bytes(16), 'hex'),
  invited_by   uuid references auth.users,
  accepted     boolean default false,
  created_at   timestamptz default now()
);
create index if not exists invites_email_idx on public.invites (lower(email));

-- ============================================================================
-- Helper functions (SECURITY DEFINER to avoid RLS recursion on membership)
-- ============================================================================

create or replace function public.is_workspace_member(ws uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(ws uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = auth.uid() and role in ('owner', 'editor')
  );
$$;

create or replace function public.is_workspace_owner(ws uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = auth.uid() and role = 'owner'
  );
$$;

-- Accept an invite by token. Validates that the invite exists, is unaccepted,
-- and was issued to the caller's email, then adds the membership and marks the
-- invite accepted. Returns the workspace id. SECURITY DEFINER so it can bypass
-- the (deliberately strict) members_insert policy after validating the token.
create or replace function public.accept_invite(invite_token text)
returns uuid language plpgsql security definer
set search_path = public as $$
declare
  inv public.invites%rowtype;
  caller_email text := lower(auth.jwt() ->> 'email');
begin
  select * into inv from public.invites
  where token = invite_token and accepted = false
  limit 1;

  if inv.id is null then
    raise exception 'Invite not found or already used';
  end if;

  if lower(inv.email) <> caller_email then
    raise exception 'This invite was issued to a different email';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (inv.workspace_id, auth.uid(), inv.role)
  on conflict (workspace_id, user_id) do nothing;

  update public.invites set accepted = true where id = inv.id;

  return inv.workspace_id;
end;
$$;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- When a workspace is created, make its owner an 'owner' member.
create or replace function public.handle_new_workspace()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_workspace_created on public.workspaces;
create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute function public.handle_new_workspace();

-- Keep boards.updated_at fresh on every write.
create or replace function public.touch_board()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists boards_touch on public.boards;
create trigger boards_touch
  before update on public.boards
  for each row execute function public.touch_board();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles          enable row level security;
alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;
alter table public.boards            enable row level security;
alter table public.invites           enable row level security;

-- profiles: anyone authenticated can read profiles (needed to render names/avatars);
-- you can only insert/update your own.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_upsert on public.profiles;
create policy profiles_upsert on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid());

-- workspaces
drop policy if exists workspaces_select on public.workspaces;
create policy workspaces_select on public.workspaces
  for select to authenticated using (public.is_workspace_member(id));

drop policy if exists workspaces_insert on public.workspaces;
create policy workspaces_insert on public.workspaces
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists workspaces_update on public.workspaces;
create policy workspaces_update on public.workspaces
  for update to authenticated using (public.is_workspace_owner(id));

drop policy if exists workspaces_delete on public.workspaces;
create policy workspaces_delete on public.workspaces
  for delete to authenticated using (owner_id = auth.uid());

-- workspace_members
drop policy if exists members_select on public.workspace_members;
create policy members_select on public.workspace_members
  for select to authenticated using (public.is_workspace_member(workspace_id));

-- Only an owner may add members directly. Self-join happens exclusively through
-- the validated accept_invite() function below (so nobody can add themselves to
-- an arbitrary workspace just by knowing its id).
drop policy if exists members_insert on public.workspace_members;
create policy members_insert on public.workspace_members
  for insert to authenticated
  with check (public.is_workspace_owner(workspace_id));

drop policy if exists members_update on public.workspace_members;
create policy members_update on public.workspace_members
  for update to authenticated using (public.is_workspace_owner(workspace_id));

drop policy if exists members_delete on public.workspace_members;
create policy members_delete on public.workspace_members
  for delete to authenticated
  using (user_id = auth.uid() or public.is_workspace_owner(workspace_id));

-- boards
drop policy if exists boards_select on public.boards;
create policy boards_select on public.boards
  for select to authenticated using (public.is_workspace_member(workspace_id));

drop policy if exists boards_insert on public.boards;
create policy boards_insert on public.boards
  for insert to authenticated with check (public.is_workspace_admin(workspace_id));

drop policy if exists boards_update on public.boards;
create policy boards_update on public.boards
  for update to authenticated using (public.is_workspace_admin(workspace_id));

drop policy if exists boards_delete on public.boards;
create policy boards_delete on public.boards
  for delete to authenticated using (public.is_workspace_owner(workspace_id));

-- invites: members can read; admins (owner/editor) can create; the invited user
-- (matched by email) or an admin can update (accept) / delete.
drop policy if exists invites_select on public.invites;
create policy invites_select on public.invites
  for select to authenticated
  using (
    public.is_workspace_member(workspace_id)
    or lower(email) = lower((auth.jwt() ->> 'email'))
  );

drop policy if exists invites_insert on public.invites;
create policy invites_insert on public.invites
  for insert to authenticated with check (public.is_workspace_admin(workspace_id));

drop policy if exists invites_update on public.invites;
create policy invites_update on public.invites
  for update to authenticated
  using (
    public.is_workspace_admin(workspace_id)
    or lower(email) = lower((auth.jwt() ->> 'email'))
  );

drop policy if exists invites_delete on public.invites;
create policy invites_delete on public.invites
  for delete to authenticated using (public.is_workspace_admin(workspace_id));

-- ============================================================================
-- Realtime — broadcast board row changes to subscribed clients
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'boards'
  ) then
    alter publication supabase_realtime add table public.boards;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'workspace_members'
  ) then
    alter publication supabase_realtime add table public.workspace_members;
  end if;
end $$;
