begin;

delete from public.activity_log
where action in ('bed_flags_change', 'bed_memo_change');

update public.activity_log
set before = before - array['prescription_status', 'postpay_status', 'memo'],
    after = after - array['prescription_status', 'postpay_status', 'memo']
where before ?| array['prescription_status', 'postpay_status', 'memo']
   or after ?| array['prescription_status', 'postpay_status', 'memo'];

create or replace function private.set_bed_status(p_bed_id uuid, p_next_status text)
returns public.beds
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.beds;
  v_bed public.beds;
begin
  perform private.require_authenticated();

  if p_next_status not in ('empty', 'in_treatment', 'waiting') then
    raise exception 'invalid bed status: %', p_next_status using errcode = '22023';
  end if;

  select * into v_before from public.beds where id = p_bed_id for update;

  if v_before.id is null then
    raise exception 'bed not found' using errcode = '02000';
  end if;

  if p_next_status = 'empty' then
    update public.beds
    set status = p_next_status,
        status_started_at = now(),
        waiting_started_at = null,
        customer_name = null,
        treatment_name = null,
        is_follow_up = false
    where id = p_bed_id
    returning * into v_bed;

    perform private.log_bed_activity(
      'bed_status_change',
      p_bed_id,
      jsonb_build_object(
        'status', v_before.status,
        'customer_name', v_before.customer_name,
        'treatment_name', v_before.treatment_name,
        'is_follow_up', v_before.is_follow_up
      ),
      jsonb_build_object(
        'status', v_bed.status,
        'customer_name', v_bed.customer_name,
        'treatment_name', v_bed.treatment_name,
        'is_follow_up', v_bed.is_follow_up
      )
    );
  else
    update public.beds
    set status = p_next_status,
        status_started_at = now(),
        waiting_started_at = case when p_next_status = 'waiting' then now() else waiting_started_at end
    where id = p_bed_id
    returning * into v_bed;

    perform private.log_bed_activity(
      'bed_status_change',
      p_bed_id,
      jsonb_build_object('status', v_before.status),
      jsonb_build_object('status', v_bed.status)
    );
  end if;

  return v_bed;
end;
$$;

drop function if exists private.set_bed_flags(uuid, text, text);
drop function if exists public.set_bed_flags(uuid, text, text, text);
drop function if exists private.set_bed_memo(uuid, text);
drop function if exists public.set_bed_memo(uuid, text);

alter table public.beds
  drop column if exists prescription_status,
  drop column if exists postpay_status,
  drop column if exists memo;

commit;
