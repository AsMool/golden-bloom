import badDay from '../assets/art/bad-day-comfort.svg'
import bodyLove from '../assets/art/body-love-letters.svg'
import confidence from '../assets/art/confidence-boost.svg'
import fromMe from '../assets/art/from-me-to-you.svg'
import mirror from '../assets/art/mirror-talk.svg'
import mostLoved from '../assets/art/most-loved.svg'
import notAlone from '../assets/art/you-are-not-alone.svg'
import type { CategoryId, Paper } from './types'

export interface Category {
  id: CategoryId
  slug: string
  name: string
  blurb: string
  flower: string
  meaning: string
  art: string
  tint: string
  deep: string
  paper: Paper
  prompts: string[]
  anonymous?: boolean
}

export const CATEGORIES: Category[] = [
  {
    id: 'confidence_boost',
    slug: 'confidence-boost',
    name: 'Confidence Boost',
    blurb: 'Little reminders of how great you are.',
    flower: 'Sunflower',
    meaning: 'Sunflowers stand tall and turn to face the light. Their seeds are laid out on the golden angle.',
    art: confidence,
    tint: '#FFEDAD',
    deep: '#8A5A12',
    paper: 'butter',
    prompts: ['Something you are secretly amazing at is…', 'The way you … is honestly so cool.', 'Never forget that you…'],
  },
  {
    id: 'bad_day_comfort',
    slug: 'bad-day-comfort',
    name: 'Bad Day Comfort',
    blurb: 'Soft words for heavy days. Like a warm cup of tea.',
    flower: 'Chamomile',
    meaning: 'In the old language of flowers, chamomile means "energy in adversity". It is also very good in tea.',
    art: badDay,
    tint: '#E4EDD6',
    deep: '#4F6A3A',
    paper: 'sage',
    prompts: ["It's okay if today was…", 'Tomorrow is a fresh page, and…', 'You do not have to be perfect to…'],
  },
  {
    id: 'body_love_letters',
    slug: 'body-love-letters',
    name: 'Body Love Letters',
    blurb: 'Love notes to the body that carries you everywhere.',
    flower: 'Pink rose',
    meaning: 'Pink roses mean gratitude and grace. Look closely: the heart of a rose curls like a golden spiral.',
    art: bodyLove,
    tint: '#FBDFD7',
    deep: '#9C4636',
    paper: 'blush',
    prompts: ['Dear legs, thank you for…', 'Your smile does this thing where…', 'Every body is a good body because…'],
  },
  {
    id: 'you_are_not_alone',
    slug: 'you-are-not-alone',
    name: 'You Are Not Alone',
    blurb: "Whatever you're going through, someone here gets it.",
    flower: 'Forget-me-not',
    meaning: 'Forget-me-nots never grow on their own. They always come in little crowds.',
    art: notAlone,
    tint: '#DDEAF7',
    deep: '#3D6489',
    paper: 'sky',
    prompts: ["I've felt that way too, and…", "You're not the only one who…", 'Something that helped me was…'],
  },
  {
    id: 'mirror_talk',
    slug: 'mirror-talk',
    name: 'Mirror Talk',
    blurb: 'The kind things you would say to the person in the mirror.',
    flower: 'Daisy',
    meaning: 'Daisy comes from "day\'s eye": it opens every morning to look at the sun, the way we should look at ourselves.',
    art: mirror,
    tint: '#ECE4F6',
    deep: '#68508C',
    paper: 'cream',
    prompts: ['Hey you in the mirror,…', 'Today I like my…', 'I am proud of myself for…'],
  },
  {
    id: 'from_me_to_you',
    slug: 'from-me-to-you',
    name: 'From Me To You',
    blurb: 'A note for someone special. Always anonymous.',
    flower: 'Yellow tulip',
    meaning: 'A yellow tulip says "there\'s sunshine in your smile". You can send one without signing it.',
    art: fromMe,
    tint: '#FFEBCF',
    deep: '#8A5414',
    paper: 'butter',
    prompts: ['You probably don\'t know this, but…', 'The day you … made my week.', 'I hope you know that…'],
    anonymous: true,
  },
]

export const MOST_LOVED = {
  slug: 'most-loved',
  name: 'Most Loved',
  blurb: 'The notes the whole garden keeps coming back to.',
  flower: 'Golden bloom',
  meaning: 'Our own flower, growing out of the golden spiral. It crowns the notes with the most hearts and shares.',
  art: mostLoved,
  tint: '#FFF0BC',
  deep: '#8A5A12',
}

export const categoryById = (id: CategoryId) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0]
export const categoryBySlug = (slug: string) => CATEGORIES.find((c) => c.slug === slug)

export const PAPERS: { id: Paper; name: string }[] = [
  { id: 'butter', name: 'Butter' },
  { id: 'cream', name: 'Cream' },
  { id: 'blush', name: 'Blush' },
  { id: 'sage', name: 'Sage' },
  { id: 'sky', name: 'Sky' },
]
