import { useState, type FormEvent } from 'react'
import logoMark from '../assets/art/logo-mark.svg'
import { api } from '../lib/api'
import { errorCode, friendlyError } from '../lib/errors'
import { useSession } from '../lib/session'
import type { Gender } from '../lib/types'
import { useUi } from '../lib/ui'
import { Icon } from './Icon'
import { Sheet } from './Sheet'
import './JoinSheet.css'

const GENDERS: { id: Gender; label: string }[] = [
  { id: 'girl', label: 'a girl' },
  { id: 'boy', label: 'a boy' },
  { id: 'non_binary', label: 'non-binary' },
  { id: 'prefer_not_to_say', label: "I'd rather not say" },
]

export default function JoinSheet({ reason, onClose, onJoined }: { reason?: string; onClose: () => void; onJoined: (key: string) => void }) {
  const { signIn } = useSession()
  const { toast } = useUi()
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Gender | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [savedKey, setSavedKey] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const first = name.trim().replace(/\s+/g, ' ')
    const years = Number(age)
    if (!first) return setError('What should we call you? Your first name is enough.')
    if (!Number.isInteger(years) || years < 10 || years > 99) return setError('Your age should be a number between 10 and 99.')
    if (!gender) return setError('Pick one of the options (you can always choose "rather not say").')
    setBusy(true)
    setError(null)
    try {
      const res = await api.join(first, years, gender)
      signIn(res.key, res.member)
      toast(`Welcome to the garden, ${res.member.first_name}!`, 'success')
      onJoined(res.key)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const restore = async (e: FormEvent) => {
    e.preventDefault()
    const key = savedKey.trim()
    if (!/^gb_[0-9a-f]{64}$/.test(key)) return setError('A garden key starts with gb_ followed by 64 letters and numbers.')
    setBusy(true)
    setError(null)
    try {
      const member = await api.me(key)
      signIn(key, member)
      toast(`Welcome back, ${member.first_name}!`, 'success')
      onJoined(key)
    } catch (err) {
      setError(errorCode(err) === 'not_a_member' ? "That key doesn't open any garden. Check that you copied all of it." : friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet onClose={onClose} labelledBy="join-title">
      <div className="join">
        <img className="join__mark" src={logoMark} alt="" width="72" height="62" />
        <h2 id="join-title" className="join__title">
          {restoring ? 'Welcome back' : 'Come on in'}
        </h2>
        {reason && !restoring && <p className="join__reason">{reason}</p>}

        {!restoring ? (
          <form className="join__form" onSubmit={submit} noValidate>
            <p className="madlib">
              <span>Hi! My name is</span>
              <label className="blank blank--name">
                <span className="sr-only">First name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="first name"
                  autoComplete="given-name"
                  maxLength={24}
                  autoFocus
                />
              </label>
              <span className="madlib__comma">, I'm</span>
              <label className="blank blank--age">
                <span className="sr-only">Age</span>
                <input
                  value={age}
                  onChange={(e) => setAge(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  placeholder="15"
                  inputMode="numeric"
                  autoComplete="off"
                />
              </label>
              <span>years old, and I am…</span>
            </p>
            <div className="chips" role="radiogroup" aria-label="Gender">
              {GENDERS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  role="radio"
                  aria-checked={gender === g.id}
                  className={`chip${gender === g.id ? ' chip--on' : ''}`}
                  onClick={() => setGender(g.id)}
                >
                  {g.label}
                </button>
              ))}
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="btn btn--primary btn--big join__go" disabled={busy}>
              {busy ? 'Opening the gate…' : 'Step into the garden'}
              <Icon name="arrowRight" />
            </button>
            <p className="join__small">
              That's all we ask. No email, no password: your garden key is saved on this device. Only your first name is ever shown, and
              only on notes you sign.
            </p>
            <button type="button" className="link-btn" onClick={() => (setRestoring(true), setError(null))}>
              Already joined on another device? Use your garden key
            </button>
          </form>
        ) : (
          <form className="join__form" onSubmit={restore} noValidate>
            <p className="join__small">
              Paste the garden key you copied from your profile on your other device. It starts with <code>gb_</code>.
            </p>
            <label className="field">
              <span className="field__label">Garden key</span>
              <input
                className="input input--mono"
                value={savedKey}
                onChange={(e) => setSavedKey(e.target.value)}
                placeholder="gb_…"
                autoComplete="off"
                spellCheck={false}
                autoFocus
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="btn btn--primary btn--big join__go" disabled={busy}>
              {busy ? 'Checking…' : 'Open my garden'}
              <Icon name="key" />
            </button>
            <button type="button" className="link-btn" onClick={() => (setRestoring(false), setError(null))}>
              I'm new here
            </button>
          </form>
        )}
      </div>
    </Sheet>
  )
}
