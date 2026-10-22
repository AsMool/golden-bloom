-- Golden Bloom · reading the garden (see garden_tables for the overview).

-- ---------------------------------------------------------------------------
-- Public API: reading the garden
-- ---------------------------------------------------------------------------

-- p_sort: 'new' (latest first) · 'loved' (most hearts and shares) · 'week' (most loved this week)
create function public.list_notes(
  p_key text default null,
  p_category text default null,
  p_sort text default 'new',
  p_limit integer default 24,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_member uuid := (private.member_by_key(p_key)).id;
  v_sort text := case when p_sort in ('new', 'loved', 'week') then p_sort else 'new' end;
  v_limit integer := least(greatest(coalesce(p_limit, 24), 1), 60);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  return coalesce((
    select jsonb_agg(private.card(x.n, v_member) order by x.ord)
    from (
      select n, row_number() over (
        order by
          case when v_sort = 'new' then 0 else n.like_count + n.share_count end desc,
          n.created_at desc,
          n.id
      ) as ord
      from private.notes n
      where n.status = 'visible'
        and (p_category is null or n.category = p_category)
        and (v_sort <> 'week' or n.created_at > now() - interval '7 days')
    ) x
    where x.ord > v_offset and x.ord <= v_offset + v_limit
  ), '[]'::jsonb);
end;
$$;

create function public.get_note(p_note_id uuid, p_key text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_member uuid := (private.member_by_key(p_key)).id;
begin
  return (
    select private.card(n, v_member)
    from private.notes n
    where n.id = p_note_id
      and (n.status = 'visible' or (v_member is not null and n.author_id = v_member and n.status <> 'removed'))
  );
end;
$$;

-- A random kind note, gently favouring the most loved ones. Never your own.
create function public.random_note(p_key text default null, p_category text default null, p_exclude uuid default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_member uuid := (private.member_by_key(p_key)).id;
begin
  return (
    select private.card(n, v_member)
    from private.notes n
    where n.status = 'visible'
      and (p_category is null or n.category = p_category)
      and (p_exclude is null or n.id <> p_exclude)
      and (v_member is null or n.author_id is distinct from v_member)
    order by -ln(1 - random()) / (1 + ln(1 + n.like_count + n.share_count))
    limit 1
  );
end;
$$;

create function public.garden_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'notes', (select count(*) from private.notes where status = 'visible'),
    'hearts', (select coalesce(sum(like_count), 0) from private.notes where status = 'visible'),
    'members', (select count(*) from private.members where left_at is null),
    'by_category', coalesce((
      select jsonb_object_agg(category, total)
      from (select category, count(*) as total from private.notes where status = 'visible' group by category) s
    ), '{}'::jsonb)
  )
$$;

create function public.my_notes(p_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member private.members := private.require_member(p_key);
begin
  return coalesce((
    select jsonb_agg(private.card(n, v_member.id) order by n.created_at desc)
    from private.notes n
    where n.author_id = v_member.id and n.status <> 'removed'
  ), '[]'::jsonb);
end;
$$;

-- Notes you gave a heart to: your own little pressed-flower book.
create function public.loved_notes(p_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member private.members := private.require_member(p_key);
begin
  return coalesce((
    select jsonb_agg(private.card(n, v_member.id) order by l.updated_at desc)
    from private.likes l
    join private.notes n on n.id = l.note_id
    where l.member_id = v_member.id and l.active and n.status = 'visible'
  ), '[]'::jsonb);
end;
$$;
