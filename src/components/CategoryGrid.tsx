import type { CSSProperties } from 'react'
import { CATEGORIES, MOST_LOVED } from '../lib/categories'
import { plural } from '../lib/format'
import { href } from '../lib/router'
import type { Stats } from '../lib/types'
import { Icon } from './Icon'
import './CategoryGrid.css'

const tint = (t: string, deep: string) => ({ '--tint': t, '--deep': deep }) as CSSProperties

// hearts drifting up the tall Most Loved card (desktop only, see the CSS)
const FLOATERS = [
  { x: 16, size: 19, delay: 0, dur: 9 },
  { x: 70, size: 14, delay: 2.4, dur: 11 },
  { x: 42, size: 16, delay: 4.8, dur: 10 },
  { x: 84, size: 12, delay: 6.3, dur: 12 },
  { x: 28, size: 12, delay: 8, dur: 9.5 },
]

export function CategoryGrid({ stats }: { stats: Stats | null }) {
  return (
    <div className="beds">
      <a className="bed bed--loved" href={href.loved} style={tint(MOST_LOVED.tint, MOST_LOVED.deep)}>
        <span className="bed__arch">
          <img src={MOST_LOVED.art} alt="" width="120" height="120" />
          <span className="bed__float" aria-hidden="true">
            {FLOATERS.map((h, i) => (
              <i key={i} style={{ '--x': `${h.x}%`, '--delay': `${h.delay}s`, '--dur': `${h.dur}s` } as CSSProperties}>
                <Icon name="heart" size={h.size} filled />
              </i>
            ))}
          </span>
        </span>
        <span className="bed__text">
          <span className="bed__name">{MOST_LOVED.name}</span>
          <span className="bed__blurb">{MOST_LOVED.blurb}</span>
          <span className="bed__count">
            <Icon name="heart" size={15} filled /> {stats ? plural(stats.hearts, 'heart') : 'Hearts and shares'}
          </span>
        </span>
      </a>
      {CATEGORIES.map((c) => (
        <a key={c.id} className="bed" href={href.category(c.slug)} style={tint(c.tint, c.deep)}>
          <span className="bed__arch">
            <img src={c.art} alt="" width="120" height="120" />
          </span>
          <span className="bed__text">
            <span className="bed__name">{c.name}</span>
            <span className="bed__blurb">{c.blurb}</span>
            <span className="bed__count">{stats ? plural(stats.by_category[c.id] ?? 0, 'note') : c.flower}</span>
          </span>
        </a>
      ))}
    </div>
  )
}
