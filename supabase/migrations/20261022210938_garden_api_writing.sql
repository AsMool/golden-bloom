-- Golden Bloom · writing in the garden (see garden_tables for the overview).

-- ---------------------------------------------------------------------------
-- Public API: writing in the garden
-- ---------------------------------------------------------------------------

-- p_confirm: the note contains a word that is often unkind. The first call answers
-- 'please_confirm'; calling again with p_confirm = true posts it and lists it for moderators.
create function public.post_note(
  p_key text,
  p_category text,
  p_body text,
  p_recipient text default null,
  p_paper text default 'butter',
  p_confirm boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member private.members := private.require_member(p_key);
  v_body text := private.clean_text(p_body);
  v_recipient text := case when p_category = 'from_me_to_you' then private.clean_text(p_recipient) end;
  v_paper text := case when p_paper in ('butter', 'cream', 'blush', 'sage', 'sky') then p_paper else 'butter' end;
  v_review boolean;
  v_note private.notes;
begin
  if p_category is null or p_category not in (
    'confidence_boost', 'bad_day_comfort', 'body_love_letters',
    'you_are_not_alone', 'mirror_talk', 'from_me_to_you'
  ) then
    perform private.fail('invalid_category');
  end if;
  if v_body is null or char_length(v_body) < 3 then
    perform private.fail('too_short');
  end if;
  if char_length(v_body) > 280 then
    perform private.fail('too_long');
  end if;
  if v_recipient is not null and char_length(v_recipient) > 40 then
    perform private.fail('too_long');
  end if;

  if private.find_term(v_body, 'block') is not null
     or private.find_term(v_recipient, 'block') is not null then
    perform private.fail('unkind_words');
  end if;
  if private.has_personal_info(v_body) or private.has_personal_info(v_recipient) then
    perform private.fail('personal_info');
  end if;

  if (select count(*) from private.notes
      where author_id = v_member.id and created_at > now() - interval '10 minutes') >= 6
     or (select count(*) from private.notes
      where author_id = v_member.id and created_at > now() - interval '1 day') >= 40
     or (select count(*) from private.notes where created_at > now() - interval '1 minute') >= 60 then
    perform private.fail('slow_down');
  end if;
  if exists (
    select 1 from private.notes
    where author_id = v_member.id and lower(body) = lower(v_body) and created_at > now() - interval '1 day'
  ) then
    perform private.fail('duplicate');
  end if;

  v_review := private.find_term(v_body, 'review') is not null
           or private.find_term(v_recipient, 'review') is not null;
  if v_review and not coalesce(p_confirm, false) then
    perform private.fail('please_confirm');
  end if;

  insert into private.notes (author_id, author_name, category, body, recipient, paper, needs_review)
  values (
    v_member.id,
    case when p_category = 'from_me_to_you' then null else v_member.first_name end,
    p_category,
    v_body,
    v_recipient,
    v_paper,
    v_review
  )
  returning * into v_note;

  return private.card(v_note, v_member.id);
end;
$$;

create function public.toggle_like(p_key text, p_note_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member private.members := private.require_member(p_key);
  v_liked boolean;
  v_hearts integer;
begin
  if not exists (select 1 from private.notes where id = p_note_id and status = 'visible') then
    perform private.fail('not_found');
  end if;

  if (select count(*) from private.likes
      where member_id = v_member.id and updated_at > now() - interval '1 minute') >= 40 then
    perform private.fail('slow_down');
  end if;
  insert into private.likes as l (note_id, member_id)
  values (p_note_id, v_member.id)
  on conflict (note_id, member_id) do update set active = not l.active, updated_at = now()
  returning l.active into v_liked;

  select like_count into v_hearts from private.notes where id = p_note_id;
  return jsonb_build_object('liked', v_liked, 'hearts', v_hearts);
end;
$$;

-- Counts a share once per member. Visitors who have not joined can share too, they just don't count.
create function public.record_share(p_note_id uuid, p_key text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member uuid := (private.member_by_key(p_key)).id;
  v_shares integer;
begin
  if v_member is not null and exists (select 1 from private.notes where id = p_note_id and status = 'visible') then
    insert into private.shares (note_id, member_id) values (p_note_id, v_member) on conflict do nothing;
  end if;
  select share_count into v_shares from private.notes where id = p_note_id and status = 'visible';
  return jsonb_build_object('shares', coalesce(v_shares, 0));
end;
$$;

create function public.report_note(p_key text, p_note_id uuid, p_reason text default 'other')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member private.members := private.require_member(p_key);
  v_reason text := case when p_reason in ('mean', 'body_shaming', 'personal_info', 'spam', 'other') then p_reason else 'other' end;
  v_status text;
begin
  if not exists (select 1 from private.notes where id = p_note_id and status <> 'removed') then
    perform private.fail('not_found');
  end if;
  if (select count(*) from private.reports
      where member_id = v_member.id and created_at > now() - interval '1 hour') >= 15 then
    perform private.fail('slow_down');
  end if;
  insert into private.reports (note_id, member_id, reason)
  select p_note_id, v_member.id, v_reason
  where not exists (select 1 from private.notes where id = p_note_id and author_id = v_member.id)
  on conflict do nothing;
  select status into v_status from private.notes where id = p_note_id;
  return jsonb_build_object('reported', true, 'hidden', v_status <> 'visible');
end;
$$;

-- Authors can take back their own notes. Moderators can take down any note.
create function public.delete_note(p_key text, p_note_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member private.members := private.require_member(p_key);
begin
  if not v_member.is_moderator
     and not exists (select 1 from private.notes where id = p_note_id and author_id = v_member.id) then
    perform private.fail('not_allowed');
  end if;
  update private.notes set status = 'removed' where id = p_note_id and status <> 'removed';
  return found;
end;
$$;
