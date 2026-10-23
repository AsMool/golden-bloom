// The whole journey: join, write, give hearts, report, moderate, take a note back.
// It creates members and notes, so it only runs against a test database:
//   E2E_WRITE=1 MOD_CODE=local-test-code node --test e2e/flows.test.mjs
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { launch, notesOn, open, visit } from './browser.mjs'

const run = process.env.E2E_WRITE === '1'
const stamp = Date.now().toString(36).slice(-4)
const letters = (n) => n.replace(/[0-9]/g, (d) => 'abcdefghij'[d])
const lastName = (who) => `${who}${letters(stamp)}`
const PASSWORD = 'sunny-day-77'
const words = `Your laugh fills the whole corridor with sunshine ${stamp}`

let browser, mel, sam

async function join(page, name, last, gender, age = '15') {
  await page.locator('.site-header').getByRole('button', { name: 'Join', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('First name').fill(name)
  await dialog.getByLabel('Last name').fill(last)
  await dialog.getByLabel('Age').fill(age)
  await dialog.getByRole('radio', { name: gender }).click()
  await dialog.getByLabel('Choose a password').fill(PASSWORD)
  await dialog.getByRole('button', { name: /Step into the garden/ }).click()
  await page.getByText(`Welcome to the garden, ${name}!`).waitFor()
  await page.getByRole('link', { name: `Your garden, ${name}` }).waitFor()
}

async function compose(page, corner, text) {
  await page.locator('.site-header').getByRole('button', { name: /Write a note/ }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('radio', { name: corner }).click()
  await dialog.getByLabel('Your note').fill(text)
  await dialog.getByRole('button', { name: /Plant this note/ }).click()
  return dialog
}

before(async () => {
  if (!run) return
  browser = await launch()
  mel = await open(browser, '/')
  sam = await open(browser, '/', { width: 390, height: 844 })
})
after(() => browser?.close())

test('a new member joins with a name, an age, a gender and a password', { skip: !run }, async () => {
  await join(mel.page, 'Mel', lastName('Tester'), 'a girl')
})

test('the idea button starts the note and leaves the cursor in the gap', { skip: !run }, async () => {
  const { page } = mel
  await page.locator('.site-header').getByRole('button', { name: /Write a note/ }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('radio', { name: 'Confidence Boost' }).click()
  const body = dialog.getByLabel('Your note')
  await body.fill('')
  await dialog.getByRole('button', { name: 'Give me an idea' }).click()
  await dialog.getByRole('button', { name: 'Another idea' }).click()
  await page.keyboard.type('smile')
  assert.equal(await body.inputValue(), 'The way you smile is honestly so cool.')
  await body.fill('')
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden' })
})

test('a member plants a note and lands on its corner', { skip: !run }, async () => {
  const { page } = mel
  await compose(page, 'Mirror Talk', words)
  await page.getByText('Your note is planted in Mirror Talk!').waitFor()
  await page.waitForURL(/#\/garden\/mirror-talk$/)
  const note = notesOn(page).filter({ hasText: words })
  await note.waitFor()
  assert.match(await note.locator('.note__by').textContent(), /Mel T\./)
})

test('unkind words are stopped before they reach the garden', { skip: !run }, async () => {
  const { page } = mel
  const dialog = await compose(page, 'Confidence Boost', `hey fatso ${stamp}`)
  await dialog.getByRole('alert').filter({ hasText: 'could really hurt someone' }).waitFor()
  await page.keyboard.press('Escape')
})

test('a word that is often unkind asks for a quick check first', { skip: !run }, async () => {
  const { page } = mel
  const dialog = await compose(page, 'Body Love Letters', `You are not ugly at all, you glow ${stamp}`)
  await dialog.getByText('Quick check:').waitFor()
  await dialog.getByRole('button', { name: "It's kind, plant it" }).click()
  await page.getByText('Your note is planted in Body Love Letters!').waitFor()
})

test('another member gives the note a heart and reports another', { skip: !run }, async () => {
  const { page } = sam
  await join(page, 'Sam', lastName('Sampson'), "I'd rather not say", '16')

  await visit(page, '#/garden/mirror-talk')
  const note = notesOn(page).filter({ hasText: words })
  const heart = note.getByRole('button', { name: /Give a heart/ })
  await heart.click()
  await note.getByRole('button', { name: /Take back your heart \(1 hearts?\)/ }).waitFor()

  await note.getByRole('button', { name: 'More options' }).click()
  await note.getByRole('menuitem', { name: 'Report this note' }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByRole('radio').first().click()
  await sheet.getByRole('button', { name: /Send/ }).click()
  await page.getByText(/Thank you/).waitFor()
})

test('a member logs in from another device with name and password', { skip: !run }, async () => {
  const fresh = await open(browser, '/')
  const { page } = fresh
  await page.locator('.site-header').getByRole('button', { name: 'Join', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: /Log in/ }).click()
  await dialog.getByLabel('First name').fill('mel')
  await dialog.getByLabel('Last name').fill(lastName('Tester'))
  await dialog.getByLabel('Password', { exact: true }).fill('wrong-password-1')
  await dialog.getByRole('button', { name: /Open my garden/ }).click()
  await dialog.getByRole('alert').waitFor()
  await dialog.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await dialog.getByRole('button', { name: /Open my garden/ }).click()
  await page.getByRole('link', { name: 'Your garden, Mel' }).waitFor()
  await fresh.context?.close()
})

test('the author sees the heart in their garden', { skip: !run }, async () => {
  const { page } = mel
  await page.getByRole('link', { name: 'Your garden, Mel' }).click()
  await page.getByRole('tab', { name: /My notes/ }).waitFor()
  const note = notesOn(page).filter({ hasText: words })
  await note.waitFor()
  assert.equal((await note.locator('.heart__count').textContent()).trim(), '1')
})

test('a moderator unlocks the queue and keeps a note', { skip: !run }, async () => {
  const { page } = mel
  await page.getByRole('tab', { name: 'Settings' }).click()
  await page.getByLabel('Moderator code').fill(process.env.MOD_CODE ?? 'local-test-code')
  await page.getByRole('button', { name: /Unlock/ }).click()
  await page.getByRole('link', { name: /moderation/i }).first().click()
  await page.waitForURL(/#\/moderate$/)
  const queued = notesOn(page).filter({ hasText: 'not ugly at all' })
  await queued.waitFor()
  await page.locator('.queue__item', { has: queued }).getByRole('button', { name: /Keep/ }).click()
  await queued.waitFor({ state: 'detached' })
})

test('an author takes a note back', { skip: !run }, async () => {
  const { page } = mel
  await visit(page, '#/garden/mirror-talk')
  const note = notesOn(page).filter({ hasText: words })
  await note.getByRole('button', { name: 'More options' }).click()
  await note.getByRole('menuitem', { name: 'Take this note back' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Take it back' }).click()
  await page.getByText('Your note was taken back.').waitFor()
  await note.waitFor({ state: 'detached' })
})

test('nothing broke along the way', { skip: !run }, () => {
  assert.deepEqual(mel.errors, [])
  assert.deepEqual(sam.errors, [])
})
