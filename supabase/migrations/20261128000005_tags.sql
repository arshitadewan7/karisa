-- tagging people in posts, plus richer feed data (tags, comment previews, "magnet from")

create table public.post_tags (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  tagged_by  uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_tags_user on public.post_tags (user_id);
create index post_tags_by on public.post_tags (tagged_by);
alter table public.post_tags enable row level security;

-- people tagged in a post can always see that board, even if it's followers-only
create or replace function private.can_view_board(b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.boards bo
    where bo.id = b and (
      bo.owner_id = (select auth.uid())
      or bo.visibility = 'public'
      or (bo.visibility = 'followers' and exists (
            select 1 from public.follows f
            where f.follower_id = (select auth.uid()) and f.followee_id = bo.owner_id))
      or exists (select 1 from public.board_members m where m.board_id = bo.id and m.user_id = (select auth.uid()))
      or (bo.visibility <> 'private' and exists (
            select 1 from public.posts p join public.post_tags t on t.post_id = p.id
            where p.board_id = bo.id and t.user_id = (select auth.uid())))
    )
  );
$$;

create policy "see tags on posts you can see" on public.post_tags
  for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and private.can_view_board(p.board_id)));
create policy "post authors tag people" on public.post_tags
  for insert to authenticated
  with check (tagged_by = (select auth.uid())
              and exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid())));
create policy "authors remove tags, people untag themselves" on public.post_tags
  for delete to authenticated
  using (user_id = (select auth.uid())
         or exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid())));

drop function public.posts_feed(text, uuid, uuid, timestamptz, integer);
create function public.posts_feed(
  p_kind text default 'explore', p_author uuid default null, p_post uuid default null,
  p_before timestamptz default null, p_limit integer default 20, p_tagged uuid default null)
returns table (
  post_id uuid, board_id uuid, caption text, created_at timestamptz,
  author_id uuid, username text, display_name text, avatar_path text,
  board_kind text, board_day date, board_title text, background text, visibility text,
  magnets bigint, comment_count bigint, i_reacted boolean, items jsonb,
  tags jsonb, preview_comments jsonb, magnet_by text)
language sql stable security invoker set search_path = '' as $$
  select p.id, b.id, p.caption, p.created_at,
         pr.id, pr.username, pr.display_name, pr.avatar_path,
         b.kind, b.day, b.title, b.background, b.visibility,
         (select count(*) from public.reactions r where r.post_id = p.id),
         (select count(*) from public.comments c where c.post_id = p.id),
         exists (select 1 from public.reactions r where r.post_id = p.id and r.user_id = (select auth.uid())),
         coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'type', i.type, 'z', i.z, 'data', i.data) order by i.z)
                     from public.items i where i.board_id = b.id), '[]'::jsonb),
         coalesce((select jsonb_agg(jsonb_build_object('id', tp.id, 'username', tp.username, 'display_name', tp.display_name, 'avatar_path', tp.avatar_path) order by t.created_at)
                     from public.post_tags t join public.profiles tp on tp.id = t.user_id where t.post_id = p.id), '[]'::jsonb),
         coalesce((select jsonb_agg(jsonb_build_object('username', x.username, 'body', x.body) order by x.created_at)
                     from (select cp.username, c.body, c.created_at from public.comments c join public.profiles cp on cp.id = c.author_id
                            where c.post_id = p.id order by c.created_at desc limit 2) x), '[]'::jsonb),
         (select rp.username from public.reactions r join public.profiles rp on rp.id = r.user_id
           where r.post_id = p.id and r.user_id <> (select auth.uid())
           order by exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = r.user_id) desc, r.created_at desc
           limit 1)
    from public.posts p
    join public.boards b on b.id = p.board_id
    join public.profiles pr on pr.id = p.author_id
   where (p_post is null or p.id = p_post)
     and (p_author is null or p.author_id = p_author)
     and (p_tagged is null or exists (select 1 from public.post_tags t where t.post_id = p.id and t.user_id = p_tagged))
     and (p_kind <> 'following' or p.author_id = (select auth.uid())
          or exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = p.author_id))
     and (p_kind <> 'explore' or b.visibility = 'public')
     and (p_before is null or p.created_at < p_before)
   order by p.created_at desc
   limit least(greatest(p_limit, 1), 60);
$$;
revoke execute on function public.posts_feed(text, uuid, uuid, timestamptz, integer, uuid) from public, anon;
grant execute on function public.posts_feed(text, uuid, uuid, timestamptz, integer, uuid) to authenticated;

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
    union all
    select 'tag', t.created_at, pr.id, pr.username, pr.display_name, pr.avatar_path, t.post_id, p.board_id, null
      from public.post_tags t join public.posts p on p.id = t.post_id join public.profiles pr on pr.id = t.tagged_by
     where t.user_id = (select auth.uid()) and t.tagged_by <> (select auth.uid())
  ) a
  order by 2 desc
  limit 50;
$$;
