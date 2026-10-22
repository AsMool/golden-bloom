-- Golden Bloom · joining and profiles (see garden_tables for the overview).

-- ---------------------------------------------------------------------------
-- Public API: members
-- ---------------------------------------------------------------------------

create function public.join_garden(p_first_name text, p_age integer, p_gender text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_ip_hash text := private.client_ip_hash();
  v_key text;
  v_member private.members;
begin
  v_name := private.clean_name(p_first_name);
  if p_age is null or p_age < 10 or p_age > 99 then
    perform private.fail('invalid_age');
  end if;
  if p_gender is null or p_gender not in ('girl', 'boy', 'non_binary', 'prefer_not_to_say') then
    perform private.fail('invalid_gender');
  end if;

  if v_ip_hash is not null and (
    select count(*) from private.join_log
    where ip_hash = v_ip_hash and created_at > now() - interval '10 minutes'
  ) >= 60 then
    perform private.fail('slow_down');
  end if;
  if (select count(*) from private.join_log where created_at > now() - interval '10 minutes') >= 300 then
    perform private.fail('slow_down');
  end if;
  insert into private.join_log (ip_hash) values (v_ip_hash);

  v_key := 'gb_' || encode(extensions.gen_random_bytes(32), 'hex');
  insert into private.members (key_hash, first_name, age, gender)
  values (extensions.digest(v_key, 'sha256'), v_name, p_age, p_gender)
  returning * into v_member;

  return jsonb_build_object('key', v_key, 'member', private.profile(v_member));
end;
$$;

create function public.me(p_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member private.members := private.require_member(p_key);
begin
  return private.profile(v_member);
end;
$$;

create function public.update_me(p_key text, p_first_name text, p_age integer, p_gender text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member private.members := private.require_member(p_key);
  v_name text := private.clean_name(p_first_name);
begin
  if p_age is null or p_age < 10 or p_age > 99 then
    perform private.fail('invalid_age');
  end if;
  if p_gender is null or p_gender not in ('girl', 'boy', 'non_binary', 'prefer_not_to_say') then
    perform private.fail('invalid_gender');
  end if;
  update private.members
  set first_name = v_name, age = p_age, gender = p_gender
  where id = v_member.id
  returning * into v_member;
  -- Signed notes follow the new name. Anonymous notes stay anonymous.
  update private.notes set author_name = v_name where author_id = v_member.id and author_name is not null;
  return private.profile(v_member);
end;
$$;

-- Leaving the garden: hearts are taken back, notes removed, the name wiped and the key stops working.
create function public.leave_garden(p_key text)
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
  update private.members
  set key_hash = extensions.digest(extensions.gen_random_bytes(32), 'sha256'),
      first_name = 'Former member',
      gender = 'prefer_not_to_say',
      is_moderator = false,
      left_at = now()
  where id = v_member.id;
  return true;
end;
$$;
