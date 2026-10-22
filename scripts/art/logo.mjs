import {
  blossom,
  f,
  goldenRectangle,
  goldenSpiral,
  ink,
  leaf,
  ribbon,
  smoothstep,
  spiralPoint,
  spiralTangentDeg,
  sprig,
} from './shapes.mjs'

const goldGradient = (id) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">` +
  `<stop offset="0" stop-color="#C08A1F"/><stop offset=".55" stop-color="#DBA838"/><stop offset="1" stop-color="#B57D1A"/></linearGradient>`

function bounds(points, pad) {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  return [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad]
}

// The logo: a golden spiral that grows from a flower, with two small leaves.
export function logoMark({ id = 'gb', leaves = true, detail = true, w0 = 1.2, w1 = 11, flower = 10.5, pad = 6 } = {}) {
  const s = goldenSpiral({ w0, w1 })
  const [x0, y0, x1, y1] = bounds(s.pts, w1 * 0.6)
  let body = `<defs>${goldGradient(`${id}-gold`)}</defs>`
  body += `<path d="${ribbon(s.pts, { capStart: false })}" fill="url(#${id}-gold)"/>`
  if (leaves) {
    for (const [frac, side, L, W] of [
      [0.84, 1, 12.5, 4.3],
      [0.72, -1, 9.5, 3.4],
    ]) {
      const t = s.th0 + (s.th1 - s.th0) * frac
      const p = spiralPoint(t, s.rot)
      body += leaf(p.x, p.y, L, W, spiralTangentDeg(t, s.rot) + 90 + side * 52, { sw: 0.75 })
    }
  }
  body += blossom(0, 0, flower, { id: `${id}-petal`, detail })
  const vb = [x0 - pad, y0 - pad - (leaves ? 4 : 0), x1 - x0 + 2 * pad, y1 - y0 + 2 * pad + (leaves ? 4 : 0)]
  return { vb, body }
}

// Square app icon: butter background, chunkier spiral, no leaves.
export function appIcon({ id = 'gbi', size = 64, rounded = true } = {}) {
  const s = goldenSpiral({ w0: 3, w1: 19, tail: 0.55, turns: 1.3 })
  const [x0, y0, x1, y1] = bounds(s.pts, 8)
  const span = Math.max(x1 - x0, y1 - y0)
  const pad = span * 0.1
  const scale = size / (span + 2 * pad)
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  let body = `<defs>${goldGradient(`${id}-gold`)}</defs>`
  body += rounded
    ? `<rect width="${size}" height="${size}" rx="${f(size * 0.24)}" fill="#FFF1C2"/>`
    : `<rect width="${size}" height="${size}" fill="#FFF1C2"/>`
  body += `<g transform="translate(${f(size / 2)} ${f(size / 2)}) scale(${f(scale)}) translate(${f(-cx)} ${f(-cy)})">`
  body += `<path d="${ribbon(s.pts, { capStart: false })}" fill="url(#${id}-gold)"/>`
  body += blossom(0, 0, 16, { id: `${id}-petal`, detail: false, sw: 1.6, stroke: '#D49A2E' })
  body += '</g>'
  return { vb: [0, 0, size, size], body }
}

// The big homepage drawing: the golden rectangle, its spiral, a flower in the eye
// and baby's breath in the corners, like the picture the class started from.
export function heroArt({ id = 'hero', H = 400 } = {}) {
  const W = H * 1.6180339887
  const gr = goldenRectangle(0, 0, W, H, 2.2)
  const total = gr.line.length
  const pts = gr.line.map((p, i) => {
    const k = i / (total - 1)
    let w = 1.6 + 8.4 * (1 - k) ** 1.6
    w *= 0.35 + 0.65 * smoothstep(0, 0.035, k)
    return { ...p, w }
  })
  const centre = 'M' + gr.line.map((p) => `${f(p.x)},${f(p.y)}`).join('L')
  let body = `<defs>${goldGradient(`${id}-gold`)}<mask id="${id}-reveal" maskUnits="userSpaceOnUse" x="-20" y="-20" width="${f(W + 40)}" height="${f(H + 40)}">`
  body += `<path class="gb-reveal" d="${centre}" pathLength="1" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round"/></mask></defs>`
  body += `<g class="gb-grid" stroke="${ink.goldLine}" stroke-width="1" opacity=".42" fill="none">`
  for (const [ax, ay, bx, by] of gr.cuts) body += `<path d="M${f(ax)},${f(ay)}L${f(bx)},${f(by)}"/>`
  body += '</g>'
  body += `<g class="gb-sprigs">`
  // bottom left, rising along the start of the spiral
  body += sprig(24, H + 2, -82, 120, 7)
  body += sprig(10, H + 2, -64, 86, 11)
  body += sprig(42, H + 2, -100, 72, 3)
  body += leaf(28, H + 1, 24, 6, 14)
  // bottom right, a fuller bunch
  body += sprig(W - 58, H + 2, -100, 150, 21)
  body += sprig(W - 36, H + 2, -120, 124, 5)
  body += sprig(W - 82, H + 2, -80, 104, 13)
  body += sprig(W - 22, H + 2, -142, 90, 17)
  body += leaf(W - 62, H + 1, 28, 7, -18)
  body += leaf(W - 48, H + 1, 24, 6, 24)
  body += '</g>'
  body += `<g mask="url(#${id}-reveal)"><path class="gb-spiral" d="${ribbon(pts)}" fill="url(#${id}-gold)"/></g>`
  body += `<g class="gb-flower" style="transform-origin:${f(gr.eye.x)}px ${f(gr.eye.y)}px">${blossom(gr.eye.x, gr.eye.y, H * 0.062, { id: `${id}-petal`, sw: 1 })}</g>`
  return { vb: [-6, -6, W + 12, H + 12], body, eye: gr.eye, W, H }
}
