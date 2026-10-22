import { useCallback, useState } from 'react'
import { api } from '../lib/api'
import { useNoteEvents } from '../lib/notes'
import { useSession } from '../lib/session'
import type { Note } from '../lib/types'
import { Icon } from './Icon'
import { NoteCard } from './NoteCard'
import './Envelope.css'

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

// A sealed envelope with a random kind note inside.
export function Envelope() {
  const { key } = useSession()
  const [state, setState] = useState<'sealed' | 'opening' | 'open'>('sealed')
  const [note, setNote] = useState<Note | null>(null)
  const [swapping, setSwapping] = useState(false)
  const [error, setError] = useState(false)

  useNoteEvents(
    useCallback((e) => {
      setNote((n) => {
        if (!n) return n
        if (e.type === 'patch' && e.patch.id === n.id) return { ...n, ...e.patch }
        return n
      })
    }, []),
  )

  const open = async () => {
    if (state !== 'sealed') return
    setState('opening')
    setError(false)
    const [next] = await Promise.all([api.randomNote(key, null).catch(() => null), wait(1050)])
    if (!next) {
      setError(true)
      setState('sealed')
      return
    }
    setNote(next)
    setState('open')
  }

  const another = async () => {
    setSwapping(true)
    const [next] = await Promise.all([api.randomNote(key, note?.id ?? null).catch(() => null), wait(260)])
    if (next) setNote(next)
    else setError(true)
    setSwapping(false)
  }

  if (state === 'open' && note) {
    return (
      <div className="letter-out">
        <div className={`letter-out__note${swapping ? ' letter-out__note--swap' : ''}`} key={note.id}>
          <NoteCard note={note} size="big" />
        </div>
        <div className="letter-out__actions">
          <button type="button" className="btn btn--primary" onClick={another} disabled={swapping}>
            <Icon name="refresh" size={18} /> Another one
          </button>
          <button type="button" className="btn btn--quiet" onClick={() => setState('sealed')}>
            Seal it again
          </button>
        </div>
        {error && <p className="letter-out__error">No other note to pick right now.</p>}
      </div>
    )
  }

  return (
    <div className="envelope-wrap">
      <button
        type="button"
        className={`envelope envelope--${state}`}
        onClick={open}
        aria-label="Open the envelope to read a kind note"
        aria-busy={state === 'opening'}
      >
        <span className="envelope__back" />
        <span className="envelope__letter">
          <i />
          <i />
          <i />
        </span>
        <span className="envelope__pocket" />
        <span className="envelope__flap" />
        <span className="envelope__seal">
          <Icon name="flower" size={26} />
        </span>
      </button>
      <p className="envelope-wrap__hint">{error ? "We couldn't open it. Check your connection and tap again." : 'Tap to open'}</p>
    </div>
  )
}
