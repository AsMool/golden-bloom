import { useState, type FormEvent } from 'react'
import logoMark from '../assets/art/logo-mark.svg'
import { api } from '../lib/api'
import { friendlyError } from '../lib/errors'
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

const clean = (s: string) => s.trim().replace(/\s+/g, ' ')

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete: 'new-password' | 'current-password'
  hint?: string
}) {
  const [shown, setShown] = useState(false)
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <span className="password">
        <input
          className="input"
          type={shown ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          maxLength={50}
          spellCheck={false}
        />
        <button type="button" className="icon-btn" onClick={() => setShown((s) => !s)} aria-label={shown ? 'Hide password' : 'Show password'}>
          <Icon name="eye" size={19} />
        </button>
      </span>
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  )
}

export default function JoinSheet({ reason, onClose, onJoined }: { reason?: string; onClose: () => void; onJoined: (key: string) => void }) {
  const { signIn } = useSession()
  const { toast } = useUi()
  const [mode, setMode] = useState<'join' | 'login'>('join')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Gender | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const switchTo = (next: 'join' | 'login') => {
    setMode(next)
    setError(null)
    setPassword('')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const firstName = clean(first)
    const lastName = clean(last)
    const years = Number(age)
    if (!firstName) return setError('What should we call you? Add your first name.')
    if (!lastName) return setError(mode === 'join' ? 'Add your last name too, so two people with the same first name stay apart.' : 'Add your last name.')
    if (mode === 'join') {
      if (!Number.isInteger(years) || years < 10 || years > 99) return setError('Your age should be a number between 10 and 99.')
      if (!gender) return setError('Pick one of the options (you can always choose "rather not say").')
      if (password.length < 6) return setError('Your password needs at least 6 characters.')
    } else if (!password) {
      return setError('Type your password.')
    }
    setBusy(true)
    setError(null)
    try {
      if (mode === 'join') {
        const res = await api.join({ firstName, lastName, age: years, gender: gender!, password })
        signIn(res.key, res.member)
        toast(`Welcome to the garden, ${res.member.first_name}!`, 'success')
        onJoined(res.key)
      } else {
        const res = await api.logIn(firstName, lastName, password)
        signIn(res.key, res.member)
        toast(`Welcome back, ${res.member.first_name}!`, 'success')
        onJoined(res.key)
      }
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet onClose={onClose} labelledBy="join-title">
      <div className="join">
        <img className="join__mark" src={logoMark} alt="" width="72" height="62" />
        <h2 id="join-title" className="join__title">
          {mode === 'login' ? 'Welcome back' : 'Come on in'}
        </h2>
        {reason && mode === 'join' && <p className="join__reason">{reason}</p>}

        <form className="join__form" onSubmit={submit} noValidate>
          {mode === 'join' ? (
            <p className="madlib">
              <span>Hi! My name is</span>
              <label className="blank blank--name">
                <span className="sr-only">First name</span>
                <input
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                  placeholder="first name"
                  autoComplete="given-name"
                  maxLength={24}
                  autoFocus
                />
              </label>
              <label className="blank blank--name">
                <span className="sr-only">Last name</span>
                <input value={last} onChange={(e) => setLast(e.target.value)} placeholder="last name" autoComplete="family-name" maxLength={24} />
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
          ) : (
            <div className="join__names">
              <label className="field">
                <span className="field__label">First name</span>
                <input
                  className="input"
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                  autoComplete="given-name"
                  maxLength={24}
                  autoFocus
                />
              </label>
              <label className="field">
                <span className="field__label">Last name</span>
                <input className="input" value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" maxLength={24} />
              </label>
            </div>
          )}

          {mode === 'join' && (
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
          )}

          <PasswordField
            label={mode === 'join' ? 'Choose a password' : 'Password'}
            value={password}
            onChange={setPassword}
            autoComplete={mode === 'join' ? 'new-password' : 'current-password'}
            hint={mode === 'join' ? 'At least 6 characters. Something you will remember, and nobody can guess.' : undefined}
          />

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn--primary btn--big join__go" disabled={busy}>
            {mode === 'join' ? (busy ? 'Opening the gate…' : 'Step into the garden') : busy ? 'Checking…' : 'Open my garden'}
            <Icon name={mode === 'join' ? 'arrowRight' : 'key'} />
          </button>

          {mode === 'join' ? (
            <>
              <p className="join__small">
                That's all we ask: no email. Notes you sign show your first name and the first letter of your last name, like "Sarah M.".
                Your age and gender stay private.
              </p>
              <button type="button" className="link-btn" onClick={() => switchTo('login')}>
                Already in the garden? Log in
              </button>
            </>
          ) : (
            <>
              <p className="join__small">Forgot your password? Ask a garden moderator: they can give you a temporary one.</p>
              <button type="button" className="link-btn" onClick={() => switchTo('join')}>
                I'm new here
              </button>
            </>
          )}
        </form>
      </div>
    </Sheet>
  )
}
