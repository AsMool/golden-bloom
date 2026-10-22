-- Golden Bloom · permissions (see garden_tables for the overview).

-- ---------------------------------------------------------------------------
-- Permissions: the website can only call the public functions above.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema private from public;
revoke all on all sequences in schema private from public;
revoke all on all functions in schema private from public;

do $$
declare
  v_role text;
begin
  foreach v_role in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = v_role) then
      execute format('revoke all on schema private from %I', v_role);
      execute format('revoke all on all tables in schema private from %I', v_role);
      execute format('revoke all on all functions in schema private from %I', v_role);
    end if;
  end loop;
end;
$$;

revoke all on function public.join_garden(text, integer, text) from public;
revoke all on function public.me(text) from public;
revoke all on function public.update_me(text, text, integer, text) from public;
revoke all on function public.leave_garden(text) from public;
revoke all on function public.list_notes(text, text, text, integer, integer) from public;
revoke all on function public.get_note(uuid, text) from public;
revoke all on function public.random_note(text, text, uuid) from public;
revoke all on function public.garden_stats() from public;
revoke all on function public.my_notes(text) from public;
revoke all on function public.loved_notes(text) from public;
revoke all on function public.post_note(text, text, text, text, text, boolean) from public;
revoke all on function public.toggle_like(text, uuid) from public;
revoke all on function public.record_share(uuid, text) from public;
revoke all on function public.report_note(text, uuid, text) from public;
revoke all on function public.delete_note(text, uuid) from public;
revoke all on function public.claim_moderator(text, text) from public;
revoke all on function public.moderation_queue(text) from public;
revoke all on function public.moderate_note(text, uuid, text) from public;

grant execute on function public.join_garden(text, integer, text) to anon, authenticated;
grant execute on function public.me(text) to anon, authenticated;
grant execute on function public.update_me(text, text, integer, text) to anon, authenticated;
grant execute on function public.leave_garden(text) to anon, authenticated;
grant execute on function public.list_notes(text, text, text, integer, integer) to anon, authenticated;
grant execute on function public.get_note(uuid, text) to anon, authenticated;
grant execute on function public.random_note(text, text, uuid) to anon, authenticated;
grant execute on function public.garden_stats() to anon, authenticated;
grant execute on function public.my_notes(text) to anon, authenticated;
grant execute on function public.loved_notes(text) to anon, authenticated;
grant execute on function public.post_note(text, text, text, text, text, boolean) to anon, authenticated;
grant execute on function public.toggle_like(text, uuid) to anon, authenticated;
grant execute on function public.record_share(uuid, text) to anon, authenticated;
grant execute on function public.report_note(text, uuid, text) to anon, authenticated;
grant execute on function public.delete_note(text, uuid) to anon, authenticated;
grant execute on function public.claim_moderator(text, text) to anon, authenticated;
grant execute on function public.moderation_queue(text) to anon, authenticated;
grant execute on function public.moderate_note(text, uuid, text) to anon, authenticated;
