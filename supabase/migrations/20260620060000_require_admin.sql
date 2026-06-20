create or replace function private.require_admin()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_authenticated();

  if auth.jwt()->'app_metadata'->>'role' != 'admin' then
    raise exception 'administrator role required' using errcode = '28000';
  end if;
end;
$$;

revoke all on function private.require_admin() from public, anon, authenticated;
grant execute on function private.require_admin() to authenticated;
