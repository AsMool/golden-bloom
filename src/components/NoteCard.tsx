import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { api } from '../lib/api'
import { categoryById } from '../lib/categories'
import { hashOf, timeAgo } from '../lib/format'
import { noteLink, notes, takePlanted } from '../lib/notes'
import { href } from '../lib/router'
import { useSession } from '../lib/session'
import type { Note } from '../lib/types'
import { useUi } from '../lib/ui'
import { ConfirmSheet } from './ConfirmSheet'
import { Icon } from './Icon'
import './NoteCard.css'

export function NoteCard({ note, size = 'normal', rank }: { note: Note; size?: 'normal' | 'big' | 'preview'; rank?: number }) {
  const category = categoryById(note.category)
  const h = hashOf(note.id || note.body)
  const [fresh] = useState(() => takePlanted(note.id))

  const style = { '--tilt': `${size === 'normal' ? ((h - 0.5) * 3.2).toFixed(2) : 0}deg` } as CSSProperties
  const tape = size !== 'preview' && h > 0.62
  const classes = ['note', `note--${note.paper}`, `note--${size}`, fresh && 'note--fresh', note.status === 'hidden' && 'note--hidden']

  return (
    <article className={classes.filter(Boolean).join(' ')} style={style} aria-label={`Note in ${category.name}`}>
      {tape && <span className={`note__tape note__tape--${Math.floor(h * 100) % 3}`} aria-hidden="true" />}
      {rank !== undefined && rank < 3 && (
        <span className="note__rank" aria-label={`Number ${rank + 1} most loved`}>
          {rank + 1}
        </span>
      )}
      <header className="note__top">
        {size === 'preview' ? (
          <span className="note__cat">
            <img src={category.art} alt="" width="22" height="22" />
            {category.name}
          </span>
        ) : (
          <a className="note__cat" href={href.category(category.slug)}>
            <img src={category.art} alt="" width="22" height="22" />
            {category.name}
          </a>
        )}
        {size !== 'preview' && note.created_at && (
          <a className="note__time" href={href.note(note.id)} title="Open this note">
            <time dateTime={note.created_at}>{timeAgo(note.created_at)}</time>
          </a>
        )}
      </header>

      {note.category === 'from_me_to_you' && (
        <p className="note__to">
          To: <span>{note.recipient?.trim() || 'you'}</span>
        </p>
      )}

      <p className={`note__body${note.body ? '' : ' note__body--empty'}`}>{note.body || 'Your note will appear here…'}</p>

      <footer className="note__foot">
        {note.author ? (
          <span className="note__by">{note.author}</span>
        ) : (
          <span className="note__by note__by--anon">
            <Icon name="envelope" size={16} /> Anonymous
          </span>
        )}
        {size !== 'preview' && (
          <div className="note__actions">
            <HeartButton note={note} />
            <ShareButton note={note} />
            <NoteMenu note={note} />
          </div>
        )}
      </footer>

      {note.status === 'hidden' && (
        <p className="note__status">
          <Icon name="eye" size={16} /> Only you can see this for now: a moderator is taking a look.
        </p>
      )}
    </article>
  )
}

function HeartButton({ note }: { note: Note }) {
  const { withMember, fail } = useUi()
  const [burst, setBurst] = useState(0)
  const busy = useRef(false)

  const toggle = () =>
    withMember(async (key) => {
      if (busy.current) return
      busy.current = true
      const liked = !note.liked
      notes.patch({ id: note.id, liked, hearts: Math.max(0, note.hearts + (liked ? 1 : -1)) })
      if (liked) setBurst((b) => b + 1)
      try {
        const res = await api.toggleLike(key, note.id)
        notes.patch({ id: note.id, liked: res.liked, hearts: res.hearts })
      } catch (err) {
        notes.patch({ id: note.id, liked: note.liked, hearts: note.hearts })
        fail(err)
      } finally {
        busy.current = false
      }
    }, 'Join the garden to give hearts to the notes you love.')

  return (
    <button
      type="button"
      className={`heart${note.liked ? ' heart--on' : ''}`}
      aria-pressed={note.liked}
      aria-label={note.liked ? `Take back your heart (${note.hearts} hearts)` : `Give a heart (${note.hearts} hearts)`}
      onClick={toggle}
    >
      <Icon name="heart" filled={note.liked} size={20} />
      <span className="heart__count">{note.hearts}</span>
      {burst > 0 && <PetalBurst key={burst} />}
    </button>
  )
}

function PetalBurst() {
  return (
    <span className="burst" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <i key={i} style={{ '--a': `${i * 45 + 12}deg`, '--d': `${30 + (i % 3) * 7}px` } as CSSProperties} />
      ))}
    </span>
  )
}

function ShareButton({ note }: { note: Note }) {
  const { key } = useSession()
  const { toast } = useUi()

  const share = async () => {
    const url = noteLink(note.id)
    const text = `“${note.body}”${note.author ? ` (${note.author})` : ''}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'A kind note from Golden Bloom', text, url })
      } else {
        await navigator.clipboard.writeText(url)
        toast('Link copied! Send it to someone who needs it.', 'success')
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      toast('Could not share this one. You can copy the link from the address bar.', 'error')
      return
    }
    try {
      const res = await api.recordShare(note.id, key)
      notes.patch({ id: note.id, shares: res.shares })
    } catch {
      // the share happened anyway; the counter can wait
    }
  }

  return (
    <button type="button" className="icon-btn note__share" onClick={share} aria-label="Share this note">
      <Icon name="share" size={19} />
    </button>
  )
}

function NoteMenu({ note }: { note: Note }) {
  const { key, member } = useSession()
  const { report, toast, fail } = useUi()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const copy = async () => {
    setOpen(false)
    try {
      await navigator.clipboard.writeText(noteLink(note.id))
      toast('Link copied!', 'success')
    } catch {
      toast('Could not copy the link.', 'error')
    }
  }

  const takeDown = async () => {
    if (!key) return
    try {
      await api.deleteNote(key, note.id)
      notes.gone(note.id)
      toast(note.mine ? 'Your note was taken back.' : 'The note was removed from the garden.', 'success')
    } catch (err) {
      fail(err)
    } finally {
      setConfirm(false)
    }
  }

  const canRemove = note.mine || member?.is_moderator

  return (
    <div className="menu" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="more" size={20} />
      </button>
      {open && (
        <div className="menu__list" role="menu">
          <button type="button" role="menuitem" onClick={copy}>
            <Icon name="copy" size={18} /> Copy link
          </button>
          {!note.mine && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                report(note)
              }}
            >
              <Icon name="flag" size={18} /> Report this note
            </button>
          )}
          {canRemove && (
            <button
              type="button"
              role="menuitem"
              className="menu__danger"
              onClick={() => {
                setOpen(false)
                setConfirm(true)
              }}
            >
              <Icon name="trash" size={18} /> {note.mine ? 'Take this note back' : 'Remove from the garden'}
            </button>
          )}
        </div>
      )}
      {confirm && (
        <ConfirmSheet
          title={note.mine ? 'Take this note back?' : 'Remove this note?'}
          body={
            note.mine
              ? 'It will disappear from the garden, along with its hearts. This cannot be undone.'
              : 'It will disappear from the garden for everyone.'
          }
          confirmLabel={note.mine ? 'Take it back' : 'Remove it'}
          onConfirm={takeDown}
          onClose={() => setConfirm(false)}
        />
      )}
    </div>
  )
}
