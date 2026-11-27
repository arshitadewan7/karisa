-- community: posting boards, magnets (likes), comments, reports, avatars,
-- live editing on shared boards, and the read functions the app uses.
-- Additive only: existing diaries are untouched.

-- ---------- tables ----------
create table public.posts (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null unique references public.boards (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  caption    text not null default '' check (char_length(caption) <= 500),
  created_at timestamptz not null default now()
);
create index posts_author_time on public.posts (author_id, created_at desc);
create index posts_time on public.posts (created_at desc);

create table public.reactions (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index reactions_user on public.reactions (user_id);

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index comments_post on public.comments (post_id, created_at);
create index comments_author on public.comments (author_id);

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  post_id     uuid references public.posts (id) on delete set null,
  comment_id  uuid references public.comments (id) on delete set null,
  profile_id  uuid references public.profiles (id) on delete set null,
  reason      text not null default '' check (char_length(reason) <= 500),
  created_at  timestamptz not null default now()
);
create index reports_reporter on public.reports (reporter_id);
create index reports_post on public.reports (post_id);
create index reports_comment on public.reports (comment_id);
create index reports_profile on public.reports (profile_id);

-- photo lookups used by the storage policy
create index items_photo on public.items ((data ->> 'photo'));
create index items_photos on public.items using gin ((data -> 'photos'));

-- ---------- row level security ----------
alter table public.posts     enable row level security;
alter table public.reactions enable row level security;
alter table public.comments  enable row level security;
alter table public.reports   enable row level security;

create policy "see posts on boards you can see" on public.posts
  for select to authenticated using (private.can_view_board(board_id));
create policy "post your own boards" on public.posts
  for insert to authenticated
  with check (author_id = (select auth.uid())
              and exists (select 1 from public.boards b where b.id = board_id and b.owner_id = (select auth.uid())));
create policy "edit your own posts" on public.posts
  for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "delete your own posts" on public.posts
  for delete to authenticated using (author_id = (select auth.uid()));

create policy "see magnets on posts you can see" on public.reactions
  for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and private.can_view_board(p.board_id)));
create policy "give a magnet as yourself" on public.reactions
  for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.posts p where p.id = post_id and private.can_view_board(p.board_id)));
create policy "take back your magnet" on public.reactions
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "see comments on posts you can see" on public.comments
  for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and private.can_view_board(p.board_id)));
create policy "comment as yourself" on public.comments
  for insert to authenticated
  with check (author_id = (select auth.uid())
              and exists (select 1 from public.posts p where p.id = post_id and private.can_view_board(p.board_id)));
create policy "delete your comments or comments on your posts" on public.comments
  for delete to authenticated
  using (author_id = (select auth.uid())
         or exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid())));

create policy "file reports as yourself" on public.reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));

-- ---------- avatars (public pictures) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "upload your own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "replace your own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "delete your own avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------- live editing ----------
alter table public.items replica identity full;
alter publication supabase_realtime add table public.items;

-- ---------- read functions (run as the caller, so RLS still applies) ----------
create or replace function public.posts_feed(
  p_kind text default 'explore', p_author uuid default null, p_post uuid default null,
  p_before timestamptz default null, p_limit integer default 20)
returns table (
  post_id uuid, board_id uuid, caption text, created_at timestamptz,
  author_id uuid, username text, display_name text, avatar_path text,
  board_kind text, board_day date, board_title text, background text, visibility text,
  magnets bigint, comment_count bigint, i_reacted boolean, items jsonb)
language sql stable security invoker set search_path = '' as $$
  select p.id, b.id, p.caption, p.created_at,
         pr.id, pr.username, pr.display_name, pr.avatar_path,
         b.kind, b.day, b.title, b.background, b.visibility,
         (select count(*) from public.reactions r where r.post_id = p.id),
         (select count(*) from public.comments c where c.post_id = p.id),
         exists (select 1 from public.reactions r where r.post_id = p.id and r.user_id = (select auth.uid())),
         coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'type', i.type, 'z', i.z, 'data', i.data) order by i.z)
                     from public.items i where i.board_id = b.id), '[]'::jsonb)
    from public.posts p
    join public.boards b on b.id = p.board_id
    join public.profiles pr on pr.id = p.author_id
   where (p_post is null or p.id = p_post)
     and (p_author is null or p.author_id = p_author)
     and (p_kind <> 'following' or p.author_id = (select auth.uid())
          or exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = p.author_id))
     and (p_kind <> 'explore' or b.visibility = 'public')
     and (p_before is null or p.created_at < p_before)
   order by p.created_at desc
   limit least(greatest(p_limit, 1), 50);
$$;

create or replace function public.profile_by_username(p_username text)
returns table (
  id uuid, username text, display_name text, bio text, avatar_path text,
  followers bigint, following bigint, posts bigint, i_follow boolean, follows_me boolean)
language sql stable security invoker set search_path = '' as $$
  select pr.id, pr.username, pr.display_name, pr.bio, pr.avatar_path,
         (select count(*) from public.follows f where f.followee_id = pr.id),
         (select count(*) from public.follows f where f.follower_id = pr.id),
         (select count(*) from public.posts p where p.author_id = pr.id),
         exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = pr.id),
         exists (select 1 from public.follows f where f.follower_id = pr.id and f.followee_id = (select auth.uid()))
    from public.profiles pr
   where pr.username = lower(p_username);
$$;

create or replace function public.board_info(p_board uuid)
returns table (
  id uuid, kind text, day date, title text, background text, visibility text,
  owner_id uuid, owner_username text, owner_name text, owner_avatar text, my_role text, post_id uuid)
language sql stable security invoker set search_path = '' as $$
  select b.id, b.kind, b.day, b.title, b.background, b.visibility,
         pr.id, pr.username, pr.display_name, pr.avatar_path,
         case when b.owner_id = (select auth.uid()) then 'owner'
              else coalesce((select m.role from public.board_members m where m.board_id = b.id and m.user_id = (select auth.uid())), 'guest') end,
         (select p.id from public.posts p where p.board_id = b.id)
    from public.boards b
    join public.profiles pr on pr.id = b.owner_id
   where b.id = p_board;
$$;

create or replace function public.board_people(p_board uuid)
returns table (user_id uuid, username text, display_name text, avatar_path text, role text)
language sql stable security invoker set search_path = '' as $$
  select pr.id, pr.username, pr.display_name, pr.avatar_path, 'owner'
    from public.boards b join public.profiles pr on pr.id = b.owner_id where b.id = p_board
  union all
  select pr.id, pr.username, pr.display_name, pr.avatar_path, m.role
    from public.board_members m join public.profiles pr on pr.id = m.user_id where m.board_id = p_board;
$$;

create or replace function public.my_shared_boards()
returns table (
  board_id uuid, title text, owner_id uuid, owner_username text, owner_name text,
  my_role text, people bigint, item_count bigint, updated_at timestamptz, preview text)
language sql stable security invoker set search_path = '' as $$
  select b.id, b.title, b.owner_id, pr.username, pr.display_name,
         case when b.owner_id = (select auth.uid()) then 'owner'
              else (select m.role from public.board_members m where m.board_id = b.id and m.user_id = (select auth.uid())) end,
         1 + (select count(*) from public.board_members m where m.board_id = b.id),
         (select count(*) from public.items i where i.board_id = b.id),
         b.updated_at,
         (select coalesce(i.data ->> 'photo', i.data -> 'photos' ->> 0) from public.items i
           where i.board_id = b.id and i.type in ('photo', 'booth') order by i.created_at limit 1)
    from public.boards b
    join public.profiles pr on pr.id = b.owner_id
   where b.kind = 'shared'
     and (b.owner_id = (select auth.uid())
          or exists (select 1 from public.board_members m where m.board_id = b.id and m.user_id = (select auth.uid())))
   order by b.updated_at desc;
$$;

create or replace function public.post_comments(p_post uuid)
returns table (id uuid, body text, created_at timestamptz, author_id uuid, username text, display_name text, avatar_path text)
language sql stable security invoker set search_path = '' as $$
  select c.id, c.body, c.created_at, pr.id, pr.username, pr.display_name, pr.avatar_path
    from public.comments c join public.profiles pr on pr.id = c.author_id
   where c.post_id = p_post
   order by c.created_at;
$$;

create or replace function public.my_activity()
returns table (kind text, at timestamptz, actor_id uuid, username text, display_name text, avatar_path text,
               post_id uuid, board_id uuid, body text)
language sql stable security invoker set search_path = '' as $$
  select * from (
    select 'follow'::text, f.created_at, pr.id, pr.username, pr.display_name, pr.avatar_path, null::uuid, null::uuid, null::text
      from public.follows f join public.profiles pr on pr.id = f.follower_id
     where f.followee_id = (select auth.uid())
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
  ) a
  order by 2 desc
  limit 40;
$$;

revoke execute on function public.posts_feed(text, uuid, uuid, timestamptz, integer) from public, anon;
revoke execute on function public.profile_by_username(text) from public, anon;
revoke execute on function public.board_info(uuid) from public, anon;
revoke execute on function public.board_people(uuid) from public, anon;
revoke execute on function public.my_shared_boards() from public, anon;
revoke execute on function public.post_comments(uuid) from public, anon;
revoke execute on function public.my_activity() from public, anon;
grant execute on function public.posts_feed(text, uuid, uuid, timestamptz, integer) to authenticated;
grant execute on function public.profile_by_username(text) to authenticated;
grant execute on function public.board_info(uuid) to authenticated;
grant execute on function public.board_people(uuid) to authenticated;
grant execute on function public.my_shared_boards() to authenticated;
grant execute on function public.post_comments(uuid) to authenticated;
grant execute on function public.my_activity() to authenticated;
