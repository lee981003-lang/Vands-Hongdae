drop function if exists public.set_bed_memo(uuid, text, text);

create or replace function public.set_bed_memo(p_bed_id uuid, p_memo text)
returns public.beds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bed public.beds;
begin
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

revoke all on function public.set_bed_memo(uuid, text) from anon, authenticated, public;
grant execute on function public.set_bed_memo(uuid, text) to anon, authenticated;
