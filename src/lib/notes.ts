// A tiny message bus so every list showing a note stays in sync: hearts, shares,
// notes taken down, and new notes arriving (from this page or from the live channel).
import { useEffect } from 'react'
import { SITE_URL } from './config'
import { href } from './router'
import type { Note } from './types'

export const noteLink = (id: string) => `${SITE_URL}${href.note(id)}`

// The id of the note someone just planted, so its card can wave hello once.
let freshlyPlanted: string | null = null
export const markPlanted = (id: string) => {
  freshlyPlanted = id
}
export const takePlanted = (id: string) => {
  if (freshlyPlanted !== id) return false
  freshlyPlanted = null
  return true
}

type Patch = { id: string } & Partial<Note>
type Listener = (e: { type: 'patch'; patch: Patch } | { type: 'gone'; id: string } | { type: 'added'; note: Note }) => void

const listeners = new Set<Listener>()

export const notes = {
  patch: (patch: Patch) => listeners.forEach((l) => l({ type: 'patch', patch })),
  gone: (id: string) => listeners.forEach((l) => l({ type: 'gone', id })),
  added: (note: Note) => listeners.forEach((l) => l({ type: 'added', note })),
}

export function useNoteEvents(listener: Listener) {
  useEffect(() => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [listener])
}

// Keeps an array of notes up to date with the bus. `accept` decides if a new note belongs in it.
export function applyNoteEvent(list: Note[], e: Parameters<Listener>[0], accept?: (n: Note) => boolean): Note[] {
  if (e.type === 'patch') return list.map((n) => (n.id === e.patch.id ? { ...n, ...e.patch } : n))
  if (e.type === 'gone') return list.filter((n) => n.id !== e.id)
  if (accept?.(e.note) && !list.some((n) => n.id === e.note.id)) return [e.note, ...list]
  return list
}
