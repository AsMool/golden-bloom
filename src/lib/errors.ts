import { GardenError } from './api'

const messages: Record<string, string> = {
  network: "We couldn't reach the garden. Check your connection and try again.",
  not_a_member: "You've been logged out. Log in again to keep going.",
  invalid_name: 'Your first name should be letters only, up to 24 of them.',
  invalid_last_name: 'Your last name should be letters only, up to 24 of them.',
  name_taken:
    'Someone already joined with that name. If it is you, log in instead. If not, add a letter or a second name to your last name (like "Martin B").',
  weak_password: 'Pick a password of at least 6 characters, and not your name or something very common like 123456.',
  wrong_login: "That name and password don't match. Check the spelling of both.",
  wrong_password: "That isn't your current password.",
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
