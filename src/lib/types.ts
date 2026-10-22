export type CategoryId =
  | 'confidence_boost'
  | 'bad_day_comfort'
  | 'body_love_letters'
  | 'you_are_not_alone'
  | 'mirror_talk'
  | 'from_me_to_you'

export type Paper = 'butter' | 'cream' | 'blush' | 'sage' | 'sky'

export type Gender = 'girl' | 'boy' | 'non_binary' | 'prefer_not_to_say'

export type ReportReason = 'mean' | 'body_shaming' | 'personal_info' | 'spam' | 'other'

export type Sort = 'new' | 'loved' | 'week'

export interface Note {
  id: string
  category: CategoryId
  body: string
  recipient: string | null
  author: string | null
  paper: Paper
  hearts: number
  shares: number
  created_at: string
  is_seed: boolean
  liked: boolean
  mine: boolean
  // Only filled in for the author (and moderators).
  status: 'visible' | 'hidden' | 'removed' | null
}

export interface QueuedNote extends Note {
  reports: number
  needs_review: boolean
  reasons: Partial<Record<ReportReason, number>>
}

export interface Member {
  id: string
  first_name: string
  age: number
  gender: Gender
  is_moderator: boolean
  joined_at: string
  notes: number
  hearts_received: number
  hearts_given: number
}

export interface Stats {
  notes: number
  hearts: number
  members: number
  by_category: Partial<Record<CategoryId, number>>
}
