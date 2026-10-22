// One flower for each corner of the garden. All drawn in a 120 x 120 box.
import { GOLDEN_ANGLE, B, blossom, f, ink, lancePath, leaf, petalPath } from './shapes.mjs'

const SW = 1.4
const stroke = (c, w = SW) => `stroke="${c}" stroke-width="${f(w)}" stroke-linejoin="round" stroke-linecap="round"`

export function heartPath(s) {
  return (
    `M0,${f(0.9 * s)}C${f(-0.15 * s)},${f(0.75 * s)} ${f(-s)},${f(0.3 * s)} ${f(-s)},${f(-0.2 * s)}` +
    `C${f(-s)},${f(-0.68 * s)} ${f(-0.42 * s)},${f(-0.92 * s)} 0,${f(-0.42 * s)}` +
    `C${f(0.42 * s)},${f(-0.92 * s)} ${f(s)},${f(-0.68 * s)} ${f(s)},${f(-0.2 * s)}` +
    `C${f(s)},${f(0.3 * s)} ${f(0.15 * s)},${f(0.75 * s)} 0,${f(0.9 * s)}Z`
  )
}

const heart = (x, y, s, rot, fill = '#F6B6A8', line = ink.blushDeep) =>
  `<path d="${heartPath(s)}" transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})" fill="${fill}" ${stroke(line, 1.1)}/>`

const stem = (d, w = 2.6) => `<path d="${d}" fill="none" ${stroke(ink.leafDeep, w)}/>`

const sparkle = (x, y, s, color = '#FFFFFF') =>
  `<path d="M${f(x)},${f(y - s)}Q${f(x + s * 0.18)},${f(y - s * 0.18)} ${f(x + s)},${f(y)}Q${f(x + s * 0.18)},${f(y + s * 0.18)} ${f(x)},${f(y + s)}Q${f(x - s * 0.18)},${f(y + s * 0.18)} ${f(x - s)},${f(y)}Q${f(x - s * 0.18)},${f(y - s * 0.18)} ${f(x)},${f(y - s)}Z" fill="${color}"/>`

// Confidence Boost: a sunflower, standing tall. Its seeds sit on the golden angle.
export function sunflower() {
  let o = stem('M60,116C61,100 58,86 60,70', 3.2)
  o += leaf(60, 104, 24, 8.5, -58)
  o += leaf(60, 94, 21, 7.5, 54)
  o += `<g transform="translate(60 46)">`
  o += `<g fill="#EDB12F" ${stroke(ink.goldDeep, 1.1)}>`
  for (let i = 0; i < 15; i++) o += `<path d="${lancePath(29, 6.6)}" transform="rotate(${f(i * 24 + 12)})"/>`
  o += `</g><g fill="#F9D45C" ${stroke(ink.gold, 1.1)}>`
  for (let i = 0; i < 15; i++) o += `<path d="${lancePath(27, 6.2)}" transform="rotate(${f(i * 24)})"/>`
  o += `</g><circle r="15.5" fill="#8A5A2B" ${stroke(ink.brownDeep, 1.2)}/>`
  for (let i = 1; i < 70; i++) {
    const a = i * GOLDEN_ANGLE
    const r = 1.72 * Math.sqrt(i)
    if (r > 14.2) break
    o += `<circle cx="${f(Math.cos(a) * r)}" cy="${f(Math.sin(a) * r)}" r=".78" fill="${i % 2 ? '#D49A55' : '#4A2C12'}"/>`
  }
  return o + '</g>'
}

function chamomileHead(x, y, s, squash = 0.55) {
  let o = `<g transform="translate(${f(x)} ${f(y)}) scale(1 ${f(squash)})">`
  o += `<g fill="#FFFFFF" ${stroke('#CDBB93', 0.8)}>`
  for (let i = 0; i < 13; i++) o += `<path d="${petalPath(s, s * 0.26)}" transform="rotate(${f(i * (360 / 13))})"/>`
  o += `</g><circle r="${f(s * 0.36)}" fill="#F5C23A" ${stroke(ink.sunDeep, 0.8)}/>`
  return o + '</g>'
}

// Bad Day Comfort: chamomile tea, the old flower for "energy in adversity".
export function chamomileTea() {
  let o = `<ellipse cx="60" cy="101" rx="42" ry="7.5" fill="#FFFDF6" ${stroke(ink.gold)}/>`
  o += `<ellipse cx="60" cy="100" rx="24" ry="3.6" fill="none" ${stroke('#E8D3A2', 1)}/>`
  o += `<path d="M90,66C107,62 109,86 87,88" fill="none" ${stroke(ink.gold, 4.6)}/>`
  o += `<path d="M90,66C107,62 109,86 87,88" fill="none" ${stroke('#FFFDF6', 1.8)}/>`
  o += `<path d="M27,60C27,86 40,99 60,99C80,99 93,86 93,60Z" fill="#FFFDF6" ${stroke(ink.gold)}/>`
  o += `<path d="M30.5,76C40,79.5 50,80.5 60,80.5C70,80.5 80,79.5 89.5,76C88,81 86,85 83.5,88C76,89.8 68,90.5 60,90.5C52,90.5 44,89.8 36.5,88C34,85 32,81 30.5,76Z" fill="#DCE6CC"/>`
  o += `<ellipse cx="60" cy="60" rx="33" ry="7" fill="#F3D58C" ${stroke(ink.gold)}/>`
  o += chamomileHead(50, 59.5, 8.5)
  o += chamomileHead(70.5, 61.5, 6.8)
  o += `<g fill="none" ${stroke(ink.goldLine, 2)} opacity=".75">`
  o += `<path d="M60,48C52,43 43,36 46,28C49,21 57,23 60,30" stroke-dasharray="11 4"/>`
  o += `<path d="M60,30C63,23 71,21 74,28C77,36 68,43 60,48" stroke-dasharray="11 4"/>`
  o += `</g>`
  return o
}

// Body Love Letters: a rose (its heart is a little golden spiral) on a love letter.
export function roseLetter() {
  let o = `<g transform="rotate(-7 66 72)">`
  o += `<rect x="34" y="50" width="70" height="48" rx="5" fill="#FFF9EA" ${stroke(ink.blushDeep, 1.3)}/>`
  o += `<path d="M36,53L69,77L102,53" fill="none" ${stroke(ink.blushDeep, 1.3)}/>`
  o += heart(69, 86, 4.4, 0)
  o += `</g>`
  o += stem('M52,62C55,80 56,96 62,114', 2.8)
  o += leaf(56, 92, 20, 7.5, 58)
  o += leaf(54, 80, 17, 6.5, -60)
  o += `<g transform="translate(48 42)">`
  o += `<g fill="#F6C3B9" ${stroke(ink.blushDeep, 1.2)}>`
  for (const [a, l, w] of [
    [0, 20, 13],
    [72, 19, 12.5],
    [144, 20.5, 13],
    [216, 19, 12],
    [288, 20, 13],
  ])
    o += `<path d="${petalPath(l, w)}" transform="rotate(${f(a + 20)})"/>`
  o += `</g><circle r="12" fill="#F9D3CB" ${stroke(ink.blushDeep, 1.2)}/>`
  const pts = []
  for (let i = 0; i <= 120; i++) {
    const t = -2.4 + (i / 120) * 9.2
    const r = 0.95 * Math.exp(B * t)
    if (r > 10.6) break
    pts.push(`${f(r * Math.cos(t))},${f(-r * Math.sin(t))}`)
  }
  o += `<path d="M${pts.join('L')}" fill="none" ${stroke(ink.blushDeep, 1.3)}/>`
  return o + '</g>'
}

function forgetMeNot(x, y, s) {
  let o = `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})">`
  o += `<g fill="#A9CBEA" ${stroke(ink.skyDeep, 1.1 / s)}>`
  for (let i = 0; i < 5; i++) {
    const a = (i * 72 - 90) * (Math.PI / 180)
    o += `<circle cx="${f(Math.cos(a) * 4.7)}" cy="${f(Math.sin(a) * 4.7)}" r="4.5"/>`
  }
  o += `</g><circle r="2.5" fill="#FFF6D8" ${stroke(ink.sunDeep, 0.9 / s)}/><circle r="1" fill="${ink.sunDeep}"/>`
  return o + '</g>'
}

// You Are Not Alone: forget-me-nots, which only ever grow in little crowds.
export function forgetMeNots() {
  const heads = [
    [60, 38, 1.25],
    [40, 50, 1.05],
    [80, 51, 1.05],
    [51, 67, 0.95],
    [71, 69, 0.95],
    [30, 71, 0.8],
    [90, 72, 0.8],
  ]
  let o = `<g fill="none" ${stroke(ink.leafDeep, 1.7)}>`
  for (const [x, y] of heads) o += `<path d="M${f(x)},${f(y + 4)}Q${f((x + 60) / 2)},${f(y + 34)} 60,114"/>`
  o += `</g>`
  o += leaf(60, 104, 20, 7, -62)
  o += leaf(60, 98, 18, 6.5, 60)
  o += `<circle cx="22" cy="58" r="3" fill="#F6C3B9" ${stroke(ink.blushDeep, 1)}/>`
  o += `<circle cx="98" cy="60" r="2.6" fill="#F6C3B9" ${stroke(ink.blushDeep, 1)}/>`
  o += `<circle cx="61" cy="20" r="2.6" fill="#F6C3B9" ${stroke(ink.blushDeep, 1)}/>`
  for (const [x, y, s] of heads) o += forgetMeNot(x, y, s)
  return o
}

function daisy(x, y, s, rot = 0) {
  let o = `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})">`
  o += `<g fill="#FFFFFF" ${stroke('#C9B58C', 0.9)}>`
  for (let i = 0; i < 16; i++) o += `<path d="${petalPath(s, s * 0.24)}" transform="rotate(${f(i * 22.5)})"/>`
  o += `</g><circle r="${f(s * 0.32)}" fill="#F5C23A" ${stroke(ink.sunDeep, 1)}/>`
  return o + '</g>'
}

// Mirror Talk: a daisy (the "day's eye") and a hand mirror.
export function daisyMirror() {
  let o = `<path d="M47,82L35,110" fill="none" ${stroke(ink.goldDeep, 9.5)}/>`
  o += `<path d="M47,82L35,110" fill="none" ${stroke('#DBA838', 6.5)}/>`
  o += `<ellipse cx="55" cy="47" rx="32" ry="36" fill="#DBA838" ${stroke(ink.goldDeep, 1.3)}/>`
  o += `<ellipse cx="55" cy="47" rx="26" ry="30" fill="${ink.lilac}" ${stroke(ink.goldDeep, 1.1)}/>`
  o += `<path d="M38,36C41,28 46,23 52,21" fill="none" ${stroke('#FFFFFF', 3)} opacity=".9"/>`
  o += `<path d="M37,45C37,43 37.5,41 38,40" fill="none" ${stroke('#FFFFFF', 3)} opacity=".9"/>`
  o += sparkle(67, 36, 5)
  o += sparkle(60, 58, 3.2)
  o += stem('M88,80C90,92 88,104 92,116', 2.4)
  o += leaf(89, 102, 17, 6, 62)
  o += daisy(86, 74, 14, 8)
  return o
}

// From Me To You: a yellow tulip ("there's sunshine in your smile") with a ribbon and a tag.
export function tulipGift() {
  let o = stem('M60,58C58,78 62,96 60,116', 3)
  o += leaf(59, 113, 30, 6.4, -34)
  o += leaf(61, 114, 25, 5.8, 36)
  o += `<path d="M48,54C43,42 50,28 60,19C70,28 77,42 72,54Z" fill="#EDB12F" ${stroke(ink.goldDeep, 1.2)}/>`
  o += `<path d="M60,60C47,60 40,50 42,30C50,33 57,41 61,52Z" fill="#F9D45C" ${stroke(ink.goldDeep, 1.2)}/>`
  o += `<path d="M60,60C73,60 80,50 78,30C70,33 63,41 59,52Z" fill="#F7CC4A" ${stroke(ink.goldDeep, 1.2)}/>`
  o += `<path d="M60,58C58,52 58.5,47 60.5,43" fill="none" ${stroke('#E2A72C', 1)} opacity=".8"/>`
  // ribbon
  const bow = '#F6C3B9'
  o += `<path d="M60,84L51,99M60,84L67,100" fill="none" ${stroke(ink.blushDeep, 3.6)}/>`
  o += `<path d="M60,84L51,99M60,84L67,100" fill="none" ${stroke(bow, 1.8)}/>`
  o += `<path d="M60,84C51,75 42,78 45,85C47.5,91 55,89 60,84Z" fill="${bow}" ${stroke(ink.blushDeep, 1.1)}/>`
  o += `<path d="M60,84C69,75 78,78 75,85C72.5,91 65,89 60,84Z" fill="${bow}" ${stroke(ink.blushDeep, 1.1)}/>`
  o += `<circle cx="60" cy="84" r="3" fill="${bow}" ${stroke(ink.blushDeep, 1.1)}/>`
  // tag
  o += `<path d="M61,86Q70,92 76,93" fill="none" ${stroke(ink.line, 0.9)}/>`
  o += `<g transform="translate(76 93) rotate(14)"><path d="M0,-6.5L6,-10H26V10H6L0,6.5Z" fill="#FFF9EA" ${stroke(ink.gold, 1.1)}/>`
  o += `<circle cx="4.2" cy="0" r="1.4" fill="none" ${stroke(ink.gold, 0.9)}/>`
  o += `<path d="${heartPath(4)}" transform="translate(16 0.5)" fill="#F6B6A8" ${stroke(ink.blushDeep, 0.9)}/></g>`
  return o
}

// Most Loved: our own golden bloom with hearts floating up.
export function lovedBloom() {
  let o = leaf(60, 66, 40, 12, -128)
  o += leaf(60, 66, 36, 11, 124)
  o += blossom(60, 60, 27, { id: 'loved-petal', sw: 1.2 })
  o += heart(26, 30, 8, -16)
  o += heart(94, 24, 9.5, 14)
  o += heart(104, 66, 6, 20)
  o += heart(15, 70, 5, -12)
  return o
}

export const flowers = {
  confidence_boost: sunflower,
  bad_day_comfort: chamomileTea,
  body_love_letters: roseLetter,
  you_are_not_alone: forgetMeNots,
  mirror_talk: daisyMirror,
  from_me_to_you: tulipGift,
  most_loved: lovedBloom,
}
