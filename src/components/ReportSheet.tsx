import { useState } from 'react'
import { api } from '../lib/api'
import { notes } from '../lib/notes'
import { useSession } from '../lib/session'
import type { Note, ReportReason } from '../lib/types'
import { useUi } from '../lib/ui'
import { Sheet } from './Sheet'
import './ReportSheet.css'

const REASONS: { id: ReportReason; label: string; hint: string }[] = [
  { id: 'mean', label: "It's mean or rude", hint: 'Insults, teasing, or a "joke" that hurts.' },
  { id: 'body_shaming', label: 'It puts down how someone looks', hint: 'Comments on bodies, weight, skin, or anything like that.' },
  { id: 'personal_info', label: 'It shares private info', hint: 'A full name, an address, a phone number, a username…' },
  { id: 'spam', label: "It's spam or nonsense", hint: 'Ads, copy-paste, random letters.' },
  { id: 'other', label: 'Something else', hint: "It just doesn't feel right." },
]

export default function ReportSheet({ note, onClose }: { note: Note; onClose: () => void }) {
  const { key } = useSession()
  const { toast, fail } = useUi()
  const [reason, setReason] = useState<ReportReason>('mean')
  const [busy, setBusy] = useState(false)

  const send = async () => {
    if (!key) return
    setBusy(true)
    try {
      const res = await api.report(key, note.id, reason)
      if (res.hidden) notes.gone(note.id)
      toast('Thank you for looking out. A moderator will check it.', 'success')
      onClose()
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title="Report this note" onClose={onClose}>
      <p className="muted report__intro">
        Reports are anonymous. When a few people report the same note, it is hidden until a moderator looks at it.
      </p>
      <blockquote className="report__quote">“{note.body}”</blockquote>
      <fieldset className="report__reasons">
        <legend className="sr-only">What is wrong with it?</legend>
        {REASONS.map((r) => (
          <label key={r.id} className={`reason${reason === r.id ? ' reason--on' : ''}`}>
            <input type="radio" name="reason" value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} />
            <span>
              <strong>{r.label}</strong>
              <small>{r.hint}</small>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="confirm-actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn--ink" disabled={busy} onClick={send}>
          {busy ? 'Sending…' : 'Send report'}
        </button>
      </div>
    </Sheet>
  )
}
