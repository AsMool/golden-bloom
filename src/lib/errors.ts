import { GardenError } from './api'

const messages: Record<string, string> = {
  network: "We couldn't reach the garden. Check your connection and try again.",
  not_a_member: "This device's garden key doesn't work anymore. Join again to keep going.",
  invalid_name: 'Just your first name, please: letters only, up to 24 of them.',
  unkind_name: "Let's pick a kinder name than that.",
  invalid_age: 'Your age should be a number between 10 and 99.',
  invalid_gender: 'Pick one of the options (you can always choose "rather not say").',
  slow_down: "That's a lot at once! Take a little break and try again in a few minutes.",
  invalid_category: 'Pick a corner of the garden for your note.',
  too_short: 'Your note is a bit short. Add a few more words.',
  too_long: 'That is a little long: notes fit in 280 characters, and the "to" line in 40.',
  unkind_words: 'Some words in this note could really hurt someone. Could you say it in a gentler way?',
  personal_info: 'Please leave out links, emails, phone numbers and @usernames. It keeps everyone safe.',
  duplicate: 'You already planted this exact note today.',
  not_found: "This note isn't in the garden anymore.",
  not_allowed: "Sorry, you can't do that.",
  wrong_code: "That code isn't right. Check with whoever gave it to you.",
}

export function errorCode(err: unknown): string {
  return err instanceof GardenError ? err.code : 'network'
}

export function friendlyError(err: unknown): string {
  return messages[errorCode(err)] ?? 'Something went wrong. Please try again.'
}
