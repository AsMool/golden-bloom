-- ============================================================================
-- Golden Bloom · the first notes
--
-- The example notes from the class, credited to the people who wrote them.
-- They start with a few hearts so the "Most Loved" feed is not empty on day one.
-- To start everyone from zero:  update private.notes set like_count = 0 where is_seed;
-- ============================================================================

insert into private.notes (author_name, category, body, paper, like_count, is_seed, created_at) values
  ('Lyana', 'mirror_talk', 'You''re beautiful in ways a mirror could never show.', 'cream', 42, true, now() - interval '12 hours'),
  ('Isaac', 'confidence_boost', 'If you were an update, nobody would click “Remind me later”.', 'butter', 38, true, now() - interval '11 hours'),
  ('Nour', 'confidence_boost', 'You''re so good looking you look like those premium humans in Nike ads.', 'sky', 35, true, now() - interval '10 hours'),
  ('Béatrice', 'body_love_letters', 'Your eyes remind me of glittering charcoal.', 'blush', 33, true, now() - interval '9 hours'),
  ('Sara', 'confidence_boost', 'Are you the Eiffel Tower? Because I fell for you.', 'blush', 31, true, now() - interval '8 hours'),
  ('Victoria', 'bad_day_comfort', '“You''re beautiful, you''re wonderful, incredible.” — Michael Jackson', 'butter', 29, true, now() - interval '7 hours'),
  ('Nour', 'body_love_letters', 'Your eyes are so big and expressive even John Lennon doesn''t need his glasses with a -20 diopter correction to see them.', 'cream', 27, true, now() - interval '6 hours'),
  ('Isaac', 'mirror_talk', 'You were created with premium settings. There''s no other explanation.', 'sage', 26, true, now() - interval '5 hours'),
  ('Béatrice', 'confidence_boost', 'You have Théo James'' charisma.', 'butter', 24, true, now() - interval '4 hours'),
  ('Nour', 'body_love_letters', 'Your laugh is so unique even Yoko Ono tries to replicate it when singing.', 'sage', 22, true, now() - interval '3 hours'),
  ('Nour', 'body_love_letters', 'Your hair is as thick and full as George Harrison''s unibrow.', 'butter', 21, true, now() - interval '2 hours'),
  ('Béatrice', 'bad_day_comfort', 'What counts is how you feel, not how you look.', 'cream', 19, true, now() - interval '1 hour');
