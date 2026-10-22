-- ============================================================================
-- Golden Bloom · the garden
--
-- A little garden of kind words. Members only give a first name, an age and a
-- gender: no email, no password. Joining returns a random "garden key" that the
-- browser keeps, and every write sends it back.
--
-- All tables live in the `private` schema, which the API never exposes.
-- The website only calls the functions in `public`, and those functions do the
-- checking: garden key, kind-words filter, personal info filter, rate limits.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table private.members (
  id uuid primary key default gen_random_uuid(),
  key_hash bytea not null unique,
  first_name text not null,
  age smallint not null,
  gender text not null,
  is_moderator boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint members_first_name_check check (char_length(first_name) between 1 and 24),
  constraint members_age_check check (age between 10 and 99),
  constraint members_gender_check check (gender in ('girl', 'boy', 'non_binary', 'prefer_not_to_say'))
);

create table private.notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references private.members (id) on delete cascade,
  -- Shown under the note. Null means anonymous ("From Me To You").
  author_name text,
  category text not null,
  body text not null,
  -- Optional "To: ..." line, only for From Me To You.
  recipient text,
  paper text not null default 'butter',
  like_count integer not null default 0,
  share_count integer not null default 0,
  report_count integer not null default 0,
  -- visible: in the garden · hidden: too many reports, waiting for a moderator · removed: taken down
  status text not null default 'visible',
  -- Contains a word that is often unkind: still shown, but listed for moderators.
  needs_review boolean not null default false,
  -- A moderator looked at it and kept it: reports no longer hide it automatically.
  reviewed boolean not null default false,
  is_seed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint notes_category_check check (category in (
    'confidence_boost', 'bad_day_comfort', 'body_love_letters',
    'you_are_not_alone', 'mirror_talk', 'from_me_to_you'
  )),
  constraint notes_body_check check (char_length(body) between 3 and 280),
  constraint notes_recipient_check check (recipient is null or char_length(recipient) between 1 and 40),
  constraint notes_paper_check check (paper in ('butter', 'cream', 'blush', 'sage', 'sky')),
  constraint notes_status_check check (status in ('visible', 'hidden', 'removed')),
  constraint notes_counts_check check (like_count >= 0 and share_count >= 0 and report_count >= 0)
);

create index notes_visible_new_idx on private.notes (created_at desc) where status = 'visible';
create index notes_visible_category_idx on private.notes (category, created_at desc) where status = 'visible';
create index notes_author_idx on private.notes (author_id, created_at desc);

create table private.likes (
  note_id uuid not null references private.notes (id) on delete cascade,
  member_id uuid not null references private.members (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, member_id)
);
create index likes_member_idx on private.likes (member_id, created_at desc);

create table private.shares (
  note_id uuid not null references private.notes (id) on delete cascade,
  member_id uuid not null references private.members (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, member_id)
);

create table private.reports (
  note_id uuid not null references private.notes (id) on delete cascade,
  member_id uuid not null references private.members (id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  primary key (note_id, member_id),
  constraint reports_reason_check check (reason in ('mean', 'body_shaming', 'personal_info', 'spam', 'other'))
);
create index reports_member_idx on private.reports (member_id, created_at desc);

-- Words that are never allowed (block) or often unkind (review).
-- Terms are stored normalized: lowercase, no accents, letters and single spaces.
create table private.banned_terms (
  term text primary key,
  severity text not null,
  -- true: only the exact word ("con" but not "contest") · false: anything starting with it ("bitch" → "bitchy")
  whole_word boolean not null default true,
  pattern text generated always as (
    '\m' || regexp_replace(term, '([a-z])', '\1+', 'g') || case when whole_word then '\M' else '' end
  ) stored,
  constraint banned_terms_term_check check (term ~ '^[a-z]+( [a-z]+)*$'),
  constraint banned_terms_severity_check check (severity in ('block', 'review'))
);

create table private.settings (
  key text primary key,
  value text not null
);

create table private.join_log (
  id bigint generated always as identity primary key,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index join_log_created_idx on private.join_log (created_at);

create table private.moderator_attempts (
  id bigint generated always as identity primary key,
  member_id uuid not null references private.members (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table private.members enable row level security;
alter table private.notes enable row level security;
alter table private.likes enable row level security;
alter table private.shares enable row level security;
alter table private.reports enable row level security;
alter table private.banned_terms enable row level security;
alter table private.settings enable row level security;
alter table private.join_log enable row level security;
alter table private.moderator_attempts enable row level security;

insert into private.settings (key, value)
values ('ip_salt', encode(extensions.gen_random_bytes(16), 'hex'));
