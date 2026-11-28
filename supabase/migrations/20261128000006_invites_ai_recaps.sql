-- invites (Clubhouse-style), AI usage limits, monthly recap data

-- ---------- profiles: who invited you, how many invites you have ----------
alter table public.profiles
  add column invited_by uuid references public.profiles (id) on delete set null,
  add column invites_left integer not null default 5 check (invites_left >= 0);
create index profiles_invited_by on public.profiles (invited_by);

-- people may edit their own profile, but not their invite count or who invited them
revoke update on public.profiles from authenticated;
grant update (username, display_name, bio, avatar_path, diary_title) on public.profiles to authenticated;

-- ---------- invites ----------
create table public.invites (
  code        text primary key,
  inviter_id  uuid not null references public.profiles (id) on delete cascade,
  board_id    uuid references public.boards (id) on delete cascade,
  max_uses    integer not null default 1 check (max_uses between 1 and 50),
  uses        integer not null default 0,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '30 days'
);
create index invites_inviter on public.invites (inviter_id);
create index invites_board on public.invites (board_id);
alter table public.invites enable row level security;
create policy "see your own invites" on public.invites
  for select to authenticated using (inviter_id = (select auth.uid()));

create table public.invite_redemptions (
  code       text not null references public.invites (code) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (code, user_id)
);
create index invite_redemptions_user on public.invite_redemptions (user_id);
alter table public.invite_redemptions enable row level security;
create policy "inviters see who used their invites" on public.invite_redemptions
  for select to authenticated
  using (user_id = (select auth.uid())
         or exists (select 1 from public.invites i where i.code = invite_redemptions.code and i.inviter_id = (select auth.uid())));

-- make a personal invite (uses one of your invites) or a board invite link (owner only, many uses)
create or replace function public.create_invite(p_board uuid default null)
returns table (code text, max_uses integer, uses integer, expires_at timestamptz, invites_left integer)
language plpgsql security definer set search_path = '' as $$
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
    -- reuse a live link for this board if there is one
    select i.code into c from public.invites i
     where i.board_id = p_board and i.inviter_id = me and i.uses < i.max_uses and i.expires_at > now()
     order by i.created_at desc limit 1;
    if c is null then
      c := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
      insert into public.invites (code, inviter_id, board_id, max_uses) values (c, me, p_board, 25);
    end if;
  else
    update public.profiles set invites_left = invites_left - 1 where id = me and invites_left > 0
      returning profiles.invites_left into left_now;
    if left_now is null then raise exception 'no invites left'; end if;
    c := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    insert into public.invites (code, inviter_id) values (c, me);
  end if;
  return query
    select i.code, i.max_uses, i.uses, i.expires_at, (select p.invites_left from public.profiles p where p.id = me)
      from public.invites i where i.code = c;
end;
$$;

-- what the invite screen shows before someone signs up
create or replace function public.invite_preview(p_code text)
returns table (valid boolean, username text, display_name text, avatar_path text, board_title text)
language sql stable security definer set search_path = '' as $$
  select (i.uses < i.max_uses and i.expires_at > now()), p.username, p.display_name, p.avatar_path,
         (select b.title from public.boards b where b.id = i.board_id)
    from public.invites i join public.profiles p on p.id = i.inviter_id
   where i.code = lower(p_code);
$$;

-- accept an invite: remember who invited you, follow each other, join the board
create or replace function public.redeem_invite(p_code text)
returns table (ok boolean, message text, inviter_username text, board_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  inv public.invites%rowtype;
  uname text;
begin
  if me is null then return query select false, 'not signed in', null::text, null::uuid; return; end if;
  select * into inv from public.invites where code = lower(p_code) for update;
  if not found then return query select false, 'that invite link doesn''t exist', null::text, null::uuid; return; end if;
  select username into uname from public.profiles where id = inv.inviter_id;
  if inv.inviter_id = me then return query select false, 'that''s your own invite', uname, inv.board_id; return; end if;
  if exists (select 1 from public.invite_redemptions r where r.code = inv.code and r.user_id = me) then
    return query select true, 'already accepted', uname, inv.board_id; return;
  end if;
  if inv.uses >= inv.max_uses or inv.expires_at <= now() then
    return query select false, 'that invite has expired or been used up', uname, null::uuid; return;
  end if;
  update public.invites set uses = uses + 1 where code = inv.code;
  insert into public.invite_redemptions (code, user_id) values (inv.code, me);
  update public.profiles set invited_by = inv.inviter_id where id = me and invited_by is null;
  insert into public.follows (follower_id, followee_id) values (me, inv.inviter_id), (inv.inviter_id, me) on conflict do nothing;
  if inv.board_id is not null then
    insert into public.board_members (board_id, user_id, role) values (inv.board_id, me, 'editor') on conflict do nothing;
  end if;
  return query select true, 'welcome', uname, inv.board_id;
end;
$$;

revoke execute on function public.create_invite(uuid) from public, anon;
revoke execute on function public.redeem_invite(text) from public, anon;
revoke execute on function public.invite_preview(text) from public;
grant execute on function public.create_invite(uuid) to authenticated;
grant execute on function public.redeem_invite(text) to authenticated;
grant execute on function public.invite_preview(text) to anon, authenticated;

-- profile: include who invited them and how many people they brought in
drop function public.profile_by_username(text);
create function public.profile_by_username(p_username text)
returns table (
  id uuid, username text, display_name text, bio text, avatar_path text,
  followers bigint, following bigint, posts bigint, i_follow boolean, follows_me boolean,
  invited_by_username text, invited_count bigint)
language sql stable security invoker set search_path = '' as $$
  select pr.id, pr.username, pr.display_name, pr.bio, pr.avatar_path,
         (select count(*) from public.follows f where f.followee_id = pr.id),
         (select count(*) from public.follows f where f.follower_id = pr.id),
         (select count(*) from public.posts p where p.author_id = pr.id),
         exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = pr.id),
         exists (select 1 from public.follows f where f.follower_id = pr.id and f.followee_id = (select auth.uid())),
         (select ib.username from public.profiles ib where ib.id = pr.invited_by),
         (select count(*) from public.profiles x where x.invited_by = pr.id)
    from public.profiles pr
   where pr.username = lower(p_username);
$$;
revoke execute on function public.profile_by_username(text) from public, anon;
grant execute on function public.profile_by_username(text) to authenticated;

-- your invites and who used them
create or replace function public.my_invites()
returns table (code text, board_id uuid, max_uses integer, uses integer, created_at timestamptz, expires_at timestamptz, used_by jsonb)
language sql stable security invoker set search_path = '' as $$
  select i.code, i.board_id, i.max_uses, i.uses, i.created_at, i.expires_at,
         coalesce((select jsonb_agg(jsonb_build_object('username', p.username, 'display_name', p.display_name, 'avatar_path', p.avatar_path))
                     from public.invite_redemptions r join public.profiles p on p.id = r.user_id where r.code = i.code), '[]'::jsonb)
    from public.invites i
   where i.inviter_id = (select auth.uid()) and i.board_id is null
   order by i.created_at desc;
$$;
revoke execute on function public.my_invites() from public, anon;
grant execute on function public.my_invites() to authenticated;

-- activity: add "joined from your invite"
create or replace function public.my_activity()
returns table (kind text, at timestamptz, actor_id uuid, username text, display_name text, avatar_path text,
               post_id uuid, board_id uuid, body text)
language sql stable security invoker set search_path = '' as $$
  select * from (
    select 'follow'::text, f.created_at, pr.id, pr.username, pr.display_name, pr.avatar_path, null::uuid, null::uuid, null::text
      from public.follows f join public.profiles pr on pr.id = f.follower_id
     where f.followee_id = (select auth.uid()) and pr.invited_by is distinct from (select auth.uid())
    union all
    select 'joined', pr.created_at, pr.id, pr.username, pr.display_name, pr.avatar_path, null, null, null
      from public.profiles pr where pr.invited_by = (select auth.uid())
    union all
    select 'magnet', r.created_at, pr.id, pr.username, pr.display_name, pr.avatar_path, p.id, p.board_id, null
      from public.reactions r join public.posts p on p.id = r.post_id join public.profiles pr on pr.id = r.user_id
     where p.author_id = (select auth.uid()) and r.user_id <> (select auth.uid())
    union all
    select 'comment', c.created_at, pr.id, pr.username, pr.display_name, pr.avatar_path, p.id, p.board_id, c.body
      from public.comments c join public.posts p on p.id = c.post_id join public.profiles pr on pr.id = c.author_id
     where p.author_id = (select auth.uid()) and c.author_id <> (select auth.uid())
    union all
    select 'invite', m.created_at, pr.id, pr.username, pr.display_name, pr.avatar_path, null, b.id, b.title
      from public.board_members m join public.boards b on b.id = m.board_id join public.profiles pr on pr.id = b.owner_id
     where m.user_id = (select auth.uid())
    union all
    select 'tag', t.created_at, pr.id, pr.username, pr.display_name, pr.avatar_path, t.post_id, p.board_id, null
      from public.post_tags t join public.posts p on p.id = t.post_id join public.profiles pr on pr.id = t.tagged_by
     where t.user_id = (select auth.uid()) and t.tagged_by <> (select auth.uid())
  ) a
  order by 2 desc
  limit 50;
$$;

-- ---------- monthly recap ----------
create or replace function public.month_boards(p_month date)
returns table (day date, background text, items jsonb, post_id uuid, magnets bigint)
language sql stable security invoker set search_path = '' as $$
  select b.day, b.background,
         (select jsonb_agg(jsonb_build_object('id', i.id, 'type', i.type, 'z', i.z, 'data', i.data) order by i.z)
            from public.items i where i.board_id = b.id),
         p.id,
         (select count(*) from public.reactions r where r.post_id = p.id)
    from public.boards b
    left join public.posts p on p.board_id = b.id
   where b.owner_id = (select auth.uid()) and b.kind = 'day'
     and b.day >= date_trunc('month', p_month)::date
     and b.day < (date_trunc('month', p_month) + interval '1 month')::date
     and exists (select 1 from public.items i where i.board_id = b.id)
   order by b.day;
$$;
revoke execute on function public.month_boards(date) from public, anon;
grant execute on function public.month_boards(date) to authenticated;

-- ---------- AI usage (written only by the edge function with the service key) ----------
create table public.ai_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day     date not null default current_date,
  count   integer not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;

create or replace function public.bump_ai_usage(p_user uuid, p_limit integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  insert into public.ai_usage (user_id, day, count) values (p_user, current_date, 1)
  on conflict (user_id, day) do update set count = public.ai_usage.count + 1
  returning count into n;
  return n;
end;
$$;
revoke execute on function public.bump_ai_usage(uuid, integer) from public, anon, authenticated;
grant execute on function public.bump_ai_usage(uuid, integer) to service_role;
