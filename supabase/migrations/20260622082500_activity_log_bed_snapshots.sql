alter table public.activity_log drop constraint if exists activity_log_bed_id_fkey;
alter table public.activity_log add column if not exists bed_label text;
alter table public.activity_log add column if not exists room_name text;

update public.activity_log as activity_log
set bed_label = beds.label,
    room_name = rooms.name
from public.beds
join public.rooms on rooms.id = beds.room_id
where activity_log.bed_id = beds.id
  and (activity_log.bed_label is null or activity_log.room_name is null);

create or replace function private.log_bed_activity(
  p_action text,
  p_bed_id uuid,
  p_before jsonb,
  p_after jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bed_label text;
  v_room_name text;
begin
  if p_before is distinct from p_after then
    select beds.label, rooms.name
    into v_bed_label, v_room_name
    from public.beds
    join public.rooms on rooms.id = beds.room_id
    where beds.id = p_bed_id;

    if not found then
      raise exception 'bed not found' using errcode = '02000';
    end if;

    insert into public.activity_log (actor_uid, action, bed_id, bed_label, room_name, before, after)
    values (private.require_authenticated(), p_action, p_bed_id, v_bed_label, v_room_name, p_before, p_after);
  end if;
end;
$$;

create or replace function private.get_activity_log(p_limit integer, p_offset integer)
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
  order by activity_log.created_at desc, activity_log.id desc
  limit v_limit
  offset v_offset;
end;
$$;

create or replace function public.get_activity_log(p_limit integer default 50, p_offset integer default 0)
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
  select * from private.get_activity_log(p_limit, p_offset);
$$;
