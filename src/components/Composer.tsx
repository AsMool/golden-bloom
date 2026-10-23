import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { api } from '../lib/api'
import { CATEGORIES, PAPERS, categoryById } from '../lib/categories'
import { errorCode, friendlyError } from '../lib/errors'
import { markPlanted, notes } from '../lib/notes'
import { go, href } from '../lib/router'
import { useSession } from '../lib/session'
import type { CategoryId, Note, Paper } from '../lib/types'
import { useUi } from '../lib/ui'
import { Icon } from './Icon'
import { NoteCard } from './NoteCard'
import { Sheet } from './Sheet'
import './Composer.css'

const MAX = 280
const DRAFT_KEY = 'golden-bloom.draft'

type Draft = { category: CategoryId; body: string; recipient: string; paper: Paper }

function readDraft(): Partial<Draft> {
  try {
    return JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function saveDraft(d: Draft | null) {
  try {
    if (d) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d))
    else window.localStorage.removeItem(DRAFT_KEY)
  } catch {
    // nothing to do: the draft just won't be remembered
  }
}

export default function Composer({ initialCategory, onClose }: { initialCategory?: CategoryId; onClose: () => void }) {
  const { key, member, setMember } = useSession()
  const { toast, fail } = useUi()
  const [draft] = useState(readDraft)
  const [openedAt] = useState(() => new Date().toISOString())
  const [category, setCategory] = useState<CategoryId>(initialCategory ?? draft.category ?? 'confidence_boost')
  const [body, setBody] = useState(draft.body ?? '')
  const [recipient, setRecipient] = useState(draft.recipient ?? '')
  const [paper, setPaper] = useState<Paper>(draft.paper ?? categoryById(initialCategory ?? 'confidence_boost').paper)
  const [prompt, setPrompt] = useState(0)
  const [ideaText, setIdeaText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [needsConfirm, setNeedsConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const cat = categoryById(category)
  const anonymous = Boolean(cat.anonymous)
  const length = body.trim().length
  // true once the writer has typed something of their own (not just an untouched idea)
  const ownWords = body.trim() !== '' && body !== ideaText

  useEffect(() => {
    saveDraft({ category, body, recipient, paper })
  }, [category, body, recipient, paper])

  const pickCategory = (id: CategoryId) => {
    setCategory(id)
    setNeedsConfirm(false)
    if (!ownWords) {
      setPaper(categoryById(id).paper)
      if (body) setBody('')
    }
  }

  // Starts the note with a prompt, and puts the cursor where the "…" was.
  const idea = () => {
    const text = cat.prompts[prompt % cat.prompts.length]
    const at = text.indexOf('…')
    const atEnd = at === text.length - 1
    const next = at === -1 ? `${text} ` : atEnd ? `${text.slice(0, at)} ` : text.slice(0, at) + text.slice(at + 1)
    const caret = at === -1 || atEnd ? next.length : at
    // render the new text right away, so the cursor can be placed in it
    flushSync(() => {
      setBody(next)
      setIdeaText(next)
      setPrompt((prompt + 1) % cat.prompts.length)
    })
    bodyRef.current?.focus()
    bodyRef.current?.setSelectionRange(caret, caret)
  }

  const preview: Note = {
    id: 'preview',
    category,
    body: body.trim(),
    recipient: anonymous ? recipient.trim() || null : null,
    author: anonymous ? null : (member?.display_name ?? 'You'),
    paper,
    hearts: 0,
    shares: 0,
    created_at: openedAt,
    is_seed: false,
    liked: false,
    mine: true,
    status: null,
  }

  const plant = async (confirm: boolean) => {
    if (!key) return
    if (length < 3) {
      setError('Your note is a bit short. Add a few more words.')
      bodyRef.current?.focus()
      return
    }
    setBusy(true)
    setError(null)
    try {
      const note = await api.postNote({
        key,
        category,
        body: body.trim(),
        recipient: anonymous ? recipient.trim() || null : null,
        paper,
        confirm,
      })
      saveDraft(null)
      markPlanted(note.id)
      notes.added(note)
      if (member) setMember({ ...member, notes: member.notes + 1 })
      toast(`Your note is planted in ${cat.name}!`, 'success')
      onClose()
      go(href.category(cat.slug))
    } catch (err) {
      const code = errorCode(err)
      if (code === 'please_confirm') setNeedsConfirm(true)
      else if (['network', 'slow_down', 'not_a_member'].includes(code)) fail(err)
      else setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet onClose={onClose} wide labelledBy="composer-title">
      <h2 id="composer-title" className="composer__title">
        Write a kind note
      </h2>
      <div className="composer">
        <form
          className="composer__form"
          onSubmit={(e) => {
            e.preventDefault()
            void plant(false)
          }}
        >

          <fieldset className="composer__group">
            <legend className="field__label">Where should it bloom?</legend>
            <div className="chips composer__cats" role="radiogroup" aria-label="Corner of the garden">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={category === c.id}
                  className={`chip${category === c.id ? ' chip--on' : ''}`}
                  onClick={() => pickCategory(c.id)}
                >
                  <img src={c.art} alt="" width="22" height="22" />
                  {c.name}
                </button>
              ))}
            </div>
            <p className="field__hint">{cat.blurb}</p>
          </fieldset>

          {anonymous && (
            <label className="field">
              <span className="field__label">Who is it for?</span>
              <input
                className="input"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value.slice(0, 40))}
                placeholder="A first name, a nickname or a little hint"
                maxLength={40}
              />
              <span className="field__hint">Optional. Your name stays secret: notes here are always anonymous.</span>
            </label>
          )}

          <div className="field">
            <div className="composer__label-row">
              <label className="field__label" htmlFor="note-body">
                Your note
              </label>
              {!ownWords && (
                <button type="button" className="link-btn composer__idea" onClick={idea}>
                  <Icon name="sparkle" size={16} /> {body ? 'Another idea' : 'Give me an idea'}
                </button>
              )}
            </div>
            <textarea
              id="note-body"
              ref={bodyRef}
              className="textarea composer__body"
              value={body}
              onChange={(e) => {
                setBody(e.target.value.slice(0, MAX))
                setNeedsConfirm(false)
                setError(null)
              }}
              placeholder={cat.prompts[prompt % cat.prompts.length]}
              rows={4}
              maxLength={MAX}
              autoFocus
            />
            <div className="composer__meta">
              <span className="field__hint">No full names, numbers, links or @usernames.</span>
              <span className={`composer__count${MAX - body.length < 30 ? ' composer__count--low' : ''}`} aria-live="polite">
                {body.length}/{MAX}
              </span>
            </div>
          </div>

          <fieldset className="composer__group">
            <legend className="field__label">Paper</legend>
            <div className="papers" role="radiogroup" aria-label="Paper colour">
              {PAPERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={paper === p.id}
                  aria-label={p.name}
                  title={p.name}
                  className={`paper-swatch paper-swatch--${p.id}`}
                  onClick={() => setPaper(p.id)}
                >
                  {paper === p.id && <Icon name="check" size={16} />}
                </button>
              ))}
            </div>
          </fieldset>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          {needsConfirm ? (
            <div className="callout composer__confirm" role="alert">
              <p>
                <strong>Quick check:</strong> your note has a word that is often used to hurt, like "ugly" or "fat". If you mean it kindly
                ("you are not ugly at all!"), you can still plant it and a moderator will take a quick look.
              </p>
              <div className="composer__confirm-actions">
                <button type="button" className="btn btn--small" onClick={() => (setNeedsConfirm(false), bodyRef.current?.focus())}>
                  Change my note
                </button>
                <button type="button" className="btn btn--small btn--ink" disabled={busy} onClick={() => void plant(true)}>
                  It's kind, plant it
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn--primary btn--big composer__go" disabled={busy}>
              {busy ? 'Planting…' : 'Plant this note'}
              <Icon name="leaf" />
            </button>
          )}
        </form>

        <aside className="composer__preview" aria-label="Preview">
          <p className="eyebrow">Preview</p>
          <NoteCard note={preview} size="preview" />
          <p className="composer__sign">
            {anonymous ? (
              <>
                <Icon name="envelope" size={16} /> Sent anonymously. Nobody will know it was you.
              </>
            ) : (
              <>
                Signed with your first name. Want to stay anonymous? Choose <strong>From Me To You</strong>.
              </>
            )}
          </p>
        </aside>
      </div>
    </Sheet>
  )
}
