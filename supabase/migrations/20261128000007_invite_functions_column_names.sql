-- create_invite / redeem_invite: their output column names match table columns,
-- so tell plpgsql to prefer columns and qualify every reference.
create or replace function public.create_invite(p_board uuid default null)
returns table (code text, max_uses integer, uses integer, expires_at timestamptz, invites_left integer)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  me uuid := auth.uid();
  c text;
  left_now integer;
begin
  if me is null then raise exception 'not signed in'; end if;
  if p_board is not null then
    if not exists (select 1 from public.boards b where b.id = p_board and b.owner_id = me) then
      raise exception 'only the board owner can make invite links';
    end if;
    select i.code into c from public.invites i
     where i.board_id = p_board and i.inviter_id = me and i.uses < i.max_uses and i.expires_at > now()
     order by i.created_at desc limit 1;
    if c is null then
      c := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
      insert into public.invites (code, inviter_id, board_id, max_uses) values (c, me, p_board, 25);
    end if;
  else
    update public.profiles pr set invites_left = pr.invites_left - 1 where pr.id = me and pr.invites_left > 0
      returning pr.invites_left into left_now;
    if left_now is null then raise exception 'no invites left'; end if;
    c := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    insert into public.invites (code, inviter_id) values (c, me);
  end if;
  return query
    select i.code, i.max_uses, i.uses, i.expires_at, (select p.invites_left from public.profiles p where p.id = me)
      from public.invites i where i.code = c;
end;
$$;

create or replace function public.redeem_invite(p_code text)
returns table (ok boolean, message text, inviter_username text, board_id uuid)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  me uuid := auth.uid();
  inv public.invites%rowtype;
  uname text;
begin
  if me is null then return query select false, 'not signed in', null::text, null::uuid; return; end if;
  select * into inv from public.invites i where i.code = lower(p_code) for update;
  if not found then return query select false, 'that invite link doesn''t exist', null::text, null::uuid; return; end if;
  select p.username into uname from public.profiles p where p.id = inv.inviter_id;
  if inv.inviter_id = me then return query select false, 'that''s your own invite', uname, inv.board_id; return; end if;
  if exists (select 1 from public.invite_redemptions r where r.code = inv.code and r.user_id = me) then
    return query select true, 'already accepted', uname, inv.board_id; return;
  end if;
  if inv.uses >= inv.max_uses or inv.expires_at <= now() then
    return query select false, 'that invite has expired or been used up', uname, null::uuid; return;
  end if;
  update public.invites i set uses = i.uses + 1 where i.code = inv.code;
  insert into public.invite_redemptions (code, user_id) values (inv.code, me);
  update public.profiles p set invited_by = inv.inviter_id where p.id = me and p.invited_by is null;
  insert into public.follows (follower_id, followee_id) values (me, inv.inviter_id), (inv.inviter_id, me) on conflict do nothing;
  if inv.board_id is not null then
    insert into public.board_members (board_id, user_id, role) values (inv.board_id, me, 'editor') on conflict do nothing;
  end if;
  return query select true, 'welcome', uname, inv.board_id;
end;
$$;
