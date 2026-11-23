-- ============================================================================
-- Aplicativo de Casal (Nós Dois) — Esquema Inicial do Supabase (PostgreSQL)
-- Compatível com Supabase Auth, RLS, Realtime e Storage
-- ============================================================================

-- Extensões úteis
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ============================================================================
-- 1. ENUMS
-- ============================================================================
do $$ begin
  create type public.relationship_status as enum (
    'dating',           -- Namorados
    'engaged',          -- Noivos
    'married',          -- Casados
    'living_together'   -- Morando juntos
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invite_status as enum (
    'pending',
    'accepted',
    'declined',
    'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_recurrence as enum (
    'once',
    'daily',
    'weekly',
    'biweekly',
    'monthly'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.dengo_kind as enum (
    'emoji_reaction',
    'drawing',
    'care_request'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.care_response_status as enum (
    'pending',
    'on_my_way',        -- ESTOU INDO
    'cant_now'          -- NÃO CONSIGO AGORA
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.expense_split_type as enum (
    'equal',
    'full_partner',
    'custom'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.renovation_item_status as enum (
    'to_quote',
    'to_buy',
    'priority',
    'purchased'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.event_category as enum (
    'show_festival',
    'party_birthday',
    'kids_school',
    'date_night',
    'travel',
    'health_appointment',
    'custom'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.cycle_phase as enum (
    'menstrual',
    'follicular',
    'ovulation',
    'luteal'
  );
exception when duplicate_object then null; end $$;

-- ============================================================================
-- 2. FUNÇÃO UTILITÁRIA DE UPDATED_AT
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ============================================================================
-- 3. AUTENTICAÇÃO, PERFIS E VÍNCULO DO CASAL (couple_id)
-- ============================================================================

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  member_one_id uuid not null references auth.users(id) on delete cascade,
  member_two_id uuid not null references auth.users(id) on delete cascade,
  relationship_status public.relationship_status not null default 'dating',
  started_at timestamptz not null default timezone('utc', now()),
  about_answers jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  unlinked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint couples_distinct_members check (member_one_id <> member_two_id)
);

-- Garante apenas 1 vínculo ativo por usuário por vez
create unique index if not exists idx_couples_active_member_one
  on public.couples (member_one_id)
  where is_active = true;

create unique index if not exists idx_couples_active_member_two
  on public.couples (member_two_id)
  where is_active = true;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  username citext unique,
  email text not null,
  avatar_url text,
  couple_id uuid references public.couples(id) on delete set null,
  vault_pin_hash text,
  biometrics_enabled boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_username_format check (
    username is null
    or (username::text ~ '^[a-z0-9._]{3,24}$')
  )
);

create index if not exists idx_profiles_couple_id on public.profiles (couple_id);
create index if not exists idx_profiles_username on public.profiles (username);

create table if not exists public.couple_invites (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid references public.profiles(id) on delete cascade,
  invite_code text unique,
  status public.invite_status not null default 'pending',
  expires_at timestamptz default (timezone('utc', now()) + interval '24 hours'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint couple_invites_not_self check (receiver_id is null or sender_id <> receiver_id),
  constraint couple_invites_target_or_code check (receiver_id is not null or invite_code is not null),
  constraint couple_invites_code_format check (
    invite_code is null
    or invite_code ~ '^[A-Z0-9]{6}$'
  )
);

create index if not exists idx_couple_invites_sender on public.couple_invites (sender_id, status);
create index if not exists idx_couple_invites_receiver on public.couple_invites (receiver_id, status);
create index if not exists idx_couple_invites_code on public.couple_invites (invite_code) where status = 'pending';

-- ============================================================================
-- 4. ABA 2: TAREFAS — ROTINAS DE CASA E ROTINAS DA RELAÇÃO (DENGO)
-- ============================================================================

create table if not exists public.household_tasks (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null,
  notes text,
  recurrence public.task_recurrence not null default 'once',
  assigned_to uuid references public.profiles(id) on delete set null,
  is_completed boolean not null default false,
  completed_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  due_date date,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_household_tasks_couple on public.household_tasks (couple_id, is_completed, due_date);

create table if not exists public.dengo_shortcuts (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  emoji text not null,
  label text not null,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_dengo_shortcuts_couple on public.dengo_shortcuts (couple_id, sort_order);

create table if not exists public.dengo_care_buttons (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  emoji text not null default '🤍',
  label text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_dengo_care_buttons_couple on public.dengo_care_buttons (couple_id, sort_order);

create table if not exists public.dengo_interactions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  kind public.dengo_kind not null,
  emoji text,
  label text,
  message text,
  drawing_url text,
  care_status public.care_response_status,
  responded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_dengo_interactions_couple on public.dengo_interactions (couple_id, created_at desc);

create table if not exists public.daily_moods (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  mood_date date not null default current_date,
  mood_key text not null,
  mood_emoji text not null,
  note text,
  care_suggestions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (couple_id, user_id, mood_date)
);

create index if not exists idx_daily_moods_couple_date on public.daily_moods (couple_id, mood_date desc);

-- ============================================================================
-- 5. ABA 3: LISTAS — DESPESAS, DESPENSA, LISTA DE COMPRA E MODO OBRA
-- ============================================================================

create table if not exists public.renovation_rooms (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  name text not null,
  icon text not null default 'home-outline',
  budget_cents integer,
  sort_order integer not null default 0,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_renovation_rooms_couple on public.renovation_rooms (couple_id, sort_order);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null,
  amount_cents integer not null check (amount_cents > 0),
  paid_by uuid not null references public.profiles(id) on delete cascade,
  split_type public.expense_split_type not null default 'equal',
  partner_share_cents integer,
  category text not null default 'Geral',
  expense_date date not null default current_date,
  notes text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_expenses_couple_date on public.expenses (couple_id, expense_date desc);

create table if not exists public.renovation_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  room_id uuid not null references public.renovation_rooms(id) on delete cascade,
  name text not null,
  status public.renovation_item_status not null default 'to_quote',
  estimated_cents integer,
  actual_cents integer,
  store_name text,
  product_url text,
  notes text,
  linked_expense_id uuid references public.expenses(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_renovation_items_room on public.renovation_items (couple_id, room_id, status);

create table if not exists public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  name text not null,
  quantity numeric(10, 2) not null default 1,
  unit text not null default 'un',
  category text not null default 'Geral',
  in_stock boolean not null default true,
  low_stock boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_pantry_items_couple on public.pantry_items (couple_id, in_stock, name);

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  name text not null,
  quantity text,
  category text not null default 'Mercado',
  is_checked boolean not null default false,
  checked_by uuid references public.profiles(id) on delete set null,
  checked_at timestamptz,
  source_pantry_item_id uuid references public.pantry_items(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_shopping_items_couple on public.shopping_items (couple_id, is_checked, created_at desc);

-- ============================================================================
-- 6. ABA 4: CALENDÁRIO, MEMÓRIAS, SHOWS, SINTONIA DO CICLO E COFRE EFÊMERO
-- ============================================================================

create table if not exists public.couple_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null,
  category public.event_category not null default 'date_night',
  custom_category_label text,
  artist_name text,
  venue text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  is_special_countdown boolean not null default false,
  attendee_ids uuid[] not null default '{}'::uuid[],
  notes text,
  cover_photo_url text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_couple_events_couple_starts on public.couple_events (couple_id, starts_at);
create index if not exists idx_couple_events_shows on public.couple_events (couple_id, category, starts_at)
  where category = 'show_festival';

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  event_id uuid references public.couple_events(id) on delete set null,
  title text not null,
  caption text,
  memory_date date not null default current_date,
  location text,
  photo_urls text[] not null default '{}'::text[],
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_memories_couple_date on public.memories (couple_id, memory_date desc);

create table if not exists public.cycle_entries (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_date date not null default current_date,
  phase public.cycle_phase not null,
  intimacy_level smallint check (intimacy_level between 1 and 5),
  care_notes text,
  symptoms text[] not null default '{}'::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (couple_id, user_id, entry_date)
);

create index if not exists idx_cycle_entries_couple on public.cycle_entries (couple_id, entry_date desc);

create table if not exists public.date_requests (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  details text,
  is_fulfilled boolean not null default false,
  fulfilled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_date_requests_couple on public.date_requests (couple_id, is_fulfilled, created_at desc);

-- Cofre Protegido por PIN/Biometria: recado quente efêmero excluído definitivamente ao fechar a leitura
create table if not exists public.ephemeral_vault_notes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint ephemeral_vault_not_self check (sender_id <> receiver_id)
);

create index if not exists idx_ephemeral_vault_receiver on public.ephemeral_vault_notes (couple_id, receiver_id, created_at desc);

-- ============================================================================
-- 7. TRIGGERS DE UPDATED_AT E CRIAÇÃO AUTOMÁTICA DE PERFIL
-- ============================================================================

drop trigger if exists trg_couples_updated_at on public.couples;
create trigger trg_couples_updated_at before update on public.couples
  for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_couple_invites_updated_at on public.couple_invites;
create trigger trg_couple_invites_updated_at before update on public.couple_invites
  for each row execute function public.set_updated_at();

drop trigger if exists trg_household_tasks_updated_at on public.household_tasks;
create trigger trg_household_tasks_updated_at before update on public.household_tasks
  for each row execute function public.set_updated_at();

drop trigger if exists trg_dengo_care_buttons_updated_at on public.dengo_care_buttons;
create trigger trg_dengo_care_buttons_updated_at before update on public.dengo_care_buttons
  for each row execute function public.set_updated_at();

drop trigger if exists trg_daily_moods_updated_at on public.daily_moods;
create trigger trg_daily_moods_updated_at before update on public.daily_moods
  for each row execute function public.set_updated_at();

drop trigger if exists trg_renovation_rooms_updated_at on public.renovation_rooms;
create trigger trg_renovation_rooms_updated_at before update on public.renovation_rooms
  for each row execute function public.set_updated_at();

drop trigger if exists trg_expenses_updated_at on public.expenses;
create trigger trg_expenses_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();

drop trigger if exists trg_renovation_items_updated_at on public.renovation_items;
create trigger trg_renovation_items_updated_at before update on public.renovation_items
  for each row execute function public.set_updated_at();

drop trigger if exists trg_pantry_items_updated_at on public.pantry_items;
create trigger trg_pantry_items_updated_at before update on public.pantry_items
  for each row execute function public.set_updated_at();

drop trigger if exists trg_shopping_items_updated_at on public.shopping_items;
create trigger trg_shopping_items_updated_at before update on public.shopping_items
  for each row execute function public.set_updated_at();

drop trigger if exists trg_couple_events_updated_at on public.couple_events;
create trigger trg_couple_events_updated_at before update on public.couple_events
  for each row execute function public.set_updated_at();

drop trigger if exists trg_memories_updated_at on public.memories;
create trigger trg_memories_updated_at before update on public.memories
  for each row execute function public.set_updated_at();

drop trigger if exists trg_cycle_entries_updated_at on public.cycle_entries;
create trigger trg_cycle_entries_updated_at before update on public.cycle_entries
  for each row execute function public.set_updated_at();

drop trigger if exists trg_date_requests_updated_at on public.date_requests;
create trigger trg_date_requests_updated_at before update on public.date_requests
  for each row execute function public.set_updated_at();

-- Cria automaticamente linha em public.profiles ao cadastrar usuário no Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raw_username text;
  v_clean_username text;
  v_full_name text;
begin
  v_raw_username := nullif(trim(coalesce(new.raw_user_meta_data ->> 'username', '')), '');
  if v_raw_username is not null then
    v_clean_username := lower(regexp_replace(v_raw_username, '^@+', ''));
  end if;

  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(new.email, 'usuario'), '@', 1)
  );

  insert into public.profiles (id, full_name, username, email, avatar_url)
  values (
    new.id,
    v_full_name,
    v_clean_username,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 8. HELPERS DE SEGURANÇA & RPCS DE NEGÓCIO
-- ============================================================================

-- Retorna o couple_id ativo do usuário autenticado
create or replace function public.current_couple_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select couple_id from public.profiles where id = auth.uid();
$$;

-- Semente automática de atalhos de Dengo e botões de Pedir Dengo ao vincular um casal
create or replace function public.seed_couple_defaults(p_couple_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.dengo_shortcuts (couple_id, emoji, label, is_default, sort_order)
  values
    (p_couple_id, '😘', 'Beijo', true, 1),
    (p_couple_id, '🫂', 'Abraço', true, 2),
    (p_couple_id, '😤', 'Raivinha', true, 3),
    (p_couple_id, '🧹', 'Vai varrer', true, 4)
  on conflict do nothing;

  insert into public.dengo_care_buttons (couple_id, emoji, label, sort_order)
  values
    (p_couple_id, '🔥', 'Bolsa quente', 1),
    (p_couple_id, '💊', 'Remédio', 2),
    (p_couple_id, '🤍', 'Fique comigo', 3),
    (p_couple_id, '🌙', 'Preciso ficar sozinha', 4)
  on conflict do nothing;
end;
$$;

-- Verifica disponibilidade de @usuario único
create or replace function public.is_username_available(p_username text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean text := lower(regexp_replace(trim(coalesce(p_username, '')), '^@+', ''));
begin
  if v_clean !~ '^[a-z0-9._]{3,24}$' then
    return false;
  end if;

  return not exists (
    select 1
    from public.profiles
    where username = v_clean
      and (auth.uid() is null or id <> auth.uid())
  );
end;
$$;

-- Busca pública segura por @usuario (sem expor e-mail ou dados sensíveis)
create or replace function public.search_user_by_username(p_username text)
returns table (
  id uuid,
  full_name text,
  username text,
  avatar_url text,
  has_couple boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean text := lower(regexp_replace(trim(coalesce(p_username, '')), '^@+', ''));
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.username::text,
    p.avatar_url,
    (p.couple_id is not null) as has_couple
  from public.profiles p
  where p.username = v_clean
    and p.id <> auth.uid()
  limit 1;
end;
$$;

-- Opção 1 de Vínculo: Enviar convite pelo @usuario
create or replace function public.send_couple_invite_by_username(p_username text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_my_couple uuid;
  v_target record;
  v_invite_id uuid;
  v_clean text := lower(regexp_replace(trim(coalesce(p_username, '')), '^@+', ''));
begin
  if v_me is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select couple_id into v_my_couple from public.profiles where id = v_me;
  if v_my_couple is not null then
    raise exception 'Você já possui um vínculo ativo.';
  end if;

  select id, couple_id into v_target
  from public.profiles
  where username = v_clean;

  if v_target.id is null then
    raise exception 'Nenhum usuário encontrado com @%.', v_clean;
  end if;

  if v_target.id = v_me then
    raise exception 'Você não pode enviar um convite para si mesmo.';
  end if;

  if v_target.couple_id is not null then
    raise exception 'Este usuário já está vinculado a outro par.';
  end if;

  -- Evita duplicar convite pendente para a mesma pessoa
  if exists (
    select 1 from public.couple_invites
    where sender_id = v_me
      and receiver_id = v_target.id
      and status = 'pending'
  ) then
    raise exception 'Já existe um convite pendente para @%.', v_clean;
  end if;

  insert into public.couple_invites (sender_id, receiver_id, status)
  values (v_me, v_target.id, 'pending')
  returning id into v_invite_id;

  return v_invite_id;
end;
$$;

-- Aceitar ou Recusar convite recebido (criação atômica do couple_id)
create or replace function public.respond_couple_invite(p_invite_id uuid, p_accept boolean)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_invite record;
  v_sender_couple uuid;
  v_receiver_couple uuid;
  v_couple_id uuid;
begin
  if v_me is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select * into v_invite
  from public.couple_invites
  where id = p_invite_id
    and receiver_id = v_me
    and status = 'pending'
  for update;

  if v_invite.id is null then
    raise exception 'Convite não encontrado ou já respondido.';
  end if;

  if not p_accept then
    update public.couple_invites
    set status = 'declined'
    where id = p_invite_id;
    return null;
  end if;

  select couple_id into v_sender_couple from public.profiles where id = v_invite.sender_id for update;
  select couple_id into v_receiver_couple from public.profiles where id = v_me for update;

  if v_sender_couple is not null or v_receiver_couple is not null then
    raise exception 'Um dos usuários já possui vínculo ativo.';
  end if;

  insert into public.couples (member_one_id, member_two_id)
  values (v_invite.sender_id, v_me)
  returning id into v_couple_id;

  update public.profiles
  set couple_id = v_couple_id
  where id in (v_invite.sender_id, v_me);

  update public.couple_invites
  set status = 'accepted'
  where id = p_invite_id;

  -- Cancela demais convites pendentes de ambos
  update public.couple_invites
  set status = 'cancelled'
  where id <> p_invite_id
    and status = 'pending'
    and (
      sender_id in (v_invite.sender_id, v_me)
      or receiver_id in (v_invite.sender_id, v_me)
    );

  perform public.seed_couple_defaults(v_couple_id);

  return v_couple_id;
end;
$$;

-- Opção 2 de Vínculo: Gerar código curto de 6 caracteres (sem caracteres ambíguos)
create or replace function public.generate_couple_invite_code()
returns table (
  invite_id uuid,
  code text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_my_couple uuid;
  v_chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_expires timestamptz := timezone('utc', now()) + interval '24 hours';
  v_id uuid;
  v_attempt int := 0;
  v_i int;
begin
  if v_me is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select couple_id into v_my_couple from public.profiles where id = v_me;
  if v_my_couple is not null then
    raise exception 'Você já possui um vínculo ativo.';
  end if;

  -- Cancela códigos anteriores pendentes do mesmo remetente
  update public.couple_invites
  set status = 'cancelled'
  where sender_id = v_me
    and receiver_id is null
    and invite_code is not null
    and status = 'pending';

  loop
    v_attempt := v_attempt + 1;
    v_code := '';
    for v_i in 1..6 loop
      v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
    end loop;

    exit when not exists (
      select 1 from public.couple_invites where invite_code = v_code
    );

    if v_attempt > 20 then
      raise exception 'Não foi possível gerar código único. Tente novamente.';
    end if;
  end loop;

  insert into public.couple_invites (sender_id, invite_code, status, expires_at)
  values (v_me, v_code, 'pending', v_expires)
  returning id into v_id;

  return query select v_id, v_code, v_expires;
end;
$$;

-- Opção 2 de Vínculo: Digitar código de 6 caracteres para conectar instantaneamente
create or replace function public.redeem_couple_invite_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_clean_code text := upper(regexp_replace(trim(coalesce(p_code, '')), '[^A-Za-z0-9]', '', 'g'));
  v_invite record;
  v_sender_couple uuid;
  v_my_couple uuid;
  v_couple_id uuid;
begin
  if v_me is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if length(v_clean_code) <> 6 then
    raise exception 'O código deve conter exatamente 6 caracteres.';
  end if;

  select * into v_invite
  from public.couple_invites
  where invite_code = v_clean_code
    and status = 'pending'
  for update;

  if v_invite.id is null then
    raise exception 'Código inválido ou já utilizado.';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < timezone('utc', now()) then
    update public.couple_invites set status = 'cancelled' where id = v_invite.id;
    raise exception 'Este código expirou. Peça um novo código ao seu par.';
  end if;

  if v_invite.sender_id = v_me then
    raise exception 'Você não pode usar o seu próprio código de convite.';
  end if;

  select couple_id into v_sender_couple from public.profiles where id = v_invite.sender_id for update;
  select couple_id into v_my_couple from public.profiles where id = v_me for update;

  if v_sender_couple is not null or v_my_couple is not null then
    raise exception 'Um dos usuários já possui vínculo ativo.';
  end if;

  insert into public.couples (member_one_id, member_two_id)
  values (v_invite.sender_id, v_me)
  returning id into v_couple_id;

  update public.profiles
  set couple_id = v_couple_id
  where id in (v_invite.sender_id, v_me);

  update public.couple_invites
  set status = 'accepted',
      receiver_id = v_me
  where id = v_invite.id;

  update public.couple_invites
  set status = 'cancelled'
  where id <> v_invite.id
    and status = 'pending'
    and (
      sender_id in (v_invite.sender_id, v_me)
      or receiver_id in (v_invite.sender_id, v_me)
    );

  perform public.seed_couple_defaults(v_couple_id);

  return v_couple_id;
end;
$$;

-- Desvincular casal (Perfil do Casal)
create or replace function public.unlink_couple()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_couple_id uuid;
begin
  if v_me is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select couple_id into v_couple_id from public.profiles where id = v_me;
  if v_couple_id is null then
    return;
  end if;

  update public.couples
  set is_active = false,
      unlinked_at = timezone('utc', now())
  where id = v_couple_id;

  update public.profiles
  set couple_id = null
  where couple_id = v_couple_id;
end;
$$;

-- Despensa -> "Acabou → Enviar para Lista de Compra"
create or replace function public.move_pantry_item_to_shopping(p_pantry_item_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_couple_id uuid := public.current_couple_id();
  v_pantry record;
  v_shopping_id uuid;
begin
  if v_me is null or v_couple_id is null then
    raise exception 'Usuário não vinculado a um casal.';
  end if;

  select * into v_pantry
  from public.pantry_items
  where id = p_pantry_item_id
    and couple_id = v_couple_id;

  if v_pantry.id is null then
    raise exception 'Item de despensa não encontrado.';
  end if;

  update public.pantry_items
  set in_stock = false,
      quantity = 0,
      updated_by = v_me
  where id = p_pantry_item_id;

  insert into public.shopping_items (
    couple_id, name, category, source_pantry_item_id, created_by
  )
  values (
    v_couple_id, v_pantry.name, v_pantry.category, v_pantry.id, v_me
  )
  returning id into v_shopping_id;

  return v_shopping_id;
end;
$$;

-- Ranking automático de artistas mais vistos (visão do Casal ou Individual)
create or replace function public.get_artist_show_ranking(p_user_id uuid default null)
returns table (
  artist_name text,
  shows_count bigint,
  last_show_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    trim(e.artist_name) as artist_name,
    count(*)::bigint as shows_count,
    max(e.starts_at) as last_show_at
  from public.couple_events e
  where e.couple_id = public.current_couple_id()
    and e.category = 'show_festival'
    and e.starts_at < timezone('utc', now())
    and nullif(trim(coalesce(e.artist_name, '')), '') is not null
    and (
      p_user_id is null
      or cardinality(e.attendee_ids) = 0
      or p_user_id = any(e.attendee_ids)
    )
  group by trim(e.artist_name)
  order by shows_count desc, last_show_at desc;
$$;

-- Exclusão definitiva do recado quente efêmero ao fechar/sair da tela de leitura
create or replace function public.delete_ephemeral_vault_note(p_note_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.ephemeral_vault_notes
  where id = p_note_id
    and receiver_id = auth.uid()
    and couple_id = public.current_couple_id();
end;
$$;

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS) — ISOLAMENTO POR couple_id
-- ============================================================================

alter table public.couples enable row level security;
alter table public.profiles enable row level security;
alter table public.couple_invites enable row level security;
alter table public.household_tasks enable row level security;
alter table public.dengo_shortcuts enable row level security;
alter table public.dengo_care_buttons enable row level security;
alter table public.dengo_interactions enable row level security;
alter table public.daily_moods enable row level security;
alter table public.renovation_rooms enable row level security;
alter table public.expenses enable row level security;
alter table public.renovation_items enable row level security;
alter table public.pantry_items enable row level security;
alter table public.shopping_items enable row level security;
alter table public.couple_events enable row level security;
alter table public.memories enable row level security;
alter table public.cycle_entries enable row level security;
alter table public.date_requests enable row level security;
alter table public.ephemeral_vault_notes enable row level security;

-- PROFILES: vê próprio perfil, perfil do par no mesmo casal ou perfis ligados a convites pendentes
drop policy if exists "profiles_select_own_or_partner" on public.profiles;
create policy "profiles_select_own_or_partner" on public.profiles
  for select using (
    id = auth.uid()
    or (couple_id is not null and couple_id = public.current_couple_id())
    or exists (
      select 1 from public.couple_invites ci
      where ci.status = 'pending'
        and (
          (ci.sender_id = auth.uid() and ci.receiver_id = profiles.id)
          or (ci.receiver_id = auth.uid() and ci.sender_id = profiles.id)
        )
    )
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- COUPLES
drop policy if exists "couples_select_members" on public.couples;
create policy "couples_select_members" on public.couples
  for select using (
    id = public.current_couple_id()
    and (member_one_id = auth.uid() or member_two_id = auth.uid())
  );

drop policy if exists "couples_update_members" on public.couples;
create policy "couples_update_members" on public.couples
  for update using (
    id = public.current_couple_id()
    and (member_one_id = auth.uid() or member_two_id = auth.uid())
  );

-- COUPLE INVITES
drop policy if exists "couple_invites_select_participants" on public.couple_invites;
create policy "couple_invites_select_participants" on public.couple_invites
  for select using (sender_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists "couple_invites_update_sender_cancel" on public.couple_invites;
create policy "couple_invites_update_sender_cancel" on public.couple_invites
  for update using (sender_id = auth.uid())
  with check (sender_id = auth.uid() and status = 'cancelled');

-- TABELAS DE MÓDULOS DO CASAL (escopo estrito por couple_id)
drop policy if exists "household_tasks_couple_all" on public.household_tasks;
create policy "household_tasks_couple_all" on public.household_tasks
  for all using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

drop policy if exists "dengo_shortcuts_couple_all" on public.dengo_shortcuts;
create policy "dengo_shortcuts_couple_all" on public.dengo_shortcuts
  for all using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

drop policy if exists "dengo_care_buttons_couple_all" on public.dengo_care_buttons;
create policy "dengo_care_buttons_couple_all" on public.dengo_care_buttons
  for all using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

drop policy if exists "dengo_interactions_couple_all" on public.dengo_interactions;
create policy "dengo_interactions_couple_all" on public.dengo_interactions
  for all using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

drop policy if exists "daily_moods_couple_all" on public.daily_moods;
create policy "daily_moods_couple_all" on public.daily_moods
  for all using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

drop policy if exists "renovation_rooms_couple_all" on public.renovation_rooms;
create policy "renovation_rooms_couple_all" on public.renovation_rooms
  for all using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

drop policy if exists "expenses_couple_all" on public.expenses;
create policy "expenses_couple_all" on public.expenses
  for all using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

drop policy if exists "renovation_items_couple_all" on public.renovation_items;
create policy "renovation_items_couple_all" on public.renovation_items
  for all using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

drop policy if exists "pantry_items_couple_all" on public.pantry_items;
create policy "pantry_items_couple_all" on public.pantry_items
  for all using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

drop policy if exists "shopping_items_couple_all" on public.shopping_items;
create policy "shopping_items_couple_all" on public.shopping_items
  for all using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

drop policy if exists "couple_events_couple_all" on public.couple_events;
create policy "couple_events_couple_all" on public.couple_events
  for all using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

drop policy if exists "memories_couple_all" on public.memories;
create policy "memories_couple_all" on public.memories
  for all using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

drop policy if exists "cycle_entries_couple_all" on public.cycle_entries;
create policy "cycle_entries_couple_all" on public.cycle_entries
  for all using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

drop policy if exists "date_requests_couple_all" on public.date_requests;
create policy "date_requests_couple_all" on public.date_requests
  for all using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

-- COFRE EFÊMERO: remetente só insere; destinatário lê e exclui definitivamente
drop policy if exists "ephemeral_vault_insert_sender" on public.ephemeral_vault_notes;
create policy "ephemeral_vault_insert_sender" on public.ephemeral_vault_notes
  for insert with check (
    couple_id = public.current_couple_id()
    and sender_id = auth.uid()
    and receiver_id <> auth.uid()
  );

drop policy if exists "ephemeral_vault_select_receiver" on public.ephemeral_vault_notes;
create policy "ephemeral_vault_select_receiver" on public.ephemeral_vault_notes
  for select using (
    couple_id = public.current_couple_id()
    and receiver_id = auth.uid()
  );

drop policy if exists "ephemeral_vault_delete_receiver" on public.ephemeral_vault_notes;
create policy "ephemeral_vault_delete_receiver" on public.ephemeral_vault_notes
  for delete using (
    couple_id = public.current_couple_id()
    and receiver_id = auth.uid()
  );

-- ============================================================================
-- 10. SUPABASE REALTIME
-- ============================================================================
do $$
declare
  tbl text;
  realtime_tables text[] := array[
    'profiles',
    'couples',
    'couple_invites',
    'household_tasks',
    'dengo_interactions',
    'daily_moods',
    'shopping_items',
    'pantry_items',
    'expenses',
    'renovation_items',
    'couple_events',
    'ephemeral_vault_notes'
  ];
begin
  foreach tbl in array realtime_tables loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;

-- ============================================================================
-- 11. SUPABASE STORAGE (Avatares, Memórias/Shows e Desenhos do Mural)
-- ============================================================================
insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('memories', 'memories', false),
  ('dengo-drawings', 'dengo-drawings', false)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_write" on storage.objects;
create policy "avatars_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "couple_media_read" on storage.objects;
create policy "couple_media_read" on storage.objects
  for select using (
    bucket_id in ('memories', 'dengo-drawings')
    and public.current_couple_id()::text = (storage.foldername(name))[1]
  );

drop policy if exists "couple_media_write" on storage.objects;
create policy "couple_media_write" on storage.objects
  for insert with check (
    bucket_id in ('memories', 'dengo-drawings')
    and public.current_couple_id()::text = (storage.foldername(name))[1]
  );
