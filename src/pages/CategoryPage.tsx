import { useState, type CSSProperties } from 'react'
import { Icon } from '../components/Icon'
import { NoteList } from '../components/NoteList'
import { categoryBySlug } from '../lib/categories'
import { href } from '../lib/router'
import { useUi } from '../lib/ui'
import { NotFound } from './NotFound'
import './pages.css'

export function CategoryPage({ slug }: { slug: string }) {
  const cat = categoryBySlug(slug)
  const { write } = useUi()
  const [sort, setSort] = useState<'new' | 'loved'>('new')
  if (!cat) return <NotFound />

  return (
    <>
      <section className="page-hero" style={{ '--tint': cat.tint, '--deep': cat.deep } as CSSProperties}>
        <div className="container page-hero__row">
          <div className="page-hero__text">
            <a className="back-link" href={href.home}>
              <Icon name="arrowLeft" size={18} /> The whole garden
            </a>
            <h1>{cat.name}</h1>
            <p className="lead">{cat.blurb}</p>
            <p className="page-hero__flower">
              <strong>{cat.flower}.</strong> {cat.meaning}
            </p>
            <button type="button" className="btn btn--primary btn--big" onClick={() => write(cat.id)}>
              <Icon name="pen" size={19} /> Write in {cat.name}
            </button>
          </div>
          <div className="page-hero__art">
            <img src={cat.art} alt="" width="260" height="260" />
          </div>
        </div>
      </section>

      <section className="container section section--tight">
        <div className="list-toolbar">
          <div className="tabs" role="tablist" aria-label="Order">
            <button type="button" role="tab" className="tab" aria-selected={sort === 'new'} onClick={() => setSort('new')}>
              Newest
            </button>
            <button type="button" role="tab" className="tab" aria-selected={sort === 'loved'} onClick={() => setSort('loved')}>
              Most loved
            </button>
          </div>
        </div>
        <NoteList
          key={cat.id}
          category={cat.id}
          sort={sort}
          empty={
            <div className="empty">
              <img src={cat.art} alt="" />
              <h3>Nothing has bloomed here yet</h3>
              <p>Be the first to plant a note in {cat.name}. Someone out there needs it.</p>
              <button type="button" className="btn btn--primary" onClick={() => write(cat.id)}>
                Plant the first note
              </button>
            </div>
          }
        />
      </section>
    </>
  )
}
