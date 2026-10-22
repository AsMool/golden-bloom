// Shared bits for the browser tests.
//   BASE_URL       the site to test (default: the local dev server)
//   CHROMIUM_PATH  a Chromium binary to use instead of Playwright's own download
import { chromium } from 'playwright'

export const BASE = (process.env.BASE_URL ?? 'http://127.0.0.1:5173').replace(/\/$/, '')

export const launch = () => chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })

// Opens a page and collects every script error, so a test can check that nothing broke.
// Not counted: failed realtime connections (live updates are optional), and the 400 answers
// the garden gives on purpose, for example when a note has an unkind word.
const expected = /websocket|realtime|status of 400/i

export async function open(browser, path = '/', { width = 1280, height = 900 } = {}) {
  const context = await browser.newContext({ viewport: { width, height } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (err) => errors.push(err.message))
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !expected.test(msg.text())) errors.push(msg.text())
  })
  await page.goto(BASE + path)
  return { page, context, errors }
}

export const notesOn = (page) => page.locator('article.note')

// Moves to another page of the site (the site routes with the part after #).
export async function visit(page, hash) {
  const url = new URL(page.url())
  url.hash = hash
  await page.goto(url.href)
}
