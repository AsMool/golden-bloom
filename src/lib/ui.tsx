import { createContext, lazy, Suspense, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { Toasts, type Toast } from '../components/Toasts'
import { errorCode, friendlyError } from './errors'
import { useSession } from './session'
import type { CategoryId, Note } from './types'

const JoinSheet = lazy(() => import('../components/JoinSheet'))
const Composer = lazy(() => import('../components/Composer'))
const ReportSheet = lazy(() => import('../components/ReportSheet'))

interface UiValue {
  toast: (text: string, tone?: Toast['tone']) => void
  fail: (err: unknown) => void
  // Runs `then` with the member key, asking the visitor to join first if needed.
  withMember: (then: (key: string) => void, reason?: string) => void
  write: (category?: CategoryId) => void
  report: (note: Note) => void
}

const UiContext = createContext<UiValue | null>(null)

type Open =
  | { sheet: 'join'; reason?: string; then?: (key: string) => void }
  | { sheet: 'write'; category?: CategoryId }
  | { sheet: 'report'; note: Note }
  | null

export function UiProvider({ children }: { children: ReactNode }) {
  const { key, member, forget } = useSession()
  const [open, setOpen] = useState<Open>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const toast = useCallback((text: string, tone: Toast['tone'] = 'info') => {
    const id = nextId.current++
    setToasts((t) => [...t.slice(-2), { id, text, tone }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 5200 : 3200)
  }, [])

  const fail = useCallback(
    (err: unknown) => {
      if (errorCode(err) === 'not_a_member') {
        forget()
        setOpen({ sheet: 'join', reason: friendlyError(err) })
        return
      }
      toast(friendlyError(err), 'error')
    },
    [forget, toast],
  )

  const withMember = useCallback(
    (then: (key: string) => void, reason?: string) => {
      if (key && member) then(key)
      else setOpen({ sheet: 'join', reason, then })
    },
    [key, member],
  )

  const write = useCallback(
    (category?: CategoryId) => {
      withMember(() => setOpen({ sheet: 'write', category }), 'Join the garden to plant your first note.')
    },
    [withMember],
  )

  const report = useCallback(
    (note: Note) => withMember(() => setOpen({ sheet: 'report', note }), 'Join the garden so moderators know a real person sent this report.'),
    [withMember],
  )

  const close = useCallback(() => setOpen(null), [])
  const value = useMemo(() => ({ toast, fail, withMember, write, report }), [toast, fail, withMember, write, report])

  return (
    <UiContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        {open?.sheet === 'join' && (
          <JoinSheet
            reason={open.reason}
            onClose={close}
            onJoined={(newKey) => {
              const then = open.then
              setOpen(null)
              // let the join sheet close before opening the next one
              if (then) window.setTimeout(() => then(newKey), 60)
            }}
          />
        )}
        {open?.sheet === 'write' && <Composer initialCategory={open.category} onClose={close} />}
        {open?.sheet === 'report' && <ReportSheet note={open.note} onClose={close} />}
      </Suspense>
      <Toasts toasts={toasts} />
    </UiContext.Provider>
  )
}

export function useUi(): UiValue {
  const value = useContext(UiContext)
  if (!value) throw new Error('useUi outside UiProvider')
  return value
}
