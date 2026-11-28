-- A day can hold several boards ("pages"). Page 1 is the one every day already had.
alter table public.boards add column page smallint not null default 1 check (page between 1 and 20);
drop index if exists public.boards_owner_day;
create unique index boards_owner_day_page on public.boards (owner_id, day, page) where kind = 'day';

-- one row per day, adding up every board on that day
drop function if exists public.my_days();
create function public.my_days()
returns table (day date, item_count bigint, preview text, updated_at timestamptz, pages bigint)
language sql stable security invoker set search_path = '' as $$
  select b.day,
         count(i.id) as item_count,
         (select coalesce(p.data ->> 'photo', p.data -> 'photos' ->> 0)
            from public.items p join public.boards pb on pb.id = p.board_id
           where pb.owner_id = (select auth.uid()) and pb.kind = 'day' and pb.day = b.day
             and p.type in ('photo', 'booth')
           order by pb.page, p.created_at limit 1) as preview,
         max(b.updated_at),
         count(distinct b.id) filter (where i.id is not null)
    from public.boards b
    join public.items i on i.board_id = b.id
   where b.owner_id = (select auth.uid()) and b.kind = 'day'
   group by b.day
   order by b.day desc;
$$;
revoke execute on function public.my_days() from public, anon;
grant execute on function public.my_days() to authenticated;

-- every board of a day, with how much is on it
create function public.day_pages(p_day date)
returns table (board_id uuid, page smallint, item_count bigint)
language sql stable security invoker set search_path = '' as $$
  select b.id, b.page, (select count(*) from public.items i where i.board_id = b.id)
    from public.boards b
   where b.owner_id = (select auth.uid()) and b.kind = 'day' and b.day = p_day
   order by b.page;
$$;
revoke execute on function public.day_pages(date) from public, anon;
grant execute on function public.day_pages(date) to authenticated;

-- recap: include the page so the client can group boards by day
drop function if exists public.month_boards(date);
create function public.month_boards(p_month date)
returns table (day date, page smallint, background text, items jsonb, post_id uuid, magnets bigint)
language sql stable security invoker set search_path = '' as $$
  select b.day, b.page, b.background,
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
   order by b.day, b.page;
$$;
revoke execute on function public.month_boards(date) from public, anon;
grant execute on function public.month_boards(date) to authenticated;
