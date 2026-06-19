alter table public.beds
add column if not exists waiting_started_at timestamptz;

update public.beds
set waiting_started_at = status_started_at
where status = 'waiting'
  and waiting_started_at is null;

update public.beds
set waiting_started_at = null
where status = 'empty'
  and waiting_started_at is not null;

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

revoke all on function public.set_bed_status(uuid, text) from anon, authenticated, public;
grant execute on function public.set_bed_status(uuid, text) to anon, authenticated;
