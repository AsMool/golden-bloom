import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { NoteCard } from '../components/NoteCard'
import { api } from '../lib/api'
import { plural } from '../lib/format'
import { notes } from '../lib/notes'
import { href } from '../lib/router'
import { useSession } from '../lib/session'
import type { QueuedNote, ReportReason } from '../lib/types'
import { useUi } from '../lib/ui'
import './pages.css'

const REASON_LABELS: Record<ReportReason, string> = {
  mean: 'mean or rude',
  body_shaming: 'puts down looks',
  personal_info: 'private info',
  spam: 'spam',
  other: 'something else',
}

export function ModeratePage() {
  const { key, member, ready } = useSession()
  const { toast, fail } = useUi()
  const [queue, setQueue] = useState<QueuedNote[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!key) return
    setQueue(null)
    try {
      setQueue(await api.moderationQueue(key))
    } catch (err) {
      setQueue([])
      fail(err)
    }
  }, [key, fail])

  useEffect(() => {
    if (member?.is_moderator) void load()
  }, [member?.is_moderator, load])

  if (!ready) return null
  if (!member?.is_moderator)
    return (
      <div className="container container--narrow section">
        <div className="empty">
          <h3>Moderators only</h3>
          <p>If you were given a moderator code, enter it in your settings to open the queue.</p>
          <a className="btn btn--primary" href={href.me}>
            Go to my settings
          </a>
        </div>
      </div>
    )

  const decide = async (note: QueuedNote, action: 'keep' | 'remove') => {
    if (!key) return
    setBusy(note.id)
    try {
      await api.moderate(key, note.id, action)
      setQueue((q) => q?.filter((n) => n.id !== note.id) ?? null)
      if (action === 'remove') notes.gone(note.id)
      toast(action === 'keep' ? 'Kept in the garden.' : 'Removed from the garden.', 'success')
    } catch (err) {
      fail(err)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="container section section--tight">
      <div className="section-head">
        <div>
          <p className="eyebrow">
            <Icon name="shield" size={16} /> Moderation
          </p>
          <h1 className="page-title">Notes waiting for a look</h1>
          <p>Hidden notes come first. "Keep" puts a note back for good; "Remove" takes it down.</p>
        </div>
        <button type="button" className="btn btn--small" onClick={() => void load()}>
          <Icon name="refresh" size={17} /> Refresh
        </button>
      </div>

      {queue === null ? (
        <div className="note-skeleton" style={{ height: 180 }} />
      ) : queue.length === 0 ? (
        <div className="empty">
          <h3>All clear!</h3>
          <p>Nothing to check right now. The garden is being kind.</p>
        </div>
      ) : (
        <ul className="queue">
          {queue.map((n) => (
            <li key={n.id} className="queue__item">
              <NoteCard note={{ ...n, status: null }} size="preview" />
              <div className="queue__panel">
                <div className="queue__badges">
                  {n.status === 'hidden' ? <span className="badge badge--alert">Hidden</span> : <span className="badge">Visible</span>}
                  {n.needs_review && <span className="badge">Sensitive word</span>}
                  {n.reports > 0 && <span className="badge">{plural(n.reports, 'report')}</span>}
                </div>
                {Object.keys(n.reasons).length > 0 && (
                  <p className="queue__reasons">
                    {Object.entries(n.reasons)
                      .map(([r, count]) => `${count}× ${REASON_LABELS[r as ReportReason] ?? r}`)
                      .join(' · ')}
                  </p>
                )}
                <div className="queue__actions">
                  <button type="button" className="btn btn--small" disabled={busy === n.id} onClick={() => decide(n, 'keep')}>
                    <Icon name="check" size={17} /> Keep
                  </button>
                  <button type="button" className="btn btn--small btn--danger" disabled={busy === n.id} onClick={() => decide(n, 'remove')}>
                    <Icon name="trash" size={17} /> Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ResetPassword />
    </div>
  )
}

function ResetPassword() {
  const { key } = useSession()
  const { toast, fail } = useUi()
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [result, setResult] = useState<{ name: string; password: string } | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!key) return
    setBusy(true)
    setMessage(null)
    setResult(null)
    try {
      const res = await api.resetPassword(key, first.trim(), last.trim())
      if (res.ok && res.temp_password) {
        setResult({ name: res.name ?? `${first} ${last}`, password: res.temp_password })
        setFirst('')
        setLast('')
      } else {
        setMessage("No one in the garden has that first and last name. Check the spelling.")
      }
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.password)
      toast('Copied!', 'success')
    } catch {
      toast('Could not copy. Select it and copy by hand.', 'error')
    }
  }

  return (
    <form className="settings__card" onSubmit={submit} style={{ marginTop: 32 }}>
      <h2>
        <Icon name="key" /> Locked out?
      </h2>
      <p className="muted">Someone forgot their password? Type their name to give them a temporary one.</p>
      <div className="settings__grid">
        <label className="field">
          <span className="field__label">First name</span>
          <input className="input" value={first} onChange={(e) => setFirst(e.target.value)} maxLength={24} autoComplete="off" />
        </label>
        <label className="field">
          <span className="field__label">Last name</span>
          <input className="input" value={last} onChange={(e) => setLast(e.target.value)} maxLength={24} autoComplete="off" />
        </label>
      </div>
      {message && (
        <p className="form-error" role="alert">
          {message}
        </p>
      )}
      {result && (
        <div role="status">
          <p>
            Temporary password for <strong>{result.name}</strong>:
          </p>
          <code className="garden-key">{result.password}</code>
          <div className="settings__row">
            <button type="button" className="btn btn--small" onClick={copy}>
              <Icon name="copy" size={17} /> Copy
            </button>
          </div>
          <p className="muted">Tell them to log in with it, then change it in Me → Settings. They are logged out everywhere else.</p>
        </div>
      )}
      <div>
        <button className="btn btn--small" disabled={busy || !first.trim() || !last.trim()}>
          {busy ? 'Working…' : 'Make a temporary password'}
        </button>
      </div>
    </form>
  )
}
