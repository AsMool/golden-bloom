-- Golden Bloom · indexes for the per-member rate limits (see garden_tables for the overview).

create index moderator_attempts_member_idx on private.moderator_attempts (member_id, created_at desc);
create index shares_member_idx on private.shares (member_id);
