# Golden Bloom

A little garden of kind words. Leave a kind note, take one when you need it.

Golden Bloom is a body-positivity and self-love website made for a class project. Classmates (and anyone they share it with) can write kind notes to each other, to strangers, or to the person in the mirror.

## What you can do

- **Read** notes in six corners of the garden: Confidence Boost, Bad Day Comfort, Body Love Letters, You Are Not Alone, Mirror Talk and From Me To You. Notes in From Me To You are always anonymous.
- **Open the mailbox** on the home page for a random kind note, as many times as you like.
- **Give hearts and share.** The notes with the most hearts and shares climb into Most Loved.
- **Join** with a first name, an age and a gender. Nothing else: no email, no password. The browser keeps a secret "garden key" that you can copy to use the site on another phone.
- **Report** a note that hurts. After three reports it is hidden until a moderator looks at it.

## Keeping it kind

- A kind-words filter (English and French) blocks insults, slurs and body-shaming words, including sneaky spellings.
- Some words, like "ugly", can be kind ("you're not ugly at all"). Notes that use them ask the writer to check, then wait for a moderator.
- Links, emails, phone numbers and @usernames are refused, so nobody can be found through a note.
- Gentle limits stop anyone from flooding the garden with notes, hearts, reports or sign-ups.
- Age and gender are never shown. Leaving the garden removes your notes and hearts and erases your name.

## How it is built

- **Site:** React, TypeScript and Vite, with no UI framework. Fonts: Fraunces, Onest and Shantell Sans (all open source, served from the site itself).
- **Drawings:** every flower, the spiral logo and the icons are drawn with code in `scripts/art`. Run `npm run art` to redraw the SVGs, or `npm run art -- --png` to also redraw the app icons and the link preview picture (needs Chromium).
- **Database:** [Supabase](https://supabase.com) (Postgres, in Paris). The tables live in a private schema that the site cannot read directly; the site only calls the functions in `supabase/migrations`, which check every request. The key in `src/lib/config.ts` is the public "publishable" key, so it is fine for it to be in the code.
- **Hosting:** [Vercel](https://vercel.com), connected to this repository: every push to `main` goes live a minute later. Settings are in `vercel.json`.

## Working on it

```sh
npm ci
npm run dev
```

The dev server uses the real garden by default, so anything you post there is real. To use another database, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY`.

### Tests

| Command | What it checks |
| --- | --- |
| `npm run lint` | Code style and common mistakes |
| `npm test` | Unit tests (dates, links, categories) |
| `npm run build` | Types, and that the site builds |
| `npm run test:db` | The database API, on a local copy of the database |
| `npm run test:e2e` | The site in a real browser (start `npm run dev` first, or set `BASE_URL`) |

The database and browser tests need a local Postgres 16 on port 54322 and a [PostgREST](https://postgrest.org) binary. GitHub Actions sets all of that up and runs every test on each push (see `.github/workflows/ci.yml`). The browser tests that write (joining, planting notes, moderating) only run when `E2E_WRITE=1` is set, so they never touch the real garden.

To check the live site without changing anything:

```sh
BASE_URL=https://your-site.vercel.app node --test e2e/smoke.test.mjs
```

The "Live site check" workflow does this after every production deploy.

## Looking after the garden

Moderators unlock their tools in **Me → Settings** with the moderator code. Things only the database owner can do, in the Supabase SQL editor:

```sql
-- change the moderator code
select private.set_moderator_passcode('a new secret code');

-- add a word to the filter ('block' refuses the note, 'review' asks the writer and a moderator to check)
insert into private.banned_terms (term, severity, whole_word) values ('word', 'block', true);

-- take a note down by hand
update private.notes set status = 'removed' where id = '…';
```

## Thanks

To Béatrice, Victoria, Sara, Nour, Isaac and Lyana for the very first notes in the garden.
