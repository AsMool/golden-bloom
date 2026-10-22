import { useState, type CSSProperties } from 'react'
import { Icon } from '../components/Icon'
import { NoteList } from '../components/NoteList'
import { MOST_LOVED } from '../lib/categories'
import { href } from '../lib/router'
import { useUi } from '../lib/ui'
import './pages.css'

export function MostLovedPage() {
  const { write } = useUi()
  const [period, setPeriod] = useState<'loved' | 'week'>('loved')

  return (
    <>
      <section className="page-hero page-hero--loved" style={{ '--tint': MOST_LOVED.tint, '--deep': MOST_LOVED.deep } as CSSProperties}>
        <div className="container page-hero__row">
          <div className="page-hero__text">
            <a className="back-link" href={href.home}>
              <Icon name="arrowLeft" size={18} /> The whole garden
            </a>
            <h1>Most Loved Messages</h1>
            <p className="lead">The notes with the most hearts and shares. Give a heart to the ones that make you smile, and they climb up.</p>
          </div>
          <div className="page-hero__art">
            <img src={MOST_LOVED.art} alt="" width="260" height="260" />
          </div>
        </div>
      </section>

      <section className="container section section--tight">
        <div className="list-toolbar">
          <div className="tabs" role="tablist" aria-label="Period">
            <button type="button" role="tab" className="tab" aria-selected={period === 'loved'} onClick={() => setPeriod('loved')}>
              All time
            </button>
            <button type="button" role="tab" className="tab" aria-selected={period === 'week'} onClick={() => setPeriod('week')}>
              This week
            </button>
          </div>
        </div>
        <NoteList
          sort={period}
          ranked
          pageSize={24}
          empty={
            <div className="empty">
              <img src={MOST_LOVED.art} alt="" />
              <h3>No hearts this week yet</h3>
              <p>Go give some love: every heart helps a note bloom.</p>
              <button type="button" className="btn btn--primary" onClick={() => write()}>
                Write a note
              </button>
            </div>
          }
        />
      </section>
    </>
  )
}
