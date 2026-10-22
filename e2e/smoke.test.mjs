// Read-only checks: safe to run against the live site.
//   BASE_URL=https://… node --test e2e/smoke.test.mjs
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { BASE, launch, notesOn, open, visit } from './browser.mjs'

let browser
before(async () => {
  browser = await launch()
})
after(() => browser?.close())

test('the home page shows the garden and the most loved notes', async () => {
  const { page, errors } = await open(browser, '/')
  await page.getByRole('heading', { level: 1, name: /Leave a kind word/ }).waitFor()
  assert.match(await page.title(), /Golden Bloom/)
  assert.equal(await page.locator('.bed').count(), 7, 'six corners plus Most Loved')
  await notesOn(page).first().waitFor({ timeout: 15_000 })
  assert.ok((await notesOn(page).count()) >= 1)
  assert.deepEqual(errors, [])
})

test('shared links get a preview picture', async () => {
  const { page } = await open(browser, '/')
  const image = await page.locator('meta[property="og:image"]').getAttribute('content')
  assert.match(image, /^https:\/\/[^/]+\/og-image\.png$/, 'an absolute address')
  const res = await page.request.get(`${BASE}/og-image.png`)
  assert.equal(res.status(), 200)
  assert.equal(res.headers()['content-type'], 'image/png')
})

test('the envelope opens on a kind note', async () => {
  const { page, errors } = await open(browser, '/')
  await page.getByRole('button', { name: 'Open the envelope to read a kind note' }).click()
  await page.getByRole('button', { name: /Another one/ }).waitFor({ timeout: 15_000 })
  assert.deepEqual(errors, [])
})

test('each corner of the garden has its own page', async () => {
  const { page, errors } = await open(browser, '/#/garden/confidence-boost')
  await page.getByRole('heading', { level: 1, name: 'Confidence Boost' }).waitFor()
  await page.locator('article.note, .empty').first().waitFor({ timeout: 15_000 })
  await visit(page, '#/garden/from-me-to-you')
  await page.getByRole('heading', { level: 1, name: 'From Me To You' }).waitFor()
  assert.deepEqual(errors, [])
})

test('Most Loved ranks the notes', async () => {
  const { page, errors } = await open(browser, '/#/most-loved')
  await page.getByRole('heading', { level: 1, name: 'Most Loved Messages' }).waitFor()
  await page.locator('.note__rank').first().waitFor({ timeout: 15_000 })
  // notes are dealt into columns like cards (1st in column 1, 2nd in column 2…), so read them back in that order
  const counts = await page.evaluate(() => {
    const cols = [...document.querySelectorAll('.note-columns__col')].map((col) =>
      [...col.querySelectorAll('.heart__count')].map((el) => Number(el.textContent)),
    )
    const out = []
    for (let row = 0; cols.some((c) => c[row] !== undefined); row++) for (const c of cols) if (c[row] !== undefined) out.push(c[row])
    return out
  })
  assert.ok(counts.length > 0)
  assert.deepEqual(counts, [...counts].sort((a, b) => b - a), 'most hearts first')
  assert.deepEqual(errors, [])
})

test('writing a note asks visitors to join first', async () => {
  const { page, errors } = await open(browser, '/')
  await page.locator('.site-header').getByRole('button', { name: /Write a note/ }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('heading', { name: 'Come on in' }).waitFor()
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden' })
  assert.deepEqual(errors, [])
})

test('phones get the bottom tab bar', async () => {
  const { page, errors } = await open(browser, '/', { width: 390, height: 844 })
  await page.getByRole('navigation', { name: 'Main' }).getByText('Loved').waitFor()
  assert.equal(await page.locator('.site-nav').isVisible(), false)
  assert.deepEqual(errors, [])
})

test('the help lines are on the About page', async () => {
  const { page, errors } = await open(browser, '/#/about/help')
  await page.getByText('3114').waitFor()
  assert.deepEqual(errors, [])
})
