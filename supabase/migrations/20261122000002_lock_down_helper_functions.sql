-- keep the access helpers and trigger functions out of the public API
create schema if not exists private;
alter function public.can_view_board(uuid) set schema private;
alter function public.can_edit_board(uuid) set schema private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke execute on function private.can_view_board(uuid) from public, anon;
revoke execute on function private.can_edit_board(uuid) from public, anon;
grant execute on function private.can_view_board(uuid) to authenticated;
grant execute on function private.can_edit_board(uuid) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.bump_board() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.my_days() from public, anon;
grant execute on function public.my_days() to authenticated;
