alter table public.rooms drop constraint if exists rooms_sort_order_key;

create or replace function private.create_room(p_name text)
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_room public.rooms;
begin
  perform private.require_admin();

  v_name := btrim(coalesce(p_name, ''));
  if v_name = '' then
    raise exception '룸 이름을 입력해 주세요.' using errcode = '22023';
  end if;

  insert into public.rooms (name, sort_order)
  values (v_name, (select coalesce(max(sort_order), 0) + 1 from public.rooms))
  returning * into v_room;

  return v_room;
exception
  when unique_violation then
    raise exception '이미 존재하는 룸 이름입니다.' using errcode = '23505';
end;
$$;

create or replace function private.rename_room(p_room_id uuid, p_name text)
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_room public.rooms;
begin
  perform private.require_admin();

  v_name := btrim(coalesce(p_name, ''));
  if v_name = '' then
    raise exception '룸 이름을 입력해 주세요.' using errcode = '22023';
  end if;

  update public.rooms
  set name = v_name
  where id = p_room_id
  returning * into v_room;

  if v_room.id is null then
    raise exception '룸을 찾을 수 없습니다.' using errcode = '02000';
  end if;

  return v_room;
exception
  when unique_violation then
    raise exception '이미 존재하는 룸 이름입니다.' using errcode = '23505';
end;
$$;

create or replace function private.reorder_rooms(p_room_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room_count integer;
begin
  perform private.require_admin();

  select count(*) into v_room_count from public.rooms;

  if coalesce(cardinality(p_room_ids), 0) <> v_room_count
    or (select count(distinct room_id) from unnest(p_room_ids) as ids(room_id)) <> v_room_count
    or exists (
      select 1
      from unnest(p_room_ids) as ids(room_id)
      where not exists (select 1 from public.rooms where id = ids.room_id)
    ) then
    raise exception '현재 룸 목록 전체를 순서대로 보내야 합니다.' using errcode = '22023';
  end if;

  update public.rooms as room
  set sort_order = ordered.sort_order
  from unnest(p_room_ids) with ordinality as ordered(id, sort_order)
  where room.id = ordered.id;
end;
$$;

create or replace function private.delete_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();

  if not exists (select 1 from public.rooms where id = p_room_id) then
    raise exception '룸을 찾을 수 없습니다.' using errcode = '02000';
  end if;

  perform 1 from public.beds where room_id = p_room_id for update;

  if exists (select 1 from public.beds where room_id = p_room_id and status <> 'empty') then
    raise exception '빈 상태가 아닌 베드가 있어 룸을 삭제할 수 없습니다.' using errcode = '22023';
  end if;

  delete from public.rooms where id = p_room_id;
end;
$$;

create or replace function private.create_bed(p_room_id uuid, p_label text)
returns public.beds
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_label text;
  v_bed public.beds;
begin
  perform private.require_admin();

  v_label := btrim(coalesce(p_label, ''));
  if v_label = '' then
    raise exception '베드 라벨을 입력해 주세요.' using errcode = '22023';
  end if;

  if not exists (select 1 from public.rooms where id = p_room_id) then
    raise exception '룸을 찾을 수 없습니다.' using errcode = '02000';
  end if;

  insert into public.beds (room_id, label, sort_order)
  values (
    p_room_id,
    v_label,
    (select coalesce(max(sort_order), 0) + 1 from public.beds where room_id = p_room_id)
  )
  returning * into v_bed;

  return v_bed;
exception
  when unique_violation then
    raise exception '이 룸에 이미 존재하는 베드 라벨입니다.' using errcode = '23505';
end;
$$;

create or replace function private.rename_bed(p_bed_id uuid, p_label text)
returns public.beds
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_label text;
  v_bed public.beds;
begin
  perform private.require_admin();

  v_label := btrim(coalesce(p_label, ''));
  if v_label = '' then
    raise exception '베드 라벨을 입력해 주세요.' using errcode = '22023';
  end if;

  update public.beds
  set label = v_label
  where id = p_bed_id
  returning * into v_bed;

  if v_bed.id is null then
    raise exception '베드를 찾을 수 없습니다.' using errcode = '02000';
  end if;

  return v_bed;
exception
  when unique_violation then
    raise exception '이 룸에 이미 존재하는 베드 라벨입니다.' using errcode = '23505';
end;
$$;

create or replace function private.reorder_beds(p_room_id uuid, p_bed_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bed_count integer;
begin
  perform private.require_admin();

  if not exists (select 1 from public.rooms where id = p_room_id) then
    raise exception '룸을 찾을 수 없습니다.' using errcode = '02000';
  end if;

  select count(*) into v_bed_count from public.beds where room_id = p_room_id;

  if coalesce(cardinality(p_bed_ids), 0) <> v_bed_count
    or (select count(distinct bed_id) from unnest(p_bed_ids) as ids(bed_id)) <> v_bed_count
    or exists (
      select 1
      from unnest(p_bed_ids) as ids(bed_id)
      where not exists (select 1 from public.beds where id = ids.bed_id and room_id = p_room_id)
    ) then
    raise exception '해당 룸의 베드 목록 전체를 순서대로 보내야 합니다.' using errcode = '22023';
  end if;

  update public.beds as bed
  set sort_order = ordered.sort_order
  from unnest(p_bed_ids) with ordinality as ordered(id, sort_order)
  where bed.id = ordered.id and bed.room_id = p_room_id;
end;
$$;

create or replace function private.delete_bed(p_bed_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  perform private.require_admin();

  select status into v_status from public.beds where id = p_bed_id for update;
  if not found then
    raise exception '베드를 찾을 수 없습니다.' using errcode = '02000';
  end if;

  if v_status <> 'empty' then
    raise exception '빈 상태의 베드만 삭제할 수 있습니다.' using errcode = '22023';
  end if;

  delete from public.beds where id = p_bed_id;
end;
$$;

create or replace function public.create_room(p_name text)
returns public.rooms
language sql
security invoker
set search_path = ''
as $$
  select private.create_room(p_name);
$$;

create or replace function public.rename_room(p_room_id uuid, p_name text)
returns public.rooms
language sql
security invoker
set search_path = ''
as $$
  select private.rename_room(p_room_id, p_name);
$$;

create or replace function public.reorder_rooms(p_room_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.reorder_rooms(p_room_ids);
$$;

create or replace function public.delete_room(p_room_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.delete_room(p_room_id);
$$;

create or replace function public.create_bed(p_room_id uuid, p_label text)
returns public.beds
language sql
security invoker
set search_path = ''
as $$
  select private.create_bed(p_room_id, p_label);
$$;

create or replace function public.rename_bed(p_bed_id uuid, p_label text)
returns public.beds
language sql
security invoker
set search_path = ''
as $$
  select private.rename_bed(p_bed_id, p_label);
$$;

create or replace function public.reorder_beds(p_room_id uuid, p_bed_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.reorder_beds(p_room_id, p_bed_ids);
$$;

create or replace function public.delete_bed(p_bed_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.delete_bed(p_bed_id);
$$;

revoke all on function private.create_room(text) from public, anon, authenticated;
revoke all on function private.rename_room(uuid, text) from public, anon, authenticated;
revoke all on function private.reorder_rooms(uuid[]) from public, anon, authenticated;
revoke all on function private.delete_room(uuid) from public, anon, authenticated;
revoke all on function private.create_bed(uuid, text) from public, anon, authenticated;
revoke all on function private.rename_bed(uuid, text) from public, anon, authenticated;
revoke all on function private.reorder_beds(uuid, uuid[]) from public, anon, authenticated;
revoke all on function private.delete_bed(uuid) from public, anon, authenticated;

grant execute on function private.create_room(text) to authenticated;
grant execute on function private.rename_room(uuid, text) to authenticated;
grant execute on function private.reorder_rooms(uuid[]) to authenticated;
grant execute on function private.delete_room(uuid) to authenticated;
grant execute on function private.create_bed(uuid, text) to authenticated;
grant execute on function private.rename_bed(uuid, text) to authenticated;
grant execute on function private.reorder_beds(uuid, uuid[]) to authenticated;
grant execute on function private.delete_bed(uuid) to authenticated;

revoke all on function public.create_room(text) from public, anon, authenticated;
revoke all on function public.rename_room(uuid, text) from public, anon, authenticated;
revoke all on function public.reorder_rooms(uuid[]) from public, anon, authenticated;
revoke all on function public.delete_room(uuid) from public, anon, authenticated;
revoke all on function public.create_bed(uuid, text) from public, anon, authenticated;
revoke all on function public.rename_bed(uuid, text) from public, anon, authenticated;
revoke all on function public.reorder_beds(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.delete_bed(uuid) from public, anon, authenticated;

grant execute on function public.create_room(text) to authenticated;
grant execute on function public.rename_room(uuid, text) to authenticated;
grant execute on function public.reorder_rooms(uuid[]) to authenticated;
grant execute on function public.delete_room(uuid) to authenticated;
grant execute on function public.create_bed(uuid, text) to authenticated;
grant execute on function public.rename_bed(uuid, text) to authenticated;
grant execute on function public.reorder_beds(uuid, uuid[]) to authenticated;
grant execute on function public.delete_bed(uuid) to authenticated;
