create table public.activity_log (
  id bigint generated always as identity primary key,
  actor_uid uuid not null,
  action text not null,
  bed_id uuid not null references public.beds(id),
  before jsonb not null,
  after jsonb not null,
  created_at timestamptz not null default now()
);

create index activity_log_created_at_idx on public.activity_log (created_at desc);

alter table public.activity_log enable row level security;

revoke all on table public.activity_log from public, anon, authenticated;
revoke all on sequence public.activity_log_id_seq from public, anon, authenticated;

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
begin
  if p_before is distinct from p_after then
    insert into public.activity_log (actor_uid, action, bed_id, before, after)
    values (private.require_authenticated(), p_action, p_bed_id, p_before, p_after);
  end if;
end;
$$;

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
        prescription_status = 'none',
        postpay_status = 'none',
        is_follow_up = false,
        memo = null
    where id = p_bed_id
    returning * into v_bed;

    perform private.log_bed_activity(
      'bed_status_change',
      p_bed_id,
      jsonb_build_object(
        'status', v_before.status,
        'customer_name', v_before.customer_name,
        'treatment_name', v_before.treatment_name,
        'prescription_status', v_before.prescription_status,
        'postpay_status', v_before.postpay_status,
        'is_follow_up', v_before.is_follow_up,
        'memo', v_before.memo
      ),
      jsonb_build_object(
        'status', v_bed.status,
        'customer_name', v_bed.customer_name,
        'treatment_name', v_bed.treatment_name,
        'prescription_status', v_bed.prescription_status,
        'postpay_status', v_bed.postpay_status,
        'is_follow_up', v_bed.is_follow_up,
        'memo', v_bed.memo
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

create or replace function private.set_bed_follow_up(p_bed_id uuid, p_is_follow_up boolean)
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

  select * into v_before from public.beds where id = p_bed_id for update;

  if v_before.id is null then
    raise exception 'bed not found' using errcode = '02000';
  end if;

  update public.beds
  set is_follow_up = p_is_follow_up
  where id = p_bed_id
  returning * into v_bed;

  perform private.log_bed_activity(
    'bed_follow_up_change',
    p_bed_id,
    jsonb_build_object('is_follow_up', v_before.is_follow_up),
    jsonb_build_object('is_follow_up', v_bed.is_follow_up)
  );

  return v_bed;
end;
$$;

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
  v_before public.beds;
  v_bed public.beds;
begin
  perform private.require_authenticated();

  if p_prescription_status not in ('none', 'pending', 'done') then
    raise exception 'invalid prescription status: %', p_prescription_status using errcode = '22023';
  end if;

  if p_postpay_status not in ('none', 'pending', 'done') then
    raise exception 'invalid postpay status: %', p_postpay_status using errcode = '22023';
  end if;

  select * into v_before from public.beds where id = p_bed_id for update;

  if v_before.id is null then
    raise exception 'bed not found' using errcode = '02000';
  end if;

  update public.beds
  set prescription_status = p_prescription_status,
      postpay_status = p_postpay_status
  where id = p_bed_id
  returning * into v_bed;

  perform private.log_bed_activity(
    'bed_flags_change',
    p_bed_id,
    jsonb_build_object(
      'prescription_status', v_before.prescription_status,
      'postpay_status', v_before.postpay_status
    ),
    jsonb_build_object(
      'prescription_status', v_bed.prescription_status,
      'postpay_status', v_bed.postpay_status
    )
  );

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
  v_before public.beds;
  v_bed public.beds;
begin
  perform private.require_authenticated();

  select * into v_before from public.beds where id = p_bed_id for update;

  if v_before.id is null then
    raise exception 'bed not found' using errcode = '02000';
  end if;

  update public.beds
  set memo = nullif(trim(p_memo), '')
  where id = p_bed_id
  returning * into v_bed;

  perform private.log_bed_activity(
    'bed_memo_change',
    p_bed_id,
    jsonb_build_object('memo', v_before.memo),
    jsonb_build_object('memo', v_bed.memo)
  );

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
  v_before public.beds;
  v_bed public.beds;
begin
  perform private.require_authenticated();

  select * into v_before from public.beds where id = p_bed_id for update;

  if v_before.id is null then
    raise exception 'bed not found' using errcode = '02000';
  end if;

  update public.beds
  set customer_name = nullif(trim(p_customer_name), ''),
      treatment_name = nullif(trim(p_treatment_name), '')
  where id = p_bed_id
  returning * into v_bed;

  perform private.log_bed_activity(
    'bed_details_change',
    p_bed_id,
    jsonb_build_object(
      'customer_name', v_before.customer_name,
      'treatment_name', v_before.treatment_name
    ),
    jsonb_build_object(
      'customer_name', v_bed.customer_name,
      'treatment_name', v_bed.treatment_name
    )
  );

  return v_bed;
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
    rooms.name,
    beds.label,
    activity_log.before,
    activity_log.after,
    activity_log.created_at
  from public.activity_log
  join public.beds on beds.id = activity_log.bed_id
  join public.rooms on rooms.id = beds.room_id
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

create or replace function private.purge_activity_log()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from public.activity_log where created_at < now() - interval '30 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function private.log_bed_activity(text, uuid, jsonb, jsonb) from public, anon, authenticated;
revoke all on function private.get_activity_log(integer, integer) from public, anon, authenticated;
grant execute on function private.get_activity_log(integer, integer) to authenticated;
revoke all on function private.purge_activity_log() from public, anon, authenticated;

revoke all on function public.get_activity_log(integer, integer) from public, anon, authenticated;
grant execute on function public.get_activity_log(integer, integer) to authenticated;
