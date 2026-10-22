import { useEffect, useState } from 'react'
import { CategoryGrid } from '../components/CategoryGrid'
import { Envelope } from '../components/Envelope'
import { HeroArt } from '../components/HeroArt'
import { Icon } from '../components/Icon'
import { NoteList } from '../components/NoteList'
import { api } from '../lib/api'
import { greeting, plural } from '../lib/format'
import { href } from '../lib/router'
import { useSession } from '../lib/session'
import type { Stats } from '../lib/types'
import { useUi } from '../lib/ui'
import './Home.css'

export function Home() {
  const { member } = useSession()
  const { write } = useUi()
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    api.stats().then(setStats, () => undefined)
  }, [])

  return (
    <>
      <section className="hero container">
        <div className="hero__text">
          <p className="eyebrow">{member ? `${greeting()}, ${member.first_name}` : 'A little garden of kind words'}</p>
          <h1>
            Leave a kind word. <em>Take one when you need it.</em>
          </h1>
          <p className="lead">
            Golden Bloom is a soft corner of the internet for self-love and body love. Write a note for a classmate, for someone you have
            never met, or for the person in the mirror.
          </p>
          <div className="hero__ctas">
            <button type="button" className="btn btn--primary btn--big" onClick={() => write()}>
              <Icon name="pen" size={19} /> Write a note
            </button>
            <button
              type="button"
              className="btn btn--big"
              onClick={() => document.getElementById('open-a-note')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            >
              <Icon name="envelope" size={19} /> Open a kind note
            </button>
          </div>
          {stats && stats.notes > 0 && (
            <p className="hero__stats">
              <span>
                <strong>{plural(stats.notes, 'note')}</strong> planted
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong>{plural(stats.hearts, 'heart')}</strong> given
              </span>
            </p>
          )}
        </div>
        <div className="hero__art">
          <HeroArt />
          <figure className="hero__note">
            <blockquote>You're beautiful in ways a mirror could never show.</blockquote>
            <figcaption>Lyana</figcaption>
          </figure>
        </div>
      </section>

      <section className="container section">
        <div className="mailbox" id="open-a-note">
          <div className="mailbox__text">
            <p className="eyebrow">
              <Icon name="envelope" size={16} /> The kind word mailbox
            </p>
            <h2>Need a kind word right now?</h2>
            <p className="lead">
              Every envelope holds a note from someone in the garden. Open one, then another. They don't run out.
            </p>
          </div>
          <Envelope />
        </div>
      </section>

      <section className="container section" aria-labelledby="garden-title">
        <div className="section-head">
          <div>
            <h2 id="garden-title">Wander the garden</h2>
            <p>Six corners, six moods. Pick the one that fits your day.</p>
          </div>
        </div>
        <CategoryGrid stats={stats} />
      </section>

      <section className="container section" aria-labelledby="loved-title">
        <div className="section-head">
          <div>
            <p className="eyebrow">
              <Icon name="heart" size={15} filled /> Most Loved Messages
            </p>
            <h2 id="loved-title">The notes everyone keeps coming back to</h2>
          </div>
          <a className="arrow-link" href={href.loved}>
            See all of them <Icon name="arrowRight" size={18} />
          </a>
        </div>
        <NoteList sort="loved" max={6} ranked />
      </section>

      <section className="container section">
        <div className="rules-card">
          <div>
            <p className="eyebrow">Garden rules</p>
            <h2>Three little rules keep this place soft</h2>
          </div>
          <ol className="rules-card__list">
            <li>
              <strong>Lift people up.</strong> Compliment who someone is, not just how they look.
            </li>
            <li>
              <strong>No comparing bodies.</strong> Every shape is the right shape.
            </li>
            <li>
              <strong>Keep it safe.</strong> No full names, numbers, links or @usernames.
            </li>
          </ol>
          <a className="arrow-link" href={href.about('rules')}>
            Read all the rules <Icon name="arrowRight" size={18} />
          </a>
        </div>
      </section>
    </>
  )
}
