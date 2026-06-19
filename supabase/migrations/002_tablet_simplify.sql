alter table public.beds
add column if not exists is_follow_up boolean not null default false;

update public.beds
set status = case
  when status = 'reanesthesia_bed' then 'in_treatment'
  when status = 'reanesthesia_waiting' then 'waiting'
  else status
end
where status in ('reanesthesia_bed', 'reanesthesia_waiting');

alter table public.beds drop constraint if exists beds_status_check;

do $$
declare
  v_constraint_name text;
begin
  select conname into v_constraint_name
  from pg_constraint
  where conrelid = 'public.beds'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%reanesthesia%'
  limit 1;

  if v_constraint_name is not null then
    execute format('alter table public.beds drop constraint %I', v_constraint_name);
  end if;
end;
$$;

alter table public.beds
add constraint beds_status_check
check (status in ('empty', 'in_treatment', 'waiting'));

create or replace function public.set_bed_status(p_bed_id uuid, p_next_status text)
returns public.beds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bed public.beds;
begin
  if p_next_status not in ('empty', 'in_treatment', 'waiting') then
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
        is_follow_up = false,
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

create or replace function public.set_bed_follow_up(p_bed_id uuid, p_is_follow_up boolean)
returns public.beds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bed public.beds;
begin
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

revoke all on function public.set_bed_status(uuid, text) from anon, authenticated, public;
revoke all on function public.set_bed_follow_up(uuid, boolean) from anon, authenticated, public;
revoke all on function public.set_bed_flags(uuid, text, text, text) from anon, authenticated, public;
grant execute on function public.set_bed_status(uuid, text) to anon, authenticated;
grant execute on function public.set_bed_follow_up(uuid, boolean) to anon, authenticated;
grant execute on function public.set_bed_flags(uuid, text, text, text) to anon, authenticated;
