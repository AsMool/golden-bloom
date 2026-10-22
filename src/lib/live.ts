// Live updates from the database: hearts counting up, notes appearing and leaving.
// The site works without them; they just make the garden feel alive.
import { useEffect } from 'react'
import { supabase } from './api'
import { notes } from './notes'
import type { CategoryId } from './types'

type NewNote = { id: string; category: CategoryId }
const newNoteListeners = new Set<(n: NewNote) => void>()
let started = false

export function startLive() {
  if (started) return
  started = true
  supabase
    .channel('garden')
    .on('broadcast', { event: 'hearts' }, ({ payload }) => {
      if (payload?.id && typeof payload.hearts === 'number') notes.patch({ id: payload.id, hearts: payload.hearts })
    })
    .on('broadcast', { event: 'gone' }, ({ payload }) => {
      if (payload?.id) notes.gone(payload.id)
    })
    .on('broadcast', { event: 'note' }, ({ payload }) => {
      if (payload?.id) newNoteListeners.forEach((l) => l(payload as NewNote))
    })
    .subscribe()
}

export function useLiveNotes(listener: (n: NewNote) => void) {
  useEffect(() => {
    newNoteListeners.add(listener)
    return () => {
      newNoteListeners.delete(listener)
    }
  }, [listener])
}
