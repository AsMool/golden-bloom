-- Golden Bloom · first name + last name + password (see garden_tables for the overview).
--
-- Members now join with a first name, a last name, an age, a gender and a password, and can log in
-- again from any device with first name + last name + password. The garden key stays as the
-- invisible "this browser is logged in" token: every login gives a new one, so a second device
-- doesn't log the first one out.
--
-- Notes show "Sarah M." (first name + the initial of the last name), never the full last name.
--
-- The old join_garden and update_me are replaced by sign_up and update_profile (new names, so no
-- two versions of the same function exist); the old ones are switched off at the end.

alter table private.members add column last_name text;
-- "marielou|martin": names without accents, spaces or dashes, so two people can't take the same name.
alter table private.members add column login_name text;
alter table private.members add column password_hash text;
alter table private.members add constraint members_last_name_check
  check (last_name is null or char_length(last_name) between 1 and 24);
create unique index members_login_name_idx on private.members (login_name) where login_name is not null;

-- One row per logged-in browser.
create table private.sessions (
  key_hash bytea primary key,
  member_id uuid not null references private.members (id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index sessions_member_idx on private.sessions (member_id);

create table private.login_attempts (
  id bigint generated always as identity primary key,
  login_name text,
  ip_hash text,
  ok boolean not null,
  created_at timestamptz not null default now()
);
create index login_attempts_name_idx on private.login_attempts (login_name, created_at desc);
create index login_attempts_ip_idx on private.login_attempts (ip_hash, created_at desc);

alter table private.sessions enable row level security;
alter table private.login_attempts enable row level security;
revoke all on private.sessions, private.login_attempts from public;

-- ---------------------------------------------------------------------------
-- Helpers (private)
-- ---------------------------------------------------------------------------

create function private.clean_last_name(p_name text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
begin
  if char_length(v_name) < 1 or char_length(v_name) > 24 or v_name !~ '^[[:alpha:]][[:alpha:] .''’-]*$' then
    perform private.fail('invalid_last_name');
  end if;
  if private.find_term(v_name, 'block') is not null or private.find_term(v_name, 'review') is not null then
    perform private.fail('unkind_name');
  end if;
  return v_name;
end;
$$;

create function private.login_name(p_first text, p_last text)
returns text
language sql
stable
set search_path = ''
as $$
  select regexp_replace(lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_first, ''))), '[^a-z]+', '', 'g')
      || '|'
      || regexp_replace(lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_last, ''))), '[^a-z]+', '', 'g')
$$;

-- "Sarah M."
create function private.display_name(p_first text, p_last text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(p_last, '') = '' then p_first
    else p_first || ' ' || upper(left(p_last, 1)) || '.'
  end
$$;

create function private.check_password(p_password text, p_first text, p_last text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_plain text := lower(coalesce(p_password, ''));
begin
  if char_length(coalesce(p_password, '')) < 6 or char_length(p_password) > 50 then
    perform private.fail('weak_password');
  end if;
  if v_plain in (lower(coalesce(p_first, '')), lower(coalesce(p_last, '')))
     or v_plain in ('123456', '1234567', '12345678', '111111', '000000', '123123', 'password', 'motdepasse',
                    'azerty', 'azerty123', 'qwerty', 'qwerty123', 'abc123', 'abcdef', 'golden bloom', 'goldenbloom') then
    perform private.fail('weak_password');
  end if;
end;
$$;

create function private.new_session(p_member_id uuid)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_key text := 'gb_' || encode(extensions.gen_random_bytes(32), 'hex');
begin
  insert into private.sessions (key_hash, member_id) values (extensions.digest(v_key, 'sha256'), p_member_id);
  return v_key;
end;
$$;

-- Too many wrong passwords for one name, or from one network, and everyone has to wait a little.
create function private.check_login_rate(p_login text, p_ip_hash text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from private.login_attempts
      where login_name = p_login and not ok and created_at > now() - interval '15 minutes') >= 8 then
    perform private.fail('slow_down');
  end if;
  if p_ip_hash is not null and (select count(*) from private.login_attempts
      where ip_hash = p_ip_hash and not ok and created_at > now() - interval '10 minutes') >= 40 then
    perform private.fail('slow_down');
  end if;
end;
$$;

-- Signed notes always carry the author's current display name.
create function private.set_author_name()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.author_id is not null and new.author_name is not null then
    select private.display_name(m.first_name, m.last_name) into new.author_name
    from private.members m where m.id = new.author_id;
  end if;
  return new;
end;
$$;
create trigger notes_author_name before insert on private.notes
  for each row execute function private.set_author_name();

-- A garden key now belongs to a logged-in browser (or, for the oldest members, to the member).
-- members.key_hash stays for them; new members get a random placeholder that nobody holds.
create or replace function private.member_by_key(p_key text)
returns private.members
language sql
stable
set search_path = ''
as $$
  select m.*
  from private.members m
  where p_key is not null
    and char_length(p_key) between 32 and 128
    and m.left_at is null
    and (
      m.key_hash = extensions.digest(p_key, 'sha256')
      or exists (
        select 1 from private.sessions s
        where s.member_id = m.id
          and s.key_hash = extensions.digest(p_key, 'sha256')
          and s.revoked_at is null
          and s.created_at > now() - interval '180 days'
      )
    )
$$;

create or replace function private.profile(p_member private.members)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_member.id,
    'first_name', p_member.first_name,
    'last_name', p_member.last_name,
    'display_name', private.display_name(p_member.first_name, p_member.last_name),
    'age', p_member.age,
    'gender', p_member.gender,
    'is_moderator', p_member.is_moderator,
    'joined_at', p_member.created_at,
    'notes', (select count(*) from private.notes n where n.author_id = p_member.id and n.status <> 'removed'),
    'hearts_received', (select coalesce(sum(n.like_count), 0) from private.notes n where n.author_id = p_member.id and n.status <> 'removed'),
    'hearts_given', (select count(*) from private.likes l where l.member_id = p_member.id and l.active)
  )
$$;

-- ---------------------------------------------------------------------------
-- Public API: accounts
-- ---------------------------------------------------------------------------

create function public.sign_up(p_first_name text, p_last_name text, p_age integer, p_gender text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_first text := private.clean_name(p_first_name);
  v_last text := private.clean_last_name(p_last_name);
  v_login text;
  v_ip_hash text := private.client_ip_hash();
  v_member private.members;
begin
  if p_age is null or p_age < 10 or p_age > 99 then
    perform private.fail('invalid_age');
  end if;
  if p_gender is null or p_gender not in ('girl', 'boy', 'non_binary', 'prefer_not_to_say') then
    perform private.fail('invalid_gender');
  end if;
  perform private.check_password(p_password, v_first, v_last);
  v_login := private.login_name(v_first, v_last);

  if v_ip_hash is not null and (
    select count(*) from private.join_log
    where ip_hash = v_ip_hash and created_at > now() - interval '10 minutes'
  ) >= 60 then
    perform private.fail('slow_down');
  end if;
  if (select count(*) from private.join_log where created_at > now() - interval '10 minutes') >= 300 then
    perform private.fail('slow_down');
  end if;

  if exists (select 1 from private.members where login_name = v_login) then
    perform private.fail('name_taken');
  end if;
  insert into private.join_log (ip_hash) values (v_ip_hash);

  begin
    insert into private.members (key_hash, first_name, last_name, login_name, password_hash, age, gender)
    values (extensions.digest(extensions.gen_random_bytes(32), 'sha256'), v_first, v_last, v_login,
            extensions.crypt(p_password, extensions.gen_salt('bf', 10)), p_age, p_gender)
    returning * into v_member;
  exception when unique_violation then
    perform private.fail('name_taken');
  end;

  return jsonb_build_object('key', private.new_session(v_member.id), 'member', private.profile(v_member));
end;
$$;

-- A wrong name or password is an answer, not an error: raising would roll back the attempt that was just logged.
create function public.log_in(p_first_name text, p_last_name text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_login text := private.login_name(p_first_name, p_last_name);
  v_ip_hash text := private.client_ip_hash();
  v_member private.members;
  v_ok boolean;
begin
  if char_length(coalesce(p_password, '')) > 200 or char_length(coalesce(p_first_name, '')) > 80 or char_length(coalesce(p_last_name, '')) > 80 then
    return jsonb_build_object('ok', false, 'error', 'wrong_login');
  end if;
  perform private.check_login_rate(v_login, v_ip_hash);

  select * into v_member from private.members where login_name = v_login and left_at is null;
  if v_member.id is null then
    -- same work as a real check, so a missing name takes as long as a wrong password
    perform extensions.crypt(coalesce(p_password, ''), extensions.gen_salt('bf', 10));
    v_ok := false;
  else
    v_ok := v_member.password_hash is not null
        and extensions.crypt(coalesce(p_password, ''), v_member.password_hash) = v_member.password_hash;
  end if;

  insert into private.login_attempts (login_name, ip_hash, ok) values (v_login, v_ip_hash, v_ok);
  if not v_ok then
    return jsonb_build_object('ok', false, 'error', 'wrong_login');
  end if;
  update private.members set last_seen_at = now() where id = v_member.id;
  return jsonb_build_object('ok', true, 'key', private.new_session(v_member.id), 'member', private.profile(v_member));
end;
$$;

create function public.update_profile(p_key text, p_first_name text, p_last_name text, p_age integer, p_gender text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member private.members := private.require_member(p_key);
  v_first text := private.clean_name(p_first_name);
  v_last text := private.clean_last_name(p_last_name);
  v_login text := private.login_name(v_first, v_last);
begin
  if p_age is null or p_age < 10 or p_age > 99 then
    perform private.fail('invalid_age');
  end if;
  if p_gender is null or p_gender not in ('girl', 'boy', 'non_binary', 'prefer_not_to_say') then
    perform private.fail('invalid_gender');
  end if;
  if exists (select 1 from private.members where login_name = v_login and id <> v_member.id) then
    perform private.fail('name_taken');
  end if;
  begin
    update private.members
    set first_name = v_first, last_name = v_last, login_name = v_login, age = p_age, gender = p_gender
    where id = v_member.id
    returning * into v_member;
  exception when unique_violation then
    perform private.fail('name_taken');
  end;
  -- Signed notes follow the new name. Anonymous notes stay anonymous.
  update private.notes
  set author_name = private.display_name(v_first, v_last)
  where author_id = v_member.id and author_name is not null;
  return private.profile(v_member);
end;
$$;

-- Other browsers stay logged in; the one making the change keeps its key.
create function public.change_password(p_key text, p_old_password text, p_new_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member private.members := private.require_member(p_key);
  v_ip_hash text := private.client_ip_hash();
  v_ok boolean;
begin
  perform private.check_login_rate(v_member.login_name, v_ip_hash);
  v_ok := v_member.password_hash is not null
      and extensions.crypt(coalesce(p_old_password, ''), v_member.password_hash) = v_member.password_hash;
  if not v_ok then
    insert into private.login_attempts (login_name, ip_hash, ok) values (v_member.login_name, v_ip_hash, false);
    return jsonb_build_object('ok', false, 'error', 'wrong_password');
  end if;
  perform private.check_password(p_new_password, v_member.first_name, v_member.last_name);
  update private.members
  set password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf', 10))
  where id = v_member.id;
  return jsonb_build_object('ok', true);
end;
$$;

-- For moderators: someone forgot their password. Gives them a temporary one to hand over,
-- and logs that person out everywhere.
create function public.reset_password(p_key text, p_first_name text, p_last_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mod private.members := private.require_member(p_key);
  v_target private.members;
  v_letters text := 'abcdefghjkmnpqrstuvwxyz23456789';
  v_temp text := '';
begin
  if not v_mod.is_moderator then
    perform private.fail('not_allowed');
  end if;
  select * into v_target from private.members
  where login_name = private.login_name(p_first_name, p_last_name) and left_at is null;
  if v_target.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  for i in 1..8 loop
    v_temp := v_temp || substr(v_letters, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 31), 1);
  end loop;
  update private.members
  set password_hash = extensions.crypt(v_temp, extensions.gen_salt('bf', 10)),
      key_hash = extensions.digest(extensions.gen_random_bytes(32), 'sha256')
  where id = v_target.id;
  update private.sessions set revoked_at = now() where member_id = v_target.id and revoked_at is null;
  update private.login_attempts set ok = true where login_name = v_target.login_name and not ok;
  return jsonb_build_object(
    'ok', true,
    'name', private.display_name(v_target.first_name, v_target.last_name),
    'temp_password', v_temp
  );
end;
$$;

-- Leaving also ends every login and frees the name.
create or replace function public.leave_garden(p_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member private.members := private.require_member(p_key);
begin
  update private.likes set active = false, updated_at = now() where member_id = v_member.id and active;
  update private.notes set status = 'removed' where author_id = v_member.id and status <> 'removed';
  update private.sessions set revoked_at = now() where member_id = v_member.id and revoked_at is null;
  update private.members
  set key_hash = extensions.digest(extensions.gen_random_bytes(32), 'sha256'),
      first_name = 'Former member',
      last_name = null,
      login_name = null,
      password_hash = null,
      gender = 'prefer_not_to_say',
      is_moderator = false,
      left_at = now()
  where id = v_member.id;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------

revoke all on function public.sign_up(text, text, integer, text, text) from public;
revoke all on function public.log_in(text, text, text) from public;
revoke all on function public.update_profile(text, text, text, integer, text) from public;
revoke all on function public.change_password(text, text, text) from public;
revoke all on function public.reset_password(text, text, text) from public;
grant execute on function public.sign_up(text, text, integer, text, text) to anon, authenticated;
grant execute on function public.log_in(text, text, text) to anon, authenticated;
grant execute on function public.update_profile(text, text, text, integer, text) to anon, authenticated;
grant execute on function public.change_password(text, text, text) to anon, authenticated;
grant execute on function public.reset_password(text, text, text) to anon, authenticated;

-- The old versions would let someone join without a password.
revoke all on function public.join_garden(text, integer, text) from public, anon, authenticated;
revoke all on function public.update_me(text, text, integer, text) from public, anon, authenticated;
