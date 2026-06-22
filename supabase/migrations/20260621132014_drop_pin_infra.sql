drop function if exists public.set_bed_flags(uuid, text, text, text);
drop function if exists private.set_bed_flags(uuid, text, text, text);
drop function if exists public.set_bed_memo(uuid, text, text);
drop function if exists public.assert_admin_pin(text);

drop table if exists public.admin_settings;

create or replace function private.set_bed_flags(
  p_bed_id uuid,
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

create or replace function public.set_bed_flags(
  p_bed_id uuid,
  p_prescription_status text,
  p_postpay_status text
)
returns public.beds
language sql
security invoker
set search_path = ''
as $$
  select private.set_bed_flags(p_bed_id, p_prescription_status, p_postpay_status);
$$;

revoke all on function private.set_bed_flags(uuid, text, text) from public, anon, authenticated;
grant execute on function private.set_bed_flags(uuid, text, text) to authenticated;

revoke all on function public.set_bed_flags(uuid, text, text) from public, anon, authenticated;
grant execute on function public.set_bed_flags(uuid, text, text) to authenticated;
