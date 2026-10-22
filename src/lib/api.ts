import { createClient } from '@supabase/supabase-js'
import { SUPABASE_KEY, SUPABASE_URL } from './config'
import type { CategoryId, Gender, Member, Note, Paper, QueuedNote, ReportReason, Sort, Stats } from './types'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

// The database answers with a short code (unkind_words, slow_down...) when it says no.
export class GardenError extends Error {
  code: string
  constructor(code: string) {
    super(code)
    this.code = code
  }
}

async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  let result
  try {
    result = await supabase.rpc(fn, args)
  } catch {
    throw new GardenError('network')
  }
  const { data, error } = result
  if (error) throw new GardenError(error.code === 'P0001' ? error.message : 'network')
  return data as T
}

export const api = {
  join: (firstName: string, age: number, gender: Gender) =>
    call<{ key: string; member: Member }>('join_garden', { p_first_name: firstName, p_age: age, p_gender: gender }),
  me: (key: string) => call<Member>('me', { p_key: key }),
  updateMe: (key: string, firstName: string, age: number, gender: Gender) =>
    call<Member>('update_me', { p_key: key, p_first_name: firstName, p_age: age, p_gender: gender }),
  leave: (key: string) => call<boolean>('leave_garden', { p_key: key }),

  listNotes: (o: { key: string | null; category?: CategoryId | null; sort?: Sort; limit?: number; offset?: number }) =>
    call<Note[]>('list_notes', {
      p_key: o.key,
      p_category: o.category ?? null,
      p_sort: o.sort ?? 'new',
      p_limit: o.limit ?? 24,
      p_offset: o.offset ?? 0,
    }),
  getNote: (id: string, key: string | null) => call<Note | null>('get_note', { p_note_id: id, p_key: key }),
  randomNote: (key: string | null, exclude: string | null) =>
    call<Note | null>('random_note', { p_key: key, p_category: null, p_exclude: exclude }),
  stats: () => call<Stats>('garden_stats'),
  myNotes: (key: string) => call<Note[]>('my_notes', { p_key: key }),
  lovedNotes: (key: string) => call<Note[]>('loved_notes', { p_key: key }),

  postNote: (o: { key: string; category: CategoryId; body: string; recipient: string | null; paper: Paper; confirm: boolean }) =>
    call<Note>('post_note', {
      p_key: o.key,
      p_category: o.category,
      p_body: o.body,
      p_recipient: o.recipient,
      p_paper: o.paper,
      p_confirm: o.confirm,
    }),
  toggleLike: (key: string, id: string) => call<{ liked: boolean; hearts: number }>('toggle_like', { p_key: key, p_note_id: id }),
  recordShare: (id: string, key: string | null) => call<{ shares: number }>('record_share', { p_note_id: id, p_key: key }),
  report: (key: string, id: string, reason: ReportReason) =>
    call<{ reported: boolean; hidden: boolean }>('report_note', { p_key: key, p_note_id: id, p_reason: reason }),
  deleteNote: (key: string, id: string) => call<boolean>('delete_note', { p_key: key, p_note_id: id }),

  claimModerator: (key: string, code: string) =>
    call<{ ok: boolean; error?: string; member?: Member }>('claim_moderator', { p_key: key, p_code: code }),
  moderationQueue: (key: string) => call<QueuedNote[]>('moderation_queue', { p_key: key }),
  moderate: (key: string, id: string, action: 'keep' | 'remove') =>
    call<boolean>('moderate_note', { p_key: key, p_note_id: id, p_action: action }),
}
