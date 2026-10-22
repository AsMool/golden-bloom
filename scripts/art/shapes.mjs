// Drawing helpers for the Golden Bloom artwork. Everything is plain SVG strings.

export const PHI = (1 + Math.sqrt(5)) / 2
// Growth rate of a golden spiral: the radius grows by PHI every quarter turn.
export const B = Math.log(PHI) / (Math.PI / 2)
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

export const ink = {
  gold: '#C8941F',
  goldDeep: '#A8741A',
  goldLine: '#D7A443',
  petal: '#FFFDF6',
  sun: '#F7C948',
  sunDeep: '#E2A72C',
  honey: '#F0A42B',
  brown: '#7A4E24',
  brownDeep: '#5A3818',
  leaf: '#B4C69A',
  leafDeep: '#7F956A',
  blush: '#F6C3B9',
  blushDeep: '#C9705F',
  sky: '#A9CBEA',
  skyDeep: '#5B83A8',
  lilac: '#E6DAF2',
  lilacDeep: '#9A84B8',
  cream: '#FFF9EA',
  line: '#8C6A3F',
}

export const f = (n) => (Math.abs(n) < 1e-9 ? '0' : Number(n.toFixed(2)).toString())

export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const smoothstep = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

export function svg(viewBox, body, { width, height, title } = {}) {
  const size = width ? ` width="${width}" height="${height ?? width}"` : ''
  const label = title ? ` role="img" aria-label="${title}"` : ' aria-hidden="true"'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.map(f).join(' ')}"${size}${label}>${body}</svg>`
}

export const g = (attrs, ...children) => `<g ${attrs}>${children.join('')}</g>`

// A filled ribbon around a centre line: points [{x, y, nx, ny, w}] where (nx, ny) is the unit normal.
// Ends get round caps.
export function ribbon(points, { capStart = true, capEnd = true } = {}) {
  const left = points.map((p) => [p.x + (p.nx * p.w) / 2, p.y + (p.ny * p.w) / 2])
  const right = points.map((p) => [p.x - (p.nx * p.w) / 2, p.y - (p.ny * p.w) / 2])
  // Half circle around point p, from side (sx, sy) through direction (dx, dy) to the opposite side.
  const cap = (p, sx, sy, dx, dy) => {
    const out = []
    for (let i = 1; i < 12; i++) {
      const a = (Math.PI * i) / 12
      out.push([p.x + (p.w / 2) * (Math.cos(a) * sx + Math.sin(a) * dx), p.y + (p.w / 2) * (Math.cos(a) * sy + Math.sin(a) * dy)])
    }
    return out
  }
  const unit = (a, b) => {
    const dx = a.x - b.x
    const dy = a.y - b.y
    const l = Math.hypot(dx, dy) || 1
    return [dx / l, dy / l]
  }
  const n = points.length
  const [ex, ey] = unit(points[n - 1], points[n - 2])
  const [bx, by] = unit(points[0], points[1])
  const last = points[n - 1]
  const first = points[0]
  const pts = [
    ...left,
    ...(capEnd ? cap(last, last.nx, last.ny, ex, ey) : []),
    ...right.reverse(),
    ...(capStart ? cap(first, -first.nx, -first.ny, bx, by) : []),
  ]
  return 'M' + pts.map(([x, y]) => `${f(x)},${f(y)}`).join('L') + 'Z'
}

// The golden spiral used in the logo: a true logarithmic spiral, clockwise on screen.
export function goldenSpiral({ rot = Math.PI / 2, turns = 1.45, rIn = 5.6, w0 = 1.2, w1 = 11, tail = 0.45, n = 320 } = {}) {
  const th0 = Math.log(rIn) / B
  const th1 = th0 + 2 * Math.PI * turns
  const pts = []
  for (let i = 0; i <= n; i++) {
    const k = i / n
    const t = th0 + (th1 - th0) * k
    const r = Math.exp(B * t)
    const ang = t + rot
    const ux = Math.cos(ang)
    const uy = -Math.sin(ang)
    let w = w0 + (w1 - w0) * k ** 1.35
    w *= 1 - (1 - tail) * smoothstep(0.8, 1, k)
    pts.push({ x: r * ux, y: r * uy, nx: ux, ny: uy, w, t })
  }
  return { pts, th0, th1, rot }
}

export function spiralPoint(t, rot) {
  const r = Math.exp(B * t)
  return { x: r * Math.cos(t + rot), y: -r * Math.sin(t + rot), r }
}

export function spiralTangentDeg(t, rot) {
  const a = t + rot
  const dx = B * Math.cos(a) - Math.sin(a)
  const dy = -(B * Math.sin(a) + Math.cos(a))
  return (Math.atan2(dy, dx) * 180) / Math.PI
}

// Classic golden-rectangle construction: squares cut from a 1 : PHI rectangle and a quarter
// circle in each one. Returns the squares and a centre line running from the outside in.
export function goldenRectangle(x, y, w, h, minSize = 1) {
  const squares = []
  const cuts = []
  const line = []
  let rect = { x, y, w, h }
  const order = ['left', 'top', 'right', 'bottom']
  for (let i = 0; i < 40; i++) {
    const side = order[i % 4]
    let sq, c, a0, a1
    if (side === 'left') {
      const s = rect.h
      sq = { x: rect.x, y: rect.y, s }
      c = [rect.x + s, rect.y + s]
      a0 = Math.PI
      a1 = Math.PI * 1.5
      cuts.push([rect.x + s, rect.y, rect.x + s, rect.y + rect.h])
      rect = { x: rect.x + s, y: rect.y, w: rect.w - s, h: rect.h }
    } else if (side === 'top') {
      const s = rect.w
      sq = { x: rect.x, y: rect.y, s }
      c = [rect.x, rect.y + s]
      a0 = Math.PI * 1.5
      a1 = Math.PI * 2
      cuts.push([rect.x, rect.y + s, rect.x + rect.w, rect.y + s])
      rect = { x: rect.x, y: rect.y + s, w: rect.w, h: rect.h - s }
    } else if (side === 'right') {
      const s = rect.h
      sq = { x: rect.x + rect.w - s, y: rect.y, s }
      c = [rect.x + rect.w - s, rect.y]
      a0 = 0
      a1 = Math.PI * 0.5
      cuts.push([rect.x + rect.w - s, rect.y, rect.x + rect.w - s, rect.y + rect.h])
      rect = { x: rect.x, y: rect.y, w: rect.w - s, h: rect.h }
    } else {
      const s = rect.w
      sq = { x: rect.x, y: rect.y + rect.h - s, s }
      c = [rect.x + s, rect.y + rect.h - s]
      a0 = Math.PI * 0.5
      a1 = Math.PI
      cuts.push([rect.x, rect.y + rect.h - s, rect.x + rect.w, rect.y + rect.h - s])
      rect = { x: rect.x, y: rect.y, w: rect.w, h: rect.h - s }
    }
    squares.push(sq)
    // screen coordinates: angle measured with y pointing down
    const steps = 48
    for (let j = i === 0 ? 0 : 1; j <= steps; j++) {
      const a = a0 + ((a1 - a0) * j) / steps
      line.push({ x: c[0] + sq.s * Math.cos(a), y: c[1] + sq.s * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a), r: sq.s })
    }
    if (sq.s < minSize) break
  }
  return { squares, cuts, line, eye: { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 } }
}

// A rounded petal pointing up from (0, 0), length L and half width W.
export function petalPath(L, W) {
  return (
    `M0,0C${f(-W * 0.5)},${f(-L * 0.16)} ${f(-W * 1.1)},${f(-L * 0.6)} ${f(-W * 0.66)},${f(-L * 0.9)}` +
    `C${f(-W * 0.36)},${f(-L * 1.06)} ${f(W * 0.36)},${f(-L * 1.06)} ${f(W * 0.66)},${f(-L * 0.9)}` +
    `C${f(W * 1.1)},${f(-L * 0.6)} ${f(W * 0.5)},${f(-L * 0.16)} 0,0Z`
  )
}

// A pointed petal (sunflower, chamomile), base at (0, 0), tip at (0, -L).
export function lancePath(L, W) {
  return `M0,0C${f(W)},${f(-L * 0.28)} ${f(W * 0.62)},${f(-L * 0.8)} 0,${f(-L)}C${f(-W * 0.62)},${f(-L * 0.8)} ${f(-W)},${f(-L * 0.28)} 0,0Z`
}

export function leafPath(L, W) {
  return `M0,0C${f(W)},${f(-L * 0.22)} ${f(W * 0.85)},${f(-L * 0.72)} 0,${f(-L)}C${f(-W * 0.85)},${f(-L * 0.72)} ${f(-W)},${f(-L * 0.22)} 0,0Z`
}

export function leaf(x, y, L, W, rot, { fill = ink.leaf, rib = ink.leafDeep, sw = 0.7 } = {}) {
  return (
    `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})">` +
    `<path d="${leafPath(L, W)}" fill="${fill}" stroke="${rib}" stroke-width="${f(sw)}" stroke-linejoin="round"/>` +
    `<path d="M0,${f(-L * 0.06)}Q${f(W * 0.15)},${f(-L * 0.5)} 0,${f(-L * 0.86)}" stroke="${rib}" stroke-width="${f(sw * 0.85)}" fill="none" stroke-linecap="round"/></g>`
  )
}

// The Golden Bloom flower: five soft petals, warm centre, seeds placed on the golden angle.
export function blossom(cx, cy, s, { rot = -14, detail = true, id = 'b', stroke = ink.goldLine, sw = 0.7 } = {}) {
  const tweak = [
    [0, 1.0, 0.6],
    [73, 0.97, 0.6],
    [146, 1.03, 0.62],
    [216, 1.0, 0.6],
    [288, 0.96, 0.58],
  ]
  let o = `<defs><radialGradient id="${id}" cx="0" cy="0" r="${f(s)}" gradientUnits="userSpaceOnUse">`
  o += `<stop offset="0" stop-color="#FFE29A"/><stop offset=".45" stop-color="#FFF5D8"/><stop offset="1" stop-color="#FFFEFA"/></radialGradient></defs>`
  o += `<g transform="translate(${f(cx)} ${f(cy)})">`
  o += `<g fill="url(#${id})" stroke="${stroke}" stroke-width="${f(sw)}" stroke-linejoin="round">`
  for (const [a, lf, wf] of tweak) o += `<path d="${petalPath(s * lf, s * wf)}" transform="rotate(${f(rot + a)})"/>`
  o += '</g>'
  if (detail) {
    o += `<g stroke="#C48A2C" stroke-width="${f(sw * 0.7)}" stroke-linecap="round" fill="none" opacity=".7">`
    for (const [a] of tweak) {
      for (const [off, ln] of [
        [-11, 0.34],
        [0, 0.46],
        [11, 0.34],
      ]) {
        const ang = ((rot + a + off - 90) * Math.PI) / 180
        o += `<path d="M${f(Math.cos(ang) * s * 0.2)},${f(Math.sin(ang) * s * 0.2)}L${f(Math.cos(ang) * s * ln)},${f(Math.sin(ang) * s * ln)}"/>`
      }
    }
    o += '</g>'
  }
  o += `<circle r="${f(s * 0.19)}" fill="${ink.honey}"/>`
  if (detail) {
    for (let i = 0; i < 9; i++) {
      const a = i * GOLDEN_ANGLE
      const rr = s * 0.052 * Math.sqrt(i + 0.6)
      o += `<circle cx="${f(Math.cos(a) * rr)}" cy="${f(Math.sin(a) * rr)}" r="${f(s * 0.022)}" fill="#B86E12"/>`
    }
  }
  return o + '</g>'
}

// Baby's breath: a thin branching stem with tiny round flowers.
export function sprig(x, y, angle, size, seed, { color = '#C9B58C', bloom = '#FFFDF5', depth = 4 } = {}) {
  const rand = rng(seed)
  const stems = []
  const buds = []
  const grow = (px, py, a, len, d) => {
    const bend = (rand() - 0.5) * 0.6
    const ex = px + Math.cos(a) * len
    const ey = py + Math.sin(a) * len
    const mx = px + Math.cos(a + bend) * len * 0.55
    const my = py + Math.sin(a + bend) * len * 0.55
    stems.push(`M${f(px)},${f(py)}Q${f(mx)},${f(my)} ${f(ex)},${f(ey)}`)
    if (d === 0) {
      const r = size * (0.024 + rand() * 0.012)
      buds.push([ex, ey, r])
      if (rand() < 0.55) buds.push([ex + (rand() - 0.5) * r * 3, ey - r * (1.2 + rand()), r * 0.75])
      return
    }
    const kids = d === depth ? 2 : 2 + (rand() < 0.4 ? 1 : 0)
    for (let i = 0; i < kids; i++) {
      const spread = (i / (kids - 1) - 0.5) * (1.1 + rand() * 0.4) + (rand() - 0.5) * 0.25
      grow(ex, ey, a + spread, len * (0.6 + rand() * 0.14), d - 1)
    }
  }
  grow(x, y, (angle * Math.PI) / 180, size * 0.36, depth)
  let o = `<g fill="none" stroke="${color}" stroke-width="${f(Math.max(0.45, size * 0.011))}" stroke-linecap="round"><path d="${stems.join('')}"/></g>`
  o += `<g fill="${bloom}" stroke="${color}" stroke-width="${f(Math.max(0.35, size * 0.009))}">`
  for (const [bx, by, r] of buds) o += `<circle cx="${f(bx)}" cy="${f(by)}" r="${f(r)}"/>`
  return o + '</g>'
}
