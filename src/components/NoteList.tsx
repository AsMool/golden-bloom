import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import { applyNoteEvent, useNoteEvents } from '../lib/notes'
import { useLiveNotes } from '../lib/live'
import { useSession } from '../lib/session'
import type { CategoryId, Note, Sort } from '../lib/types'
import { useUi } from '../lib/ui'
import { Icon } from './Icon'
import { NoteCard } from './NoteCard'
import './NoteList.css'

function useColumns() {
  const get = () => (window.innerWidth >= 960 ? 3 : window.innerWidth >= 600 ? 2 : 1)
  const [cols, setCols] = useState(get)
  useEffect(() => {
    const onResize = () => setCols(get())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return cols
}

// Notes laid out left to right in columns, so the order still reads like a list.
export function NoteColumns({ items, ranked = false }: { items: Note[]; ranked?: boolean }) {
  const cols = useColumns()
  const columns: { note: Note; index: number }[][] = Array.from({ length: cols }, () => [])
  items.forEach((note, index) => columns[index % cols].push({ note, index }))
  return (
    <div className="note-columns" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {columns.map((col, i) => (
        <div className="note-columns__col" key={i}>
          {col.map(({ note, index }) => (
            <NoteCard key={note.id} note={note} rank={ranked ? index : undefined} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function NoteSkeletons({ count = 6 }: { count?: number }) {
  const cols = useColumns()
  return (
    <div className="note-columns" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} aria-hidden="true">
      {Array.from({ length: cols }, (_, c) => (
        <div className="note-columns__col" key={c}>
          {Array.from({ length: Math.ceil(count / cols) }, (_, i) => (
            <div className="note-skeleton" key={i} style={{ height: 150 + ((i + c) % 3) * 40 }} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function NoteList({
  category = null,
  sort = 'new',
  pageSize = 18,
  max,
  ranked = false,
  empty,
}: {
  category?: CategoryId | null
  sort?: Sort
  pageSize?: number
  max?: number
  ranked?: boolean
  empty?: ReactNode
}) {
  const { key, ready } = useSession()
  const { fail } = useUi()
  const [items, setItems] = useState<Note[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [more, setMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [fresh, setFresh] = useState(0)
  const request = useRef(0)
  const limit = max ?? pageSize

  const load = useCallback(async () => {
    const id = ++request.current
    setState('loading')
    setFresh(0)
    try {
      const page = await api.listNotes({ key, category, sort, limit, offset: 0 })
      if (id !== request.current) return
      setItems(page)
      setMore(!max && page.length === limit)
      setState('ready')
    } catch {
      if (id === request.current) setState('error')
    }
  }, [key, category, sort, limit, max])

  useEffect(() => {
    if (ready) void load()
  }, [ready, load])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const page = await api.listNotes({ key, category, sort, limit: pageSize, offset: items.length })
      setItems((list) => [...list, ...page.filter((n) => !list.some((x) => x.id === n.id))])
      setMore(page.length === pageSize)
    } catch (err) {
      fail(err)
    } finally {
      setLoadingMore(false)
    }
  }

  const accept = useCallback((n: Note) => sort === 'new' && (!category || n.category === category), [sort, category])
  useNoteEvents(useCallback((e) => setItems((list) => applyNoteEvent(list, e, accept)), [accept]))

  // Someone else planted a note that belongs here: offer to show it.
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])
  useLiveNotes(
    useCallback(
      (note) => {
        if (accept({ category: note.category } as Note) && !itemsRef.current.some((n) => n.id === note.id)) setFresh((f) => f + 1)
      },
      [accept],
    ),
  )

  if (state === 'loading') return <NoteSkeletons count={Math.min(limit, 6)} />
  if (state === 'error')
    return (
      <div className="list-message">
        <p>The garden is having trouble loading. Check your connection and try again.</p>
        <button type="button" className="btn" onClick={() => void load()}>
          <Icon name="refresh" size={18} /> Try again
        </button>
      </div>
    )
  if (items.length === 0) return <>{empty}</>

  return (
    <div className="note-list">
      {fresh > 0 && (
        <button type="button" className="fresh-pill" onClick={() => void load()}>
          <Icon name="sparkle" size={16} /> {fresh === 1 ? 'A new note just bloomed' : `${fresh} new notes just bloomed`} · Show
        </button>
      )}
      <NoteColumns items={items} ranked={ranked} />
      {more && (
        <div className="note-list__more">
          <button type="button" className="btn" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Picking more…' : 'Show more notes'}
          </button>
        </div>
      )}
    </div>
  )
}
