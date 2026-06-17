update public.rooms
set name = '진료실'
where name = '처치실';

insert into public.rooms (name, sort_order) values
  ('VIP실', 1),
  ('제모실', 2),
  ('진료실', 3),
  ('레이저실', 4),
  ('관리실', 5)
on conflict (name) do update set sort_order = excluded.sort_order;

insert into public.beds (room_id, label, sort_order)
select rooms.id, generated.label::text, generated.label
from public.rooms
cross join generate_series(1, 2) as generated(label)
where rooms.name = 'VIP실'
on conflict (room_id, label) do update set sort_order = excluded.sort_order;

insert into public.beds (room_id, label, sort_order)
select rooms.id, generated.label, generated.sort_order
from public.rooms
cross join (values
  ('H1-1', 1),
  ('H1-2', 2),
  ('H2-1', 3),
  ('H2-2', 4)
) as generated(label, sort_order)
where rooms.name = '제모실'
on conflict (room_id, label) do update set sort_order = excluded.sort_order;

insert into public.beds (room_id, label, sort_order)
select rooms.id, generated.label, generated.sort_order
from public.rooms
cross join (values
  ('P1', 1),
  ('P2', 2),
  ('P3', 3),
  ('P4', 4)
) as generated(label, sort_order)
where rooms.name = '진료실'
on conflict (room_id, label) do update set sort_order = excluded.sort_order;

insert into public.beds (room_id, label, sort_order)
select rooms.id, 'L' || generated.label::text, generated.label
from public.rooms
cross join generate_series(1, 12) as generated(label)
where rooms.name = '레이저실'
on conflict (room_id, label) do update set sort_order = excluded.sort_order;

insert into public.beds (room_id, label, sort_order)
select rooms.id, generated.label::text, generated.label
from public.rooms
cross join generate_series(1, 10) as generated(label)
where rooms.name = '관리실'
on conflict (room_id, label) do update set sort_order = excluded.sort_order;

insert into public.admin_settings (id, pin_hash)
values (1, crypt('1234', gen_salt('bf')))
on conflict (id) do nothing;
