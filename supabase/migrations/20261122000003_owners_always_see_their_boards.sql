-- The helper function reads the boards table with the statement's starting snapshot,
-- so a board that is being inserted is not yet visible to it. Check ownership on the
-- row itself first so `insert ... returning` works for the owner.
drop policy "see boards you are allowed to see" on public.boards;
create policy "see boards you are allowed to see" on public.boards
  for select to authenticated
  using (owner_id = (select auth.uid()) or private.can_view_board(id));
