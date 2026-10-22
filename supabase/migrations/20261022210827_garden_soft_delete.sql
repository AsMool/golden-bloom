-- Golden Bloom · nothing is hard-deleted by the website (see garden_tables for the overview).
--
-- A heart can be taken back (likes.active = false), a note taken back or taken
-- down (notes.status = 'removed'), and a member who leaves is anonymized: their
-- name is wiped, their key stops working and their notes are removed.

alter table private.likes add column active boolean not null default true;
alter table private.likes add column updated_at timestamptz not null default now();
create index likes_member_updated_idx on private.likes (member_id, updated_at desc);

alter table private.members add column left_at timestamptz;

create or replace function private.on_like_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_note_id uuid := case when tg_op = 'DELETE' then old.note_id else new.note_id end;
  v_delta integer;
  v_count integer;
begin
  if tg_op = 'INSERT' then
    v_delta := case when new.active then 1 else 0 end;
  elsif tg_op = 'UPDATE' then
    v_delta := case when new.active = old.active then 0 when new.active then 1 else -1 end;
  else
    v_delta := case when old.active then -1 else 0 end;
  end if;
  if v_delta = 0 then
    return null;
  end if;
  update private.notes
  set like_count = greatest(like_count + v_delta, 0)
  where id = v_note_id
  returning like_count into v_count;
  if v_count is not null then
    perform private.broadcast('hearts', jsonb_build_object('id', v_note_id, 'hearts', v_count));
  end if;
  return null;
end;
$$;

create or replace trigger likes_count_trg
after insert or update of active or delete on private.likes
for each row execute function private.on_like_change();

create or replace function private.card(p_note private.notes, p_member uuid)
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
      select 1 from private.likes l where l.note_id = p_note.id and l.member_id = p_member and l.active
    ),
    'mine', p_member is not null and p_note.author_id is not distinct from p_member,
    'status', case when p_member is not null and p_note.author_id = p_member then p_note.status end
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
    'age', p_member.age,
    'gender', p_member.gender,
    'is_moderator', p_member.is_moderator,
    'joined_at', p_member.created_at,
    'notes', (select count(*) from private.notes n where n.author_id = p_member.id and n.status <> 'removed'),
    'hearts_received', (select coalesce(sum(n.like_count), 0) from private.notes n where n.author_id = p_member.id and n.status <> 'removed'),
    'hearts_given', (select count(*) from private.likes l where l.member_id = p_member.id and l.active)
  )
$$;
