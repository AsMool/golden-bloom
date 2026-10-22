import { useCallback, useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { NoteCard } from '../components/NoteCard'
import { api } from '../lib/api'
import { categoryById } from '../lib/categories'
import { noteLink, useNoteEvents } from '../lib/notes'
import { href } from '../lib/router'
import { useSession } from '../lib/session'
import type { Note } from '../lib/types'
import { useUi } from '../lib/ui'
import './pages.css'

export function NotePage({ id }: { id: string }) {
  const { key, ready } = useSession()
  const { write, toast } = useUi()
  const [note, setNote] = useState<Note | null | undefined>(undefined)

  useEffect(() => {
    if (!ready) return
    let alive = true
    api.getNote(id, key).then(
      (n) => alive && setNote(n),
      () => alive && setNote(null),
    )
    return () => {
      alive = false
    }
  }, [id, key, ready])

  useNoteEvents(
    useCallback(
      (e) => {
        if (e.type === 'patch' && e.patch.id === id) setNote((n) => (n ? { ...n, ...e.patch } : n))
        if (e.type === 'gone' && e.id === id) setNote(null)
      },
      [id],
    ),
  )

  useEffect(() => {
    if (note) document.title = `“${note.body.slice(0, 50)}${note.body.length > 50 ? '…' : ''}” · Golden Bloom`
  }, [note])

  if (note === undefined)
    return (
      <div className="container container--narrow section">
        <div className="note-skeleton" style={{ height: 260 }} />
      </div>
    )

  if (note === null)
    return (
      <div className="container container--narrow section">
        <div className="empty">
          <h3>This note isn't in the garden anymore</h3>
          <p>It may have been taken back by the person who wrote it. There are plenty of others waiting for you.</p>
          <a className="btn btn--primary" href={href.home}>
            Back to the garden
          </a>
        </div>
      </div>
    )

  const cat = categoryById(note.category)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(noteLink(note.id))
      toast('Link copied! Send it to someone who needs it.', 'success')
    } catch {
      toast('Could not copy the link.', 'error')
    }
  }

  return (
    <div className="container container--narrow section note-page">
      <a className="back-link" href={href.category(cat.slug)}>
        <Icon name="arrowLeft" size={18} /> More from {cat.name}
      </a>
      <NoteCard note={note} size="big" />
      <div className="note-page__after">
        <p>Know someone who needs to read this today?</p>
        <div className="note-page__actions">
          <button type="button" className="btn" onClick={copy}>
            <Icon name="copy" size={18} /> Copy the link
          </button>
          <button type="button" className="btn btn--primary" onClick={() => write(note.category)}>
            <Icon name="pen" size={18} /> Write one back
          </button>
        </div>
      </div>
    </div>
  )
}
