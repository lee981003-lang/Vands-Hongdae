create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.require_authenticated()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  return v_user_id;
end;
$$;

create or replace function private.set_bed_status(p_bed_id uuid, p_next_status text)
returns public.beds
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bed public.beds;
begin
  perform private.require_authenticated();

  if p_next_status not in ('empty', 'in_treatment', 'waiting') then
    raise exception 'invalid bed status: %', p_next_status using errcode = '22023';
  end if;

  if p_next_status = 'empty' then
    update public.beds
    set status = p_next_status,
        status_started_at = now(),
        waiting_started_at = null,
        customer_name = null,
        treatment_name = null,
        prescription_status = 'none',
        postpay_status = 'none',
        is_follow_up = false,
        memo = null
    where id = p_bed_id
    returning * into v_bed;
  elsif p_next_status = 'waiting' then
    update public.beds
    set status = p_next_status,
        status_started_at = now(),
        waiting_started_at = now()
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

create or replace function private.set_bed_follow_up(p_bed_id uuid, p_is_follow_up boolean)
returns public.beds
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bed public.beds;
begin
  perform private.require_authenticated();

  update public.beds
  set is_follow_up = p_is_follow_up
  where id = p_bed_id
  returning * into v_bed;

  if v_bed.id is null then
    raise exception 'bed not found' using errcode = '02000';
  end if;

  return v_bed;
end;
$$;

create or replace function private.set_bed_flags(
  p_bed_id uuid,
  p_pin text,
  p_prescription_status text,
  p_postpay_status text
)
returns public.beds
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bed public.beds;
begin
  perform private.require_authenticated();

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

create or replace function private.set_bed_memo(p_bed_id uuid, p_memo text)
returns public.beds
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bed public.beds;
begin
  perform private.require_authenticated();

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

create or replace function private.set_bed_details(
  p_bed_id uuid,
  p_customer_name text,
  p_treatment_name text
)
returns public.beds
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bed public.beds;
begin
  perform private.require_authenticated();

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

create or replace function public.set_bed_status(p_bed_id uuid, p_next_status text)
returns public.beds
language sql
security invoker
set search_path = ''
as $$
  select private.set_bed_status(p_bed_id, p_next_status);
$$;

create or replace function public.set_bed_follow_up(p_bed_id uuid, p_is_follow_up boolean)
returns public.beds
language sql
security invoker
set search_path = ''
as $$
  select private.set_bed_follow_up(p_bed_id, p_is_follow_up);
$$;

create or replace function public.set_bed_flags(
  p_bed_id uuid,
  p_pin text,
  p_prescription_status text,
  p_postpay_status text
)
returns public.beds
language sql
security invoker
set search_path = ''
as $$
  select private.set_bed_flags(p_bed_id, p_pin, p_prescription_status, p_postpay_status);
$$;

create or replace function public.set_bed_memo(p_bed_id uuid, p_memo text)
returns public.beds
language sql
security invoker
set search_path = ''
as $$
  select private.set_bed_memo(p_bed_id, p_memo);
$$;

create or replace function public.set_bed_details(
  p_bed_id uuid,
  p_customer_name text,
  p_treatment_name text
)
returns public.beds
language sql
security invoker
set search_path = ''
as $$
  select private.set_bed_details(p_bed_id, p_customer_name, p_treatment_name);
$$;

revoke all on table public.rooms, public.beds from anon, authenticated;
grant select on table public.rooms, public.beds to authenticated;

drop policy if exists "public can read rooms" on public.rooms;
drop policy if exists "authenticated can read rooms" on public.rooms;
create policy "authenticated can read rooms"
on public.rooms for select
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "public can read beds" on public.beds;
drop policy if exists "authenticated can read beds" on public.beds;
create policy "authenticated can read beds"
on public.beds for select
to authenticated
using ((select auth.uid()) is not null);

revoke all on function private.require_authenticated() from public, anon, authenticated;
revoke all on function private.set_bed_status(uuid, text) from public, anon, authenticated;
revoke all on function private.set_bed_follow_up(uuid, boolean) from public, anon, authenticated;
revoke all on function private.set_bed_flags(uuid, text, text, text) from public, anon, authenticated;
revoke all on function private.set_bed_memo(uuid, text) from public, anon, authenticated;
revoke all on function private.set_bed_details(uuid, text, text) from public, anon, authenticated;

grant execute on function private.set_bed_status(uuid, text) to authenticated;
grant execute on function private.set_bed_follow_up(uuid, boolean) to authenticated;
grant execute on function private.set_bed_flags(uuid, text, text, text) to authenticated;
grant execute on function private.set_bed_memo(uuid, text) to authenticated;
grant execute on function private.set_bed_details(uuid, text, text) to authenticated;

revoke all on function public.set_bed_status(uuid, text) from public, anon, authenticated;
revoke all on function public.set_bed_follow_up(uuid, boolean) from public, anon, authenticated;
revoke all on function public.set_bed_flags(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.set_bed_memo(uuid, text) from public, anon, authenticated;
revoke all on function public.set_bed_details(uuid, text, text) from public, anon, authenticated;

grant execute on function public.set_bed_status(uuid, text) to authenticated;
grant execute on function public.set_bed_follow_up(uuid, boolean) to authenticated;
grant execute on function public.set_bed_flags(uuid, text, text, text) to authenticated;
grant execute on function public.set_bed_memo(uuid, text) to authenticated;
grant execute on function public.set_bed_details(uuid, text, text) to authenticated;
