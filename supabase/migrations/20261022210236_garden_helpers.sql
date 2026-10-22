-- Golden Bloom · private helpers, counters and live updates (see garden_tables for the overview).

-- ---------------------------------------------------------------------------
-- Helpers (private)
-- ---------------------------------------------------------------------------

create function private.fail(p_code text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception using message = p_code, errcode = 'P0001';
end;
$$;

-- Trim, drop control characters, keep at most one empty line in a row.
create function private.clean_text(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(btrim(
    regexp_replace(
      regexp_replace(
        regexp_replace(replace(coalesce(p_text, ''), E'\r\n', E'\n'), '[\x01-\x09\x0b-\x1f\x7f]', ' ', 'g'),
        '[ ]{2,}', ' ', 'g'),
      E'\n{3,}', E'\n\n', 'g'),
    E' \n'), '')
$$;

-- Returns the first banned term of the given severity found in the text, or null.
-- The text is checked three ways so that "B1TCH", "b.i.t.c.h" and "biiitch" are caught too.
create function private.find_term(p_text text, p_severity text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_base text := lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_text, '')));
  v_plain text;
  v_leet text;
  v_joined text;
  v_hit text;
begin
  v_plain := btrim(regexp_replace(v_base, '[^a-z]+', ' ', 'g'));
  v_leet := btrim(regexp_replace(translate(v_base, '0134578@$!|€', 'oieastbasiie'), '[^a-z]+', ' ', 'g'));
  -- "f u c k" → "fuck": glue runs of single letters back together
  v_joined := regexp_replace(v_plain, '\m([a-z]) (?=[a-z]\M)', '\1', 'g');

  select t.term into v_hit
  from private.banned_terms t
  where t.severity = p_severity
    and (v_plain ~ t.pattern or v_leet ~ t.pattern or v_joined ~ t.pattern)
  limit 1;

  return v_hit;
end;
$$;

-- Links, emails, phone numbers and @handles are not allowed: notes stay about kindness, not contacts.
create function private.has_personal_info(p_text text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_text, '') ~* '(https?://|www\.|\m[a-z0-9-]+\.(com|fr|net|org|io|gg|xyz|link|site|online|ru|uk|de|es|it|tv)\M)'
      or coalesce(p_text, '') ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
      or coalesce(p_text, '') ~ '(\d[ .\-]?){9,}'
      or coalesce(p_text, '') ~* '(^|[^a-z0-9])@[a-z0-9_.]{3,}'
      or coalesce(p_text, '') ~* '\m(snap|snapchat|insta|instagram|tiktok|discord|whatsapp)\M\s*[:=@]'
$$;

create function private.member_by_key(p_key text)
returns private.members
language sql
stable
set search_path = ''
as $$
  select m.*
  from private.members m
  where p_key is not null
    and char_length(p_key) between 32 and 128
    and m.key_hash = extensions.digest(p_key, 'sha256')
$$;

create function private.require_member(p_key text)
returns private.members
language plpgsql
set search_path = ''
as $$
declare
  v_member private.members;
begin
  v_member := private.member_by_key(p_key);
  if v_member.id is null then
    perform private.fail('not_a_member');
  end if;
  if v_member.last_seen_at < now() - interval '1 hour' then
    update private.members set last_seen_at = now() where id = v_member.id;
  end if;
  return v_member;
end;
$$;

create function private.client_ip_hash()
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_headers jsonb;
  v_ip text;
begin
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    v_headers := null;
  end;
  if v_headers is null then
    return null;
  end if;
  v_ip := coalesce(
    v_headers ->> 'cf-connecting-ip',
    v_headers ->> 'x-real-ip',
    btrim(split_part(v_headers ->> 'x-forwarded-for', ',', 1))
  );
  if v_ip is null or v_ip = '' then
    return null;
  end if;
  return encode(extensions.digest(v_ip || (select value from private.settings where key = 'ip_salt'), 'sha256'), 'hex');
end;
$$;

-- Live updates for open pages. Realtime is a bonus: it must never block a write.
create function private.broadcast(p_event text, p_payload jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform realtime.send(p_payload, p_event, 'garden', false);
exception when others then
  null;
end;
$$;

create function private.clean_name(p_name text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
begin
  if char_length(v_name) < 1 or char_length(v_name) > 24 then
    perform private.fail('invalid_name');
  end if;
  if v_name !~ '^[[:alpha:]][[:alpha:] .''’-]*$' then
    perform private.fail('invalid_name');
  end if;
  if private.find_term(v_name, 'block') is not null or private.find_term(v_name, 'review') is not null then
    perform private.fail('unkind_name');
  end if;
  return v_name;
end;
$$;

-- The JSON shape of a note, as the website sees it. Never includes who wrote an anonymous note.
create function private.card(p_note private.notes, p_member uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_note.id,
    'category', p_note.category,
    'body', p_note.body,
    'recipient', p_note.recipient,
    'author', p_note.author_name,
    'paper', p_note.paper,
    'hearts', p_note.like_count,
    'shares', p_note.share_count,
    'created_at', p_note.created_at,
    'is_seed', p_note.is_seed,
    'liked', p_member is not null and exists (
      select 1 from private.likes l where l.note_id = p_note.id and l.member_id = p_member
    ),
    'mine', p_member is not null and p_note.author_id is not distinct from p_member,
    'status', case when p_member is not null and p_note.author_id = p_member then p_note.status end
  )
$$;

create function private.profile(p_member private.members)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_member.id,
    'first_name', p_member.first_name,
    'age', p_member.age,
    'gender', p_member.gender,
    'is_moderator', p_member.is_moderator,
    'joined_at', p_member.created_at,
    'notes', (select count(*) from private.notes n where n.author_id = p_member.id and n.status <> 'removed'),
    'hearts_received', (select coalesce(sum(n.like_count), 0) from private.notes n where n.author_id = p_member.id and n.status <> 'removed'),
    'hearts_given', (select count(*) from private.likes l where l.member_id = p_member.id)
  )
$$;

-- ---------------------------------------------------------------------------
-- Counters and live updates
-- ---------------------------------------------------------------------------

create function private.on_like_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_note_id uuid := coalesce(new.note_id, old.note_id);
  v_count integer;
begin
  if tg_op = 'INSERT' then
    update private.notes set like_count = like_count + 1 where id = v_note_id returning like_count into v_count;
  else
    update private.notes set like_count = greatest(like_count - 1, 0) where id = v_note_id returning like_count into v_count;
  end if;
  if v_count is not null then
    perform private.broadcast('hearts', jsonb_build_object('id', v_note_id, 'hearts', v_count));
  end if;
  return null;
end;
$$;

create trigger likes_count_trg
after insert or delete on private.likes
for each row execute function private.on_like_change();

create function private.on_share_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update private.notes set share_count = share_count + 1 where id = new.note_id;
  return null;
end;
$$;

create trigger shares_count_trg
after insert on private.shares
for each row execute function private.on_share_insert();

-- Three reports hide a note until a moderator looks at it (unless a moderator already kept it).
create function private.on_report_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update private.notes
  set report_count = report_count + 1,
      status = case
        when status = 'visible' and not reviewed and report_count + 1 >= 3 then 'hidden'
        else status
      end
  where id = new.note_id;
  return null;
end;
$$;

create trigger reports_count_trg
after insert on private.reports
for each row execute function private.on_report_insert();

create function private.on_note_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'visible' then
      perform private.broadcast('note', jsonb_build_object('id', new.id, 'category', new.category));
    end if;
  elsif tg_op = 'UPDATE' then
    if old.status = 'visible' and new.status <> 'visible' then
      perform private.broadcast('gone', jsonb_build_object('id', new.id));
    elsif old.status <> 'visible' and new.status = 'visible' then
      perform private.broadcast('note', jsonb_build_object('id', new.id, 'category', new.category));
    end if;
  elsif tg_op = 'DELETE' then
    perform private.broadcast('gone', jsonb_build_object('id', old.id));
  end if;
  return null;
end;
$$;

create trigger notes_live_trg
after insert or update of status or delete on private.notes
for each row execute function private.on_note_change();
