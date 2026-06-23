drop function if exists public.get_activity_log(integer, integer);
drop function if exists private.get_activity_log(integer, integer);

create function private.get_activity_log(p_limit integer, p_offset integer, p_date date)
returns table (
  id bigint,
  actor_uid uuid,
  actor_username text,
  action text,
  room_name text,
  bed_label text,
  before jsonb,
  after jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  perform private.require_admin();

  return query
  select
    activity_log.id,
    activity_log.actor_uid,
    split_part(users.email, '@', 1),
    activity_log.action,
    activity_log.room_name,
    activity_log.bed_label,
    activity_log.before,
    activity_log.after,
    activity_log.created_at
  from public.activity_log
  left join auth.users on users.id = activity_log.actor_uid
  where p_date is null
     or (
       activity_log.created_at >= (p_date::timestamp at time zone 'Asia/Seoul')
       and activity_log.created_at < ((p_date + 1)::timestamp at time zone 'Asia/Seoul')
     )
  order by activity_log.created_at desc, activity_log.id desc
  limit v_limit
  offset v_offset;
end;
$$;

create function public.get_activity_log(
  p_limit integer default 50,
  p_offset integer default 0,
  p_date date default null
)
returns table (
  id bigint,
  actor_uid uuid,
  actor_username text,
  action text,
  room_name text,
  bed_label text,
  before jsonb,
  after jsonb,
  created_at timestamptz
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.get_activity_log(p_limit, p_offset, p_date);
$$;

revoke all on function private.get_activity_log(integer, integer, date) from public, anon, authenticated;
grant execute on function private.get_activity_log(integer, integer, date) to authenticated;

revoke all on function public.get_activity_log(integer, integer, date) from public, anon, authenticated;
grant execute on function public.get_activity_log(integer, integer, date) to authenticated;
