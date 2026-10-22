-- Golden Bloom · the kind-words filter also catches words with letters starred out ("f*ck", "b**ch", "sh#t").
-- Same function as in garden_helpers, with a fourth way of reading the text.

create or replace function private.find_term(p_text text, p_severity text)
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
  v_masked text;
  v_hit text;
begin
  v_plain := btrim(regexp_replace(v_base, '[^a-z]+', ' ', 'g'));
  v_leet := btrim(regexp_replace(translate(v_base, '0134578@$!|€', 'oieastbasiie'), '[^a-z]+', ' ', 'g'));
  -- "f u c k" → "fuck": glue runs of single letters back together
  v_joined := regexp_replace(v_plain, '\m([a-z]) (?=[a-z]\M)', '\1', 'g');
  -- "f*ck", "sh#t": keep the stars, so each one can stand for any letter but the first
  v_masked := translate(btrim(regexp_replace(translate(v_base, '0134578@$!|€', 'oieastbasiie'), '[^a-z*#]+', ' ', 'g')), '#', '*');

  select t.term into v_hit
  from private.banned_terms t
  where t.severity = p_severity
    and (
      v_plain ~ t.pattern or v_leet ~ t.pattern or v_joined ~ t.pattern
      or (
        -- only for words of three letters or more, so "F#" stays a musical note
        v_masked ~ '[*]'
        and char_length(t.term) >= 3
        and v_masked ~ (
          '\m' || left(t.term, 1) || '+'
          || regexp_replace(substr(t.term, 2), '([a-z])', '[\1*]+', 'g')
          || case when t.whole_word then '(?![a-z*])' else '' end
        )
      )
    )
  limit 1;

  return v_hit;
end;
$$;
