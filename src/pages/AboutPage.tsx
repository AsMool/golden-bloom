import { useEffect } from 'react'
import logoMark from '../assets/art/logo-mark.svg'
import { Icon } from '../components/Icon'
import { CATEGORIES, MOST_LOVED } from '../lib/categories'
import { href } from '../lib/router'
import { useUi } from '../lib/ui'
import './pages.css'

const RULES: [string, string][] = [
  ['Lift people up.', 'Compliment who someone is (their kindness, their humour, their courage), not only how they look.'],
  ['No comparing bodies.', 'Never "pretty for a…" or "at least you\'re not…". Every shape is the right shape.'],
  ['Keep it safe.', 'No full names, phone numbers, addresses, links or @usernames. Ever.'],
  ['Jokes are welcome', '…as long as everyone is laughing. Teasing that could sting does not belong here.'],
  ['Not sure it is kind?', 'Read your note as if it had been written about you. If it stings, rewrite it.'],
  ['See something that hurts? Report it.', 'Reports are anonymous, and you will never get in trouble for sending one.'],
]

const HELP: { number: string; tel: string; name: string; text: string }[] = [
  { number: '3114', tel: '3114', name: 'Suicide prevention', text: 'If you are having dark thoughts, or worried about someone. 24 hours a day, 7 days a week. Free.' },
  {
    number: '3018',
    tel: '3018',
    name: 'Bullying and cyberbullying',
    text: 'For young people being bullied, at school or online. Every day, 9am to 11pm. Free and anonymous.',
  },
  {
    number: '0 800 235 236',
    tel: '0800235236',
    name: 'Fil Santé Jeunes',
    text: 'For 12 to 25 year olds: body, mind, love, anything. Every day, 9am to 11pm. Free and anonymous.',
  },
  { number: '119', tel: '119', name: 'Allô Enfance en Danger', text: 'If you, or someone you know, is being hurt at home or anywhere else. 24/7. Free.' },
]

export function AboutPage({ section }: { section?: string }) {
  const { write } = useUi()

  useEffect(() => {
    if (!section) return
    const el = document.getElementById(section)
    if (el) window.requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }, [section])

  return (
    <div className="about">
      <section className="container container--narrow section about__intro">
        <p className="eyebrow">About Golden Bloom</p>
        <h1 className="page-title">
          Every flower blooms <em>in its own shape</em>
        </h1>
        <p className="lead">
          Golden Bloom started as a class project with one simple idea. The internet already has plenty of places that make us compare
          ourselves. It could use a few more places that make us feel good. So we planted one.
        </p>
        <p className="lead">
          Here you can leave kind notes for classmates, for people you have never met, or for yourself. And on a grey day, you can come and
          pick one up.
        </p>
      </section>

      <section id="spiral" className="container section about__spiral">
        <img src={logoMark} alt="The Golden Bloom logo: a golden spiral growing from a flower" width="260" height="226" />
        <div>
          <h2>Why a golden spiral?</h2>
          <p>
            Our logo grows by the golden ratio, about 1.618, every quarter turn. You can find that spiral in sunflower seeds, pinecones,
            seashells and even galaxies, which is why people call it "the perfect shape".
          </p>
          <p>
            But look closer: no two sunflowers are the same, and each one follows the spiral in its own way. That is the whole point. There
            is no single perfect body. Nature is full of different shapes, and every one of them is beautiful.
          </p>
        </div>
      </section>

      <section id="flowers" className="container section">
        <div className="section-head">
          <div>
            <h2>A flower for every corner</h2>
            <p>In the old "language of flowers", each one carried a message. Here is ours.</p>
          </div>
        </div>
        <ul className="flower-list">
          {CATEGORIES.map((c) => (
            <li key={c.id} style={{ background: c.tint }}>
              <img src={c.art} alt="" width="88" height="88" />
              <div>
                <h3>
                  <a href={href.category(c.slug)}>{c.name}</a>
                </h3>
                <p className="flower-list__flower">{c.flower}</p>
                <p>{c.meaning}</p>
              </div>
            </li>
          ))}
          <li style={{ background: MOST_LOVED.tint }}>
            <img src={MOST_LOVED.art} alt="" width="88" height="88" />
            <div>
              <h3>
                <a href={href.loved}>{MOST_LOVED.name}</a>
              </h3>
              <p className="flower-list__flower">{MOST_LOVED.flower}</p>
              <p>{MOST_LOVED.meaning}</p>
            </div>
          </li>
        </ul>
      </section>

      <section id="rules" className="container container--narrow section">
        <h2>The garden rules</h2>
        <ol className="rules-list">
          {RULES.map(([title, text]) => (
            <li key={title}>
              <strong>{title}</strong> {text}
            </li>
          ))}
        </ol>
      </section>

      <section id="safety" className="container container--narrow section">
        <h2>How we keep it kind</h2>
        <div className="safety-grid">
          <div>
            <h3>A kind-words filter</h3>
            <p>Notes with insults, slurs or body-shaming words, in English and in French, cannot be posted. Sneaky spellings with numbers, dots, spaces or stars don't get through either.</p>
          </div>
          <div>
            <h3>A gentle double-check</h3>
            <p>Some words, like "ugly", can be kind ("you're not ugly at all!") or cruel. When a note uses one, we ask the writer to check, and a moderator has a look.</p>
          </div>
          <div>
            <h3>Reports</h3>
            <p>Anyone in the garden can report a note. After three reports, it is hidden until a moderator decides to keep it or remove it.</p>
          </div>
          <div>
            <h3>Moderators</h3>
            <p>A few trusted people hold a moderator code. They can see hidden notes and remove anything that does not belong.</p>
          </div>
          <div>
            <h3>No pile-ons</h3>
            <p>Notes, hearts and reports have gentle limits, so nobody can flood the garden.</p>
          </div>
          <div>
            <h3>No personal info</h3>
            <p>Links, emails, phone numbers and @usernames are blocked automatically, so nobody can be found through a note.</p>
          </div>
        </div>
      </section>

      <section id="privacy" className="container container--narrow section">
        <h2>Your privacy</h2>
        <ul className="plain-list">
          <li>We only ask for your first name, your age and your gender. Your age and gender are never shown to anyone.</li>
          <li>
            There is no email and no password. Your browser keeps a secret garden key instead; copy it from your profile if you want to use
            another device.
          </li>
          <li>Notes in From Me To You are anonymous: your name is never attached to them.</li>
          <li>Leaving the garden removes your notes and hearts and erases your name.</li>
          <li>No ads, no trackers, no cookies. Notes are stored in a database in the EU (Paris).</li>
        </ul>
      </section>

      <section id="help" className="container container--narrow section">
        <div className="help-card">
          <h2>Need to talk to someone?</h2>
          <p>
            Kind words help, but some days you need a real person. Talk to an adult you trust: a parent, a teacher, the school nurse, or your
            boarding staff. These lines in France are free and confidential:
          </p>
          <ul className="help-list">
            {HELP.map((h) => (
              <li key={h.number}>
                <a className="help-list__number" href={`tel:${h.tel}`}>
                  <Icon name="sparkle" size={16} /> {h.number}
                </a>
                <div>
                  <strong>{h.name}</strong>
                  <p>{h.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="muted">
            In an emergency, call <a href="tel:112">112</a>. Not in France? Find a free helpline in your country on{' '}
            <a href="https://findahelpline.com" target="_blank" rel="noreferrer">
              findahelpline.com
            </a>
            .
          </p>
        </div>
      </section>

      <section className="container container--narrow section about__end">
        <h2>Ready to plant something?</h2>
        <button type="button" className="btn btn--primary btn--big" onClick={() => write()}>
          <Icon name="pen" size={19} /> Write a kind note
        </button>
        <p className="muted about__credits">
          Made with care for a class project. Every drawing on this site is drawn with code. Fonts: Fraunces, Onest and Shantell Sans, all
          open source.
        </p>
      </section>
    </div>
  )
}
