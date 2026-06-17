create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.beds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  label text not null,
  sort_order integer not null,
  status text not null default 'empty'
    check (status in ('empty', 'in_treatment', 'waiting', 'reanesthesia_waiting', 'reanesthesia_bed')),
  status_started_at timestamptz,
  customer_name text,
  treatment_name text,
  prescription_status text not null default 'none'
    check (prescription_status in ('none', 'pending', 'done')),
  postpay_status text not null default 'none'
    check (postpay_status in ('none', 'pending', 'done')),
  memo text,
  updated_at timestamptz not null default now(),
  unique (room_id, label)
);

create table if not exists public.admin_settings (
  id integer primary key default 1 check (id = 1),
  pin_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.rooms enable row level security;
alter table public.beds enable row level security;
alter table public.admin_settings enable row level security;

revoke all on table public.rooms from anon, authenticated;
revoke all on table public.beds from anon, authenticated;
grant select on table public.rooms to anon, authenticated;
grant select on table public.beds to anon, authenticated;

drop policy if exists "public can read rooms" on public.rooms;
create policy "public can read rooms"
on public.rooms for select
to anon, authenticated
using (true);

drop policy if exists "public can read beds" on public.beds;
create policy "public can read beds"
on public.beds for select
to anon, authenticated
using (true);

create or replace function public.touch_bed_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists beds_touch_updated_at on public.beds;
create trigger beds_touch_updated_at
before update on public.beds
for each row execute function public.touch_bed_updated_at();

create or replace function public.assert_admin_pin(p_pin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pin_hash text;
begin
  select pin_hash into v_pin_hash from public.admin_settings where id = 1;

  if v_pin_hash is null or crypt(coalesce(p_pin, ''), v_pin_hash) <> v_pin_hash then
    raise exception 'invalid admin pin' using errcode = '28000';
  end if;
end;
$$;

create or replace function public.set_bed_status(p_bed_id uuid, p_next_status text)
returns public.beds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bed public.beds;
begin
  if p_next_status not in ('empty', 'in_treatment', 'waiting', 'reanesthesia_waiting', 'reanesthesia_bed') then
    raise exception 'invalid bed status: %', p_next_status using errcode = '22023';
  end if;

  if p_next_status = 'empty' then
    update public.beds
    set status = p_next_status,
        status_started_at = now(),
        customer_name = null,
        treatment_name = null,
        prescription_status = 'none',
        postpay_status = 'none',
        memo = null
    where id = p_bed_id
    returning * into v_bed;
  else
    update public.beds
    set status = p_next_status,
        status_started_at = now()
    where id = p_bed_id
    returning * into v_bed;
  end if;

  if v_bed.id is null then
    raise exception 'bed not found' using errcode = '02000';
  end if;

  return v_bed;
end;
$$;

create or replace function public.set_bed_details(
  p_bed_id uuid,
  p_customer_name text,
  p_treatment_name text
)
returns public.beds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bed public.beds;
begin
  update public.beds
  set customer_name = nullif(trim(p_customer_name), ''),
      treatment_name = nullif(trim(p_treatment_name), '')
  where id = p_bed_id
  returning * into v_bed;

  if v_bed.id is null then
    raise exception 'bed not found' using errcode = '02000';
  end if;

  return v_bed;
end;
$$;

create or replace function public.set_bed_flags(
  p_bed_id uuid,
  p_pin text,
  p_prescription_status text,
  p_postpay_status text
)
returns public.beds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bed public.beds;
begin
  perform public.assert_admin_pin(p_pin);

  if p_prescription_status not in ('none', 'pending', 'done') then
    raise exception 'invalid prescription status: %', p_prescription_status using errcode = '22023';
  end if;

  if p_postpay_status not in ('none', 'pending', 'done') then
    raise exception 'invalid postpay status: %', p_postpay_status using errcode = '22023';
  end if;

  update public.beds
  set prescription_status = p_prescription_status,
      postpay_status = p_postpay_status
  where id = p_bed_id
  returning * into v_bed;

  if v_bed.id is null then
    raise exception 'bed not found' using errcode = '02000';
  end if;

  return v_bed;
end;
$$;

create or replace function public.set_bed_memo(p_bed_id uuid, p_pin text, p_memo text)
returns public.beds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bed public.beds;
begin
  perform public.assert_admin_pin(p_pin);

  update public.beds
  set memo = nullif(trim(p_memo), '')
  where id = p_bed_id
  returning * into v_bed;

  if v_bed.id is null then
    raise exception 'bed not found' using errcode = '02000';
  end if;

  return v_bed;
end;
$$;

revoke all on public.admin_settings from anon, authenticated;
revoke all on function public.touch_bed_updated_at() from anon, authenticated, public;
revoke all on function public.assert_admin_pin(text) from anon, authenticated, public;
revoke all on function public.set_bed_status(uuid, text) from anon, authenticated, public;
revoke all on function public.set_bed_details(uuid, text, text) from anon, authenticated, public;
revoke all on function public.set_bed_flags(uuid, text, text, text) from anon, authenticated, public;
revoke all on function public.set_bed_memo(uuid, text, text) from anon, authenticated, public;
grant execute on function public.set_bed_status(uuid, text) to anon, authenticated;
grant execute on function public.set_bed_details(uuid, text, text) to anon, authenticated;
grant execute on function public.set_bed_flags(uuid, text, text, text) to anon, authenticated;
grant execute on function public.set_bed_memo(uuid, text, text) to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'beds'
  ) then
    alter publication supabase_realtime add table public.beds;
  end if;
end;
$$;
