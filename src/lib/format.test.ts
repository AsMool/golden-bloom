import { describe, expect, it } from 'vitest'
import { hashOf, plural, timeAgo } from './format'

describe('timeAgo', () => {
  const now = Date.parse('2026-10-22T12:00:00Z')

  it('says "just now" for the last minute', () => {
    expect(timeAgo('2026-10-22T11:59:30Z', now)).toBe('just now')
  })

  it('counts minutes, hours and days', () => {
    expect(timeAgo('2026-10-22T11:55:00Z', now)).toBe('5 minutes ago')
    expect(timeAgo('2026-10-22T09:00:00Z', now)).toBe('3 hours ago')
    expect(timeAgo('2026-10-21T12:00:00Z', now)).toBe('yesterday')
  })

  it('shows the date after a week', () => {
    expect(timeAgo('2026-10-01T12:00:00Z', now)).toBe('Oct 1')
  })
})

describe('plural', () => {
  it('picks the right word', () => {
    expect(plural(1, 'note')).toBe('1 note')
    expect(plural(0, 'note')).toBe('0 notes')
    expect(plural(1200, 'heart')).toBe('1,200 hearts')
  })
})

describe('hashOf', () => {
  it('gives each note the same number every time, between 0 and 1', () => {
    const a = hashOf('3f1c9a52-0d7e-4c43-9f6e-2b8f0a1d5e77')
    expect(a).toBe(hashOf('3f1c9a52-0d7e-4c43-9f6e-2b8f0a1d5e77'))
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThanOrEqual(1)
    expect(a).not.toBe(hashOf('another note'))
  })
})
