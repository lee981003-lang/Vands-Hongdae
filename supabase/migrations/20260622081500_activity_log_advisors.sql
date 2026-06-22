create index activity_log_bed_id_idx on public.activity_log (bed_id);

create policy "no direct activity log access"
on public.activity_log
as restrictive
for all
to anon, authenticated
using (false)
with check (false);
