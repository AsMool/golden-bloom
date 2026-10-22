import { useCallback, useEffect, useState, type FormEvent } from 'react'
import logoMark from '../assets/art/logo-mark.svg'
import { Avatar } from '../components/Chrome'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { Icon } from '../components/Icon'
import { NoteColumns, NoteSkeletons } from '../components/NoteList'
import { api } from '../lib/api'
import { friendlyError } from '../lib/errors'
import { plural } from '../lib/format'
import { applyNoteEvent, useNoteEvents } from '../lib/notes'
import { go, href } from '../lib/router'
import { useSession } from '../lib/session'
import type { Gender, Note } from '../lib/types'
import { useUi } from '../lib/ui'
import './pages.css'

type Tab = 'mine' | 'loved' | 'settings'

const joined = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' })

export function MePage() {
  const { member, ready } = useSession()
  const { withMember } = useUi()
  const [tab, setTab] = useState<Tab>('mine')

  if (!member) {
    return (
      <div className="container container--narrow section">
        {ready ? (
          <div className="empty">
            <img src={logoMark} alt="" />
            <h3>This is where your garden lives</h3>
            <p>Join with just your first name to keep your notes and the ones you loved.</p>
            <button type="button" className="btn btn--primary" onClick={() => withMember(() => undefined)}>
              Join the garden
            </button>
          </div>
        ) : (
          <div className="note-skeleton" style={{ height: 200 }} />
        )}
      </div>
    )
  }

  return (
    <div className="container section section--tight me">
      <header className="me__head">
        <Avatar name={member.first_name} size={72} moderator={member.is_moderator} />
        <div>
          <h1>Hi, {member.first_name}</h1>
          <p className="muted">Gardening since {joined.format(new Date(member.joined_at))}</p>
        </div>
        <dl className="me__stats">
          <div>
            <dt>Notes planted</dt>
            <dd>{member.notes}</dd>
          </div>
          <div>
            <dt>Hearts received</dt>
            <dd>{member.hearts_received}</dd>
          </div>
          <div>
            <dt>Hearts given</dt>
            <dd>{member.hearts_given}</dd>
          </div>
        </dl>
      </header>

      <div className="tabs me__tabs" role="tablist" aria-label="Your garden">
        <button type="button" role="tab" className="tab" aria-selected={tab === 'mine'} onClick={() => setTab('mine')}>
          My notes
        </button>
        <button type="button" role="tab" className="tab" aria-selected={tab === 'loved'} onClick={() => setTab('loved')}>
          Pressed flowers
        </button>
        <button type="button" role="tab" className="tab" aria-selected={tab === 'settings'} onClick={() => setTab('settings')}>
          Settings
        </button>
      </div>

      {tab === 'mine' && <MyNotes kind="mine" />}
      {tab === 'loved' && <MyNotes kind="loved" />}
      {tab === 'settings' && <Settings />}
    </div>
  )
}

function MyNotes({ kind }: { kind: 'mine' | 'loved' }) {
  const { key } = useSession()
  const { write, fail } = useUi()
  const [items, setItems] = useState<Note[] | null>(null)

  useEffect(() => {
    if (!key) return
    let alive = true
    setItems(null)
    ;(kind === 'mine' ? api.myNotes(key) : api.lovedNotes(key)).then(
      (list) => alive && setItems(list),
      (err) => {
        if (!alive) return
        setItems([])
        fail(err)
      },
    )
    return () => {
      alive = false
    }
  }, [key, kind, fail])

  useNoteEvents(
    useCallback(
      (e) =>
        setItems((list) => {
          if (!list) return list
          const next = applyNoteEvent(list, e, kind === 'mine' ? (n) => n.mine : undefined)
          // a heart taken back drops the note from the pressed flowers
          return kind === 'loved' ? next.filter((n) => n.liked) : next
        }),
      [kind],
    ),
  )

  if (!items) return <NoteSkeletons count={3} />
  if (items.length === 0)
    return kind === 'mine' ? (
      <div className="empty">
        <h3>You haven't planted anything yet</h3>
        <p>Your first note could make someone's whole day.</p>
        <button type="button" className="btn btn--primary" onClick={() => write()}>
          Write a note
        </button>
      </div>
    ) : (
      <div className="empty">
        <h3>No pressed flowers yet</h3>
        <p>Every note you give a heart to is kept here, like a flower pressed in a book.</p>
        <a className="btn btn--primary" href={href.loved}>
          Find notes to love
        </a>
      </div>
    )
  return <NoteColumns items={items} />
}

const GENDERS: { id: Gender; label: string }[] = [
  { id: 'girl', label: 'Girl' },
  { id: 'boy', label: 'Boy' },
  { id: 'non_binary', label: 'Non-binary' },
  { id: 'prefer_not_to_say', label: 'Rather not say' },
]

function Settings() {
  const { key, member, setMember, forget } = useSession()
  const { toast, fail } = useUi()
  const [name, setName] = useState(member?.first_name ?? '')
  const [age, setAge] = useState(String(member?.age ?? ''))
  const [gender, setGender] = useState<Gender>(member?.gender ?? 'prefer_not_to_say')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<'forget' | 'leave' | null>(null)

  if (!key || !member) return null

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const updated = await api.updateMe(key, name.trim(), Number(age), gender)
      setMember(updated)
      toast('Saved!', 'success')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(key)
      toast('Garden key copied. Keep it somewhere safe!', 'success')
    } catch {
      setShowKey(true)
      toast('Could not copy. Select the key and copy it by hand.', 'error')
    }
  }

  const unlock = async (e: FormEvent) => {
    e.preventDefault()
    setCodeError(null)
    try {
      const res = await api.claimModerator(key, code)
      if (res.ok && res.member) {
        setMember(res.member)
        setCode('')
        toast('You are now a moderator. Thank you for looking after the garden!', 'success')
      } else {
        setCodeError("That code isn't right. Check with whoever gave it to you.")
      }
    } catch (err) {
      setCodeError(friendlyError(err))
    }
  }

  const leave = async () => {
    try {
      await api.leave(key)
      forget()
      toast('You left the garden. Take care of yourself!', 'success')
      go(href.home)
    } catch (err) {
      fail(err)
    }
  }

  return (
    <div className="settings">
      <form className="settings__card" onSubmit={save}>
        <h2>About you</h2>
        <p className="muted">Only your first name is shown, on the notes you sign. Your age and gender stay private.</p>
        <div className="settings__grid">
          <label className="field">
            <span className="field__label">First name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} autoComplete="given-name" />
          </label>
          <label className="field">
            <span className="field__label">Age</span>
            <input
              className="input"
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/\D/g, '').slice(0, 2))}
              inputMode="numeric"
            />
          </label>
        </div>
        <div className="field">
          <span className="field__label" id="gender-label">
            Gender
          </span>
          <div className="chips" role="radiogroup" aria-labelledby="gender-label">
            {GENDERS.map((g) => (
              <button key={g.id} type="button" role="radio" aria-checked={gender === g.id} className="chip" onClick={() => setGender(g.id)}>
                {g.label}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div>
          <button className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      <section className="settings__card">
        <h2>
          <Icon name="key" /> Your garden key
        </h2>
        <p className="muted">
          There is no password here: this key is how the garden knows it's you. Copy it somewhere safe (your notes app is perfect). You
          need it to open your garden on another phone, or if you clear your browser.
        </p>
        <code className={`garden-key${showKey ? '' : ' garden-key--hidden'}`}>{showKey ? key : `${key.slice(0, 6)}${'•'.repeat(22)}`}</code>
        <div className="settings__row">
          <button type="button" className="btn btn--small" onClick={copyKey}>
            <Icon name="copy" size={17} /> Copy key
          </button>
          <button type="button" className="btn btn--small btn--quiet" onClick={() => setShowKey((s) => !s)}>
            <Icon name="eye" size={17} /> {showKey ? 'Hide' : 'Show'}
          </button>
        </div>
      </section>

      <section className="settings__card">
        <h2>
          <Icon name="shield" /> Moderators
        </h2>
        {member.is_moderator ? (
          <>
            <p className="muted">You are a moderator. Notes that get reported, or that use a sensitive word, wait for you in the queue.</p>
            <div>
              <a className="btn btn--ink btn--small" href={href.moderate}>
                Open the moderation queue
              </a>
            </div>
          </>
        ) : (
          <form className="settings__inline" onSubmit={unlock}>
            <p className="muted">Helping to look after the garden? Enter the moderator code you were given.</p>
            <div className="settings__row">
              <label className="sr-only" htmlFor="mod-code">
                Moderator code
              </label>
              <input
                id="mod-code"
                className="input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Moderator code"
                autoComplete="off"
              />
              <button className="btn btn--small" disabled={!code.trim()}>
                Unlock
              </button>
            </div>
            {codeError && (
              <p className="form-error" role="alert">
                {codeError}
              </p>
            )}
          </form>
        )}
      </section>

      <section className="settings__card settings__card--quiet">
        <h2>
          <Icon name="door" /> Leaving
        </h2>
        <div className="settings__row">
          <button type="button" className="btn btn--small" onClick={() => setConfirm('forget')}>
            Forget me on this device
          </button>
          <button type="button" className="btn btn--small btn--danger" onClick={() => setConfirm('leave')}>
            Leave the garden
          </button>
        </div>
        <p className="muted settings__fine">
          "Forget me" signs you out here; your notes stay and you can come back with your key. "Leave the garden" removes your notes and
          hearts and erases your name, for good.
        </p>
      </section>

      {confirm === 'forget' && (
        <ConfirmSheet
          title="Forget you on this device?"
          body={`Make sure you copied your garden key first, or you won't be able to come back as ${member.first_name}. Your notes stay in the garden.`}
          confirmLabel="Forget me here"
          danger={false}
          onConfirm={() => {
            forget()
            setConfirm(null)
            go(href.home)
          }}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm === 'leave' && (
        <ConfirmSheet
          title="Leave the garden for good?"
          body={`Your ${plural(member.notes, 'note')} and your hearts will be removed and your name erased. This cannot be undone.`}
          confirmLabel="Yes, leave the garden"
          onConfirm={leave}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
