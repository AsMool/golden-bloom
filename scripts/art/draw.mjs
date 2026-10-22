// Draws the Golden Bloom artwork into src/assets/art and public/.
//   npm run art          SVG files
//   npm run art -- --png also the PNG icons and the social preview (needs Playwright's Chromium)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { flowers } from './flowers.mjs'
import { appIcon, heroArt, logoMark } from './logo.mjs'
import { svg } from './shapes.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const art = join(root, 'src', 'assets', 'art')
const pub = join(root, 'public')
mkdirSync(art, { recursive: true })

const write = (file, content) => {
  writeFileSync(file, content + '\n')
  console.log('wrote', file.replace(root + '/', ''))
}

for (const [name, draw] of Object.entries(flowers)) {
  write(join(art, `${name.replaceAll('_', '-')}.svg`), svg([0, 0, 120, 120], draw()))
}

const mark = logoMark()
write(join(art, 'logo-mark.svg'), svg(mark.vb, mark.body))

const hero = heroArt()
write(join(art, 'hero.svg'), svg(hero.vb, hero.body))

const icon = appIcon()
write(join(pub, 'favicon.svg'), svg(icon.vb, icon.body))

if (process.argv.includes('--png')) {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
  const page = await browser.newPage()
  const square = appIcon({ id: 'sq', rounded: false })
  for (const [file, size] of [
    ['apple-touch-icon.png', 180],
    ['icon-192.png', 192],
    ['icon-512.png', 512],
  ]) {
    await page.setViewportSize({ width: size, height: size })
    await page.setContent(`<style>html,body{margin:0}</style>${svg(square.vb, square.body, { width: size })}`)
    await page.screenshot({ path: join(pub, file) })
    console.log('wrote', `public/${file}`)
  }

  // Fonts go in as data URLs: a page opened with setContent cannot read file:// URLs.
  const fontDir = join(root, 'src', 'assets', 'fonts')
  const fontCss = readFileSync(join(fontDir, 'fonts.css'), 'utf8').replace(
    /url\('\.\/([^']+)'\)/g,
    (_, file) => `url('data:font/woff2;base64,${readFileSync(join(fontDir, file)).toString('base64')}')`,
  )
  await page.setViewportSize({ width: 1200, height: 630 })
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}
    html,body{margin:0;width:1200px;height:630px;overflow:hidden}
    body{background:radial-gradient(120% 90% at 85% 10%,#FFF1C2 0%,#FFF8E1 45%,#FFFCF3 100%);font-family:Onest,sans-serif;color:#3B2C1E;position:relative}
    .art{position:absolute;right:34px;top:96px;width:640px}
    .text{position:absolute;left:84px;top:96px;width:520px}
    h1{font-family:Fraunces,serif;font-weight:620;font-size:104px;line-height:.95;letter-spacing:-2px;margin:0}
    h1 em{font-style:italic;color:#B57D1A;font-weight:560}
    p{font-size:32px;line-height:1.3;margin:28px 0 0;color:#5C4A36}
    .note{position:absolute;left:84px;bottom:64px;background:#FFFAEB;border-radius:18px;padding:18px 24px;box-shadow:0 10px 30px -12px rgba(120,80,20,.35);transform:rotate(-2deg);font-family:'Shantell Sans',sans-serif;font-size:26px;max-width:470px}
    .note span{display:block;font-family:Onest;font-size:18px;color:#8C6A3F;margin-top:6px}
  </style></head><body>
    <div class="art">${svg(hero.vb, hero.body)}</div>
    <div class="text"><h1>Golden<br><em>Bloom</em></h1><p>A little garden of kind words.</p></div>
    <div class="note">You're beautiful in ways a mirror could never show.<span>Lyana</span></div>
  </body></html>`)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: join(pub, 'og-image.png') })
  console.log('wrote public/og-image.png')
  await browser.close()
}
