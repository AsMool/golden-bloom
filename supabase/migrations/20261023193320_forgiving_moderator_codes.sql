-- Moderator codes are compared without caring about capitals, spaces, dashes or smart punctuation
-- (phones love to change those). Extra codes are stored with add_moderator_passcode, in simple form.
create function private.simple_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$ select regexp_replace(lower(coalesce(p_code, '')), '[^a-z0-9]+', '', 'g') $$;

create or replace function private.add_moderator_passcode(p_who text, p_code text)
returns void
language sql
set search_path = ''
as $$
  insert into private.settings (key, value)
  values ('moderator_passcode_hash:' || p_who, extensions.crypt(private.simple_code(p_code), extensions.gen_salt('bf', 8)))
  on conflict (key) do update set value = excluded.value;
$$;

create or replace function public.claim_moderator(p_key text, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member private.members := private.require_member(p_key);
  v_ok boolean;
begin
  if (select count(*) from private.moderator_attempts
      where member_id = v_member.id and created_at > now() - interval '1 hour') >= 5 then
    perform private.fail('slow_down');
  end if;
  insert into private.moderator_attempts (member_id) values (v_member.id);
  select exists (
    select 1 from private.settings s
    where (s.key = 'moderator_passcode_hash' or s.key like 'moderator\_passcode\_hash:%')
      and p_code is not null
      and (extensions.crypt(btrim(p_code), s.value) = s.value
           or extensions.crypt(private.simple_code(p_code), s.value) = s.value)
  ) into v_ok;
  if not v_ok then
    return jsonb_build_object('ok', false, 'error', 'wrong_code');
  end if;
  update private.members set is_moderator = true where id = v_member.id returning * into v_member;
  return jsonb_build_object('ok', true, 'member', private.profile(v_member));
end;
$$;
