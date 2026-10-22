import { describe, expect, it } from 'vitest'
import { CATEGORIES, categoryBySlug } from './categories'
import { href, parseHash } from './router'

describe('parseHash', () => {
  it('reads every page of the site', () => {
    expect(parseHash('')).toEqual({ name: 'home' })
    expect(parseHash('#/')).toEqual({ name: 'home' })
    expect(parseHash('#/garden/mirror-talk')).toEqual({ name: 'category', slug: 'mirror-talk' })
    expect(parseHash('#/most-loved')).toEqual({ name: 'loved' })
    expect(parseHash('#/note/abc')).toEqual({ name: 'note', id: 'abc' })
    expect(parseHash('#/me')).toEqual({ name: 'me' })
    expect(parseHash('#/moderate')).toEqual({ name: 'moderate' })
    expect(parseHash('#/about')).toEqual({ name: 'about', section: undefined })
    expect(parseHash('#/about/help')).toEqual({ name: 'about', section: 'help' })
    expect(parseHash('#/somewhere-else')).toEqual({ name: 'not-found' })
  })

  it('reads back every link it writes', () => {
    for (const c of CATEGORIES) expect(parseHash(href.category(c.slug))).toEqual({ name: 'category', slug: c.slug })
    expect(parseHash(href.about('privacy'))).toEqual({ name: 'about', section: 'privacy' })
  })
})

describe('categories', () => {
  it('has the six corners from the brief, each with its own address', () => {
    expect(CATEGORIES.map((c) => c.name)).toEqual([
      'Confidence Boost',
      'Bad Day Comfort',
      'Body Love Letters',
      'You Are Not Alone',
      'Mirror Talk',
      'From Me To You',
    ])
    expect(new Set(CATEGORIES.map((c) => c.slug)).size).toBe(CATEGORIES.length)
    for (const c of CATEGORIES) expect(categoryBySlug(c.slug)).toBe(c)
  })

  it('keeps From Me To You anonymous, and only that one', () => {
    expect(CATEGORIES.filter((c) => c.anonymous).map((c) => c.id)).toEqual(['from_me_to_you'])
  })

  it('gives every corner writing ideas with a gap to fill', () => {
    for (const c of CATEGORIES) {
      expect(c.prompts.length).toBeGreaterThan(0)
      for (const p of c.prompts) expect(p).toContain('…')
    }
  })
})
