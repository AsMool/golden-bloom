import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api } from './api'
import { errorCode } from './errors'
import type { Member } from './types'

const STORAGE_KEY = 'golden-bloom.key'

// The member key is the only "password": it lives in this browser's storage.
function readKey(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeKey(key: string | null) {
  try {
    if (key) window.localStorage.setItem(STORAGE_KEY, key)
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Private browsing: the key only lasts as long as this tab.
  }
}

interface SessionValue {
  key: string | null
  member: Member | null
  ready: boolean
  signIn: (key: string, member: Member) => void
  setMember: (member: Member) => void
  refresh: () => Promise<void>
  forget: () => void
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [key, setKey] = useState<string | null>(readKey)
  const [member, setMember] = useState<Member | null>(null)
  const [ready, setReady] = useState(() => readKey() === null)

  const forget = useCallback(() => {
    writeKey(null)
    setKey(null)
    setMember(null)
  }, [])

  const refresh = useCallback(async () => {
    const saved = readKey() ?? key
    if (!saved) return
    try {
      setMember(await api.me(saved))
    } catch (err) {
      if (errorCode(err) === 'not_a_member') forget()
    } finally {
      setReady(true)
    }
  }, [key, forget])

  // check the saved key once, when the site opens
  const checked = useRef(false)
  useEffect(() => {
    if (checked.current) return
    checked.current = true
    if (key && !member) void refresh()
  }, [key, member, refresh])

  const signIn = useCallback((newKey: string, newMember: Member) => {
    writeKey(newKey)
    setKey(newKey)
    setMember(newMember)
    setReady(true)
  }, [])

  const value = useMemo(
    () => ({ key, member, ready, signIn, setMember, refresh, forget }),
    [key, member, ready, signIn, refresh, forget],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession outside SessionProvider')
  return value
}
