-- Golden Bloom · moderators (see garden_tables for the overview).

-- ---------------------------------------------------------------------------
-- Public API: moderators
-- ---------------------------------------------------------------------------

create function public.claim_moderator(p_key text, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member private.members := private.require_member(p_key);
  v_hash text := (select value from private.settings where key = 'moderator_passcode_hash');
begin
  if (select count(*) from private.moderator_attempts
      where member_id = v_member.id and created_at > now() - interval '1 hour') >= 5 then
    perform private.fail('slow_down');
  end if;
  insert into private.moderator_attempts (member_id) values (v_member.id);
  -- A wrong code is an answer, not an error: raising would roll back the attempt logged above.
  if v_hash is null or p_code is null or extensions.crypt(btrim(p_code), v_hash) <> v_hash then
    return jsonb_build_object('ok', false, 'error', 'wrong_code');
  end if;
  update private.members set is_moderator = true where id = v_member.id returning * into v_member;
  return jsonb_build_object('ok', true, 'member', private.profile(v_member));
end;
$$;

create function public.moderation_queue(p_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member private.members := private.require_member(p_key);
begin
  if not v_member.is_moderator then
    perform private.fail('not_allowed');
  end if;
  return coalesce((
    select jsonb_agg(
      private.card(n, v_member.id) || jsonb_build_object(
        'status', n.status,
        'reports', n.report_count,
        'needs_review', n.needs_review,
        'reasons', coalesce((
          select jsonb_object_agg(r.reason, r.total)
          from (select reason, count(*) as total from private.reports where note_id = n.id group by reason) r
        ), '{}'::jsonb)
      )
      order by (n.status = 'hidden') desc, n.report_count desc, n.created_at desc
    )
    from private.notes n
    where n.status = 'hidden'
       or (n.status = 'visible' and not n.reviewed and (n.report_count > 0 or n.needs_review))
  ), '[]'::jsonb);
end;
$$;

-- p_action: 'keep' (put back in the garden, stop auto-hiding) · 'remove' (take it down)
create function public.moderate_note(p_key text, p_note_id uuid, p_action text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member private.members := private.require_member(p_key);
begin
  if not v_member.is_moderator then
    perform private.fail('not_allowed');
  end if;
  if p_action = 'keep' then
    update private.notes set status = 'visible', reviewed = true, needs_review = false where id = p_note_id;
  elsif p_action = 'remove' then
    update private.notes set status = 'removed' where id = p_note_id;
  else
    perform private.fail('invalid_action');
  end if;
  return found;
end;
$$;

-- Run from the SQL editor to set or change the moderator code:
--   select private.set_moderator_passcode('your-code');
create function private.set_moderator_passcode(p_code text)
returns void
language sql
set search_path = ''
as $$
  insert into private.settings (key, value)
  values ('moderator_passcode_hash', extensions.crypt(btrim(p_code), extensions.gen_salt('bf', 8)))
  on conflict (key) do update set value = excluded.value;
$$;
