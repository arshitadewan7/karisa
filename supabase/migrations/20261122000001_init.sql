-- magnet diary: core schema
-- Every photo, note and sticker is its own row in `items`, so several people
-- can edit one board without overwriting each other.

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text unique check (username ~ '^[a-z0-9_.]{3,24}$'),
  display_name text not null default '',
  bio          text not null default '' check (char_length(bio) <= 280),
  avatar_path  text,
  diary_title  text not null default '' check (char_length(diary_title) <= 60),
  created_at   timestamptz not null default now()
);

create table public.boards (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  kind        text not null default 'day' check (kind in ('day', 'shared')),
  day         date,
  title       text not null default '' check (char_length(title) <= 80),
  background  text not null default 'silver' check (char_length(background) <= 20),
  visibility  text not null default 'private' check (visibility in ('private', 'followers', 'public')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (kind <> 'day' or day is not null)
);
create unique index boards_owner_day on public.boards (owner_id, day) where kind = 'day';
create index boards_owner on public.boards (owner_id);

create table public.board_members (
  board_id   uuid not null references public.boards (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       text not null default 'editor' check (role in ('editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (board_id, user_id)
);
create index board_members_user on public.board_members (user_id);

create table public.items (
  id         uuid primary key,
  board_id   uuid not null references public.boards (id) on delete cascade,
  author_id  uuid references public.profiles (id) on delete set null,
  type       text not null check (type in ('photo', 'booth', 'note', 'sticker', 'text')),
  data       jsonb not null default '{}'::jsonb check (pg_column_size(data) < 32768),
  z          integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index items_board on public.items (board_id);
create index items_author on public.items (author_id);

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee on public.follows (followee_id);

-- ---------- access helpers ----------
create or replace function public.can_view_board(b uuid)
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
    )
  );
$$;

create or replace function public.can_edit_board(b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.boards bo
    where bo.id = b and (
      bo.owner_id = (select auth.uid())
      or exists (select 1 from public.board_members m
                 where m.board_id = bo.id and m.user_id = (select auth.uid()) and m.role = 'editor')
    )
  );
$$;

revoke execute on function public.can_view_board(uuid) from anon;
revoke execute on function public.can_edit_board(uuid) from anon;

-- ---------- row level security ----------
alter table public.profiles      enable row level security;
alter table public.boards        enable row level security;
alter table public.board_members enable row level security;
alter table public.items         enable row level security;
alter table public.follows       enable row level security;

create policy "profiles are visible to signed-in people" on public.profiles
  for select to authenticated using (true);
create policy "people edit their own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "see boards you are allowed to see" on public.boards
  for select to authenticated using (public.can_view_board(id));
create policy "create your own boards" on public.boards
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "owners update their boards" on public.boards
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "owners delete their boards" on public.boards
  for delete to authenticated using (owner_id = (select auth.uid()));

create policy "see members of boards you can see" on public.board_members
  for select to authenticated using (public.can_view_board(board_id));
create policy "owners invite members" on public.board_members
  for insert to authenticated
  with check (exists (select 1 from public.boards b where b.id = board_id and b.owner_id = (select auth.uid())));
create policy "owners remove members, members can leave" on public.board_members
  for delete to authenticated
  using (user_id = (select auth.uid())
         or exists (select 1 from public.boards b where b.id = board_id and b.owner_id = (select auth.uid())));

create policy "see items on boards you can see" on public.items
  for select to authenticated using (public.can_view_board(board_id));
create policy "editors add items as themselves" on public.items
  for insert to authenticated with check (author_id = (select auth.uid()) and public.can_edit_board(board_id));
create policy "editors change items" on public.items
  for update to authenticated using (public.can_edit_board(board_id)) with check (public.can_edit_board(board_id));
create policy "editors remove items" on public.items
  for delete to authenticated using (public.can_edit_board(board_id));

create policy "follows are visible to signed-in people" on public.follows
  for select to authenticated using (true);
create policy "follow as yourself" on public.follows
  for insert to authenticated with check (follower_id = (select auth.uid()));
create policy "unfollow as yourself" on public.follows
  for delete to authenticated using (follower_id = (select auth.uid()));

-- ---------- triggers ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger items_touch before update on public.items for each row execute function public.touch_updated_at();
create trigger boards_touch before update on public.boards for each row execute function public.touch_updated_at();

-- a board's "last changed" time follows its items
create or replace function public.bump_board()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.boards set updated_at = now() where id = coalesce(new.board_id, old.board_id);
  return null;
end;
$$;
create trigger items_bump_board after insert or update or delete on public.items
  for each row execute function public.bump_board();

-- ---------- the "days" list ----------
create or replace function public.my_days()
returns table (day date, item_count bigint, preview text, updated_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select b.day,
         count(i.id) as item_count,
         (select coalesce(p.data ->> 'photo', p.data -> 'photos' ->> 0)
            from public.items p
           where p.board_id = b.id and p.type in ('photo', 'booth')
           order by p.created_at limit 1) as preview,
         b.updated_at
    from public.boards b
    join public.items i on i.board_id = b.id
   where b.owner_id = (select auth.uid()) and b.kind = 'day'
   group by b.id
   order by b.day desc;
$$;

-- ---------- photo storage (private) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 15728640, array['image/jpeg', 'image/png', 'image/webp']);

create policy "upload photos into your own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "see your photos and photos on boards you can see" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos' and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.items i
        where (i.data ->> 'photo' = name or i.data -> 'photos' ? name)
          and public.can_view_board(i.board_id))
    )
  );

create policy "delete your own photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
