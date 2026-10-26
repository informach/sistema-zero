/** Super Pirate World: hazards, items, decorations, water, sky and the world map pieces. */
import type { BackgroundDrawing, Drawing, SpriteDrawing } from '../../drawing'
import { darken, lighten, mix, Px, random } from '../../pixel'
import { CLOTH, GOLD, INK, LEAF, PINK, RED, SEA, SILVER, STEEL, TRUNK, WOOD } from './palette'

const sprite = (
  name: string,
  w: number,
  h: number,
  animations: SpriteDrawing['animations'],
): SpriteDrawing => ({
  kind: 'sprite',
  name,
  frameWidth: w,
  frameHeight: h,
  animations,
})
const one = (name: string, frame: Px, fps = 6) => ({ name, fps, loop: true, frames: [frame] })

// ---- hazards ------------------------------------------------------------------------------

function saw(frame: number): Px {
  const p = new Px(38, 38)
  const c = 18.5
  const teeth = 12
  const points: [number, number][] = []
  for (let i = 0; i < teeth * 2; i++) {
    const angle = (i / (teeth * 2)) * Math.PI * 2 + (frame / 8) * ((Math.PI * 2) / teeth)
    const r = i % 2 === 0 ? 18 : 13.5
    points.push([c + Math.cos(angle) * r, c + Math.sin(angle) * r])
  }
  p.polygon(points, SILVER.base)
  p.circle(c, c, 12, SILVER.light)
  p.circle(c, c, 9, SILVER.base)
  // Light sweep on the disc, turning with the blade.
  for (let i = 0; i < 3; i++) {
    const angle = (frame / 8) * Math.PI * 0.5 + i * ((Math.PI * 2) / 3)
    p.line(
      c + Math.cos(angle) * 4,
      c + Math.sin(angle) * 4,
      c + Math.cos(angle) * 10,
      c + Math.sin(angle) * 10,
      SILVER.shine,
    )
  }
  p.circle(c, c, 4, STEEL.dark)
  p.circle(c, c, 2, SILVER.shine)
  p.rim(null, SILVER.dark)
  p.outline(INK)
  return p
}

function chainLink(size: number, light: string, dark: string): Px {
  const p = new Px(8, 8)
  p.circle((size - 1) / 2 + 0.5, (size - 1) / 2 + 0.5, size / 2, dark)
  p.circle((size - 1) / 2 + 0.5, (size - 1) / 2 + 0.5, size / 2 - 1, light)
  if (size >= 6) p.set(Math.floor(size / 2), Math.floor(size / 2), dark)
  return p
}

function spikeBall(): Px {
  const p = new Px(27, 27)
  const c = 13
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    p.polygon(
      [
        [c + Math.cos(angle - 0.35) * 8, c + Math.sin(angle - 0.35) * 8],
        [c + Math.cos(angle) * 13.4, c + Math.sin(angle) * 13.4],
        [c + Math.cos(angle + 0.35) * 8, c + Math.sin(angle + 0.35) * 8],
      ],
      SILVER.light,
    )
  }
  p.circle(c + 0.5, c + 0.5, 9, STEEL.base)
  p.circle(c - 1.5, c - 1.5, 5, STEEL.light)
  p.circle(c - 2.5, c - 2.5, 2, SILVER.shine)
  p.rim(null, STEEL.dark)
  p.outline(INK)
  return p
}

function floorSpikes(frame: number): Px {
  const p = new Px(32, 32)
  // Base plate.
  p.rect(0, 28, 32, 4, STEEL.dark)
  p.rect(0, 28, 32, 1, STEEL.base)
  for (let i = 0; i < 4; i++) {
    const x = i * 8
    p.polygon(
      [
        [x + 0.5, 28],
        [x + 4, 16],
        [x + 7.5, 28],
      ],
      SILVER.base,
    )
    p.line(x + 4, 17, x + 2, 27, SILVER.shine)
    p.line(x + 5, 19, x + 6, 27, SILVER.dark)
  }
  // A glint travels across the tips.
  const glint = frame * 8 + 4
  p.set(glint, 16, '#ffffff').set(glint - 1, 18, '#ffffff')
  p.outline(INK)
  return p
}

function flag(frame: number): Px {
  const p = new Px(34, 93)
  // Pole with a gold ball.
  p.rect(3, 4, 3, 89, WOOD.base)
  p.rect(3, 4, 1, 89, WOOD.light)
  p.rect(5, 4, 1, 89, WOOD.dark)
  p.circle(4.5, 3, 2.5, GOLD.base)
  p.set(4, 1, GOLD.shine)
  p.rect(1, 88, 7, 5, WOOD.dark)
  // Black flag with a skull, waving.
  const wave = (x: number) => Math.sin((x / 9) * Math.PI + (frame / 9) * Math.PI * 2) * 2
  for (let x = 6; x < 33; x++) {
    const top = Math.round(6 + wave(x) + (x - 6) * 0.05)
    const bottom = Math.round(26 + wave(x) - (x - 6) * 0.08)
    for (let y = top; y <= bottom; y++) p.set(x, y, '#2e2a40')
    p.set(x, top, '#47415f')
    if (wave(x + 1) - wave(x) > 0.35) for (let y = top + 1; y < bottom; y++) p.set(x, y, '#3a3552')
  }
  const sx = 16
  const sy = Math.round(11 + wave(sx + 3))
  p.ellipse(sx, sy, 8, 7, CLOTH.base)
  p.rect(sx + 2, sy + 6, 4, 2, CLOTH.base)
  p.rect(sx + 1, sy + 2, 2, 2, INK).rect(sx + 5, sy + 2, 2, 2, INK)
  p.set(sx + 4, sy + 4, INK)
  p.line(sx - 2, sy + 9, sx + 10, sy - 1, CLOTH.shade)
  p.line(sx - 2, sy - 1, sx + 10, sy + 9, CLOTH.shade)
  p.outline(INK)
  return p
}

// ---- palms --------------------------------------------------------------------------------

function crown(p: Px, cx: number, cy: number, sway: number, colors: typeof LEAF, spread = 1) {
  // Fronds: [direction (-1 left .. 1 right), length, rise, droop]; drawn back to front.
  const fronds: [number, number, number, number][] = [
    [-0.55, 0.62, 2, 13],
    [0.55, 0.62, 2, 13],
    [-1, 1, 5, 11],
    [1, 1, 5, 11],
    [-0.75, 0.8, 8, 6],
    [0.75, 0.8, 8, 6],
    [-0.3, 0.5, 9, 3],
    [0.3, 0.5, 9, 3],
  ]
  const L = 17 * spread
  for (const [dir, length, rise, droop] of fronds) {
    const lean = sway * 0.6
    const points: [number, number][] = []
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const x = cx + (dir * L * length + lean * t) * t
      const y = cy - rise * Math.sin(Math.PI * t * 0.8) + droop * t * t
      points.push([x, y])
    }
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, ay] = points[i]!
      const [bx, by] = points[i + 1]!
      const t = i / (points.length - 1)
      const width = Math.max(1, Math.round(4 * (1 - t) + 0.6))
      p.line(ax, ay + 1, bx, by + 1, colors.dark, width)
      p.line(ax, ay, bx, by, colors.base, width)
      p.line(ax, ay - Math.floor(width / 2), bx, by - Math.floor(width / 2), colors.light)
      // Leaflets hanging under the frond.
      if (i % 2 === 0 && t > 0.15)
        p.line(ax, ay + 1, ax + dir * 1.5, ay + 2 + width / 2 + t * 2, colors.dark)
    }
    const [tx, ty] = points[points.length - 1]!
    p.set(tx, ty, colors.shine)
  }
  p.circle(cx, cy + 1, 3, colors.deep)
  p.set(cx - 1, cy, colors.base)
}

function trunk(p: Px, points: [number, number][], colors = TRUNK) {
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i]!
    const [bx, by] = points[i + 1]!
    const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay))
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(ax + ((bx - ax) * s) / steps)
      const y = Math.round(ay + ((by - ay) * s) / steps)
      p.rect(x - 2, y, 4, 1, colors.base)
        .set(x - 2, y, colors.light)
        .set(x + 1, y, colors.dark)
      if ((y + i) % 4 === 0) p.rect(x - 2, y, 4, 1, colors.ring)
    }
  }
}

function palm(kind: string, frame: number): Px {
  const bg = kind.startsWith('fundo')
  const leaf = bg
    ? { deep: '#2d4a48', dark: '#3c6159', base: '#4f7d68', light: '#6f9c78', shine: '#8fb68a' }
    : LEAF
  const bark = bg ? { dark: '#5d4740', base: '#7f6050', light: '#9c7c62', ring: '#4d3a35' } : TRUNK
  const sway = [0, 1, 2, 1][frame]!
  const sizes: Record<string, [number, number]> = {
    pequena: [40, 52],
    grande: [39, 68],
    esquerda: [64, 53],
    direita: [64, 53],
    fundo: [64, 64],
    'fundo-esquerda': [52, 53],
    'fundo-direita': [52, 53],
  }
  const [w, h] = sizes[kind]!
  const p = new Px(64, 68)
  const art = new Px(w, h)
  let top: [number, number]
  if (kind === 'pequena' || kind === 'grande' || kind === 'fundo') {
    const cx = Math.floor(w / 2)
    top = [cx + sway - 1, 9]
    trunk(
      art,
      [
        [cx + 1, h - 1],
        [cx - 1, Math.round(h * 0.55)],
        [top[0], 10],
      ],
      bark,
    )
  } else {
    const left = kind.endsWith('esquerda')
    const baseX = left ? w - 4 : 3
    const tipX = left ? 14 : w - 15
    top = [tipX + sway - 1, 12]
    trunk(
      art,
      [
        [baseX, h - 1],
        [left ? w - 14 : 13, h - 14],
        [left ? 26 : w - 27, 26],
        [top[0], 13],
      ],
      bark,
    )
  }
  crown(art, top[0], top[1], sway, leaf, w >= 52 ? 1.25 : 1)
  art.outline(bg ? '#3a3040' : INK)
  // Coconuts on the playable palms.
  if (!bg)
    art
      .circle(top[0] + 1, top[1] + 4, 1.5, '#7a4a2a')
      .circle(top[0] - 2, top[1] + 4, 1.5, '#6b3f25')
  p.draw(art)
  return p
}

export function palmeiras(): SpriteDrawing {
  const kinds = [
    'pequena',
    'grande',
    'esquerda',
    'direita',
    'fundo',
    'fundo-esquerda',
    'fundo-direita',
  ]
  return sprite(
    'palmeiras',
    64,
    68,
    kinds.map((kind) => ({
      name: kind,
      fps: 6,
      loop: true,
      frames: [0, 1, 2, 3].map((frame) => palm(kind, frame)),
    })),
  )
}

// ---- level decorations ------------------------------------------------------------------

function barrel(w: number, h: number, lying: boolean, bg: boolean): Px {
  const wood = bg ? { dark: '#4f3a3c', base: '#6e5250', light: '#8a6a62', shine: '#a3806f' } : WOOD
  const hoop = bg ? '#5b5866' : STEEL.base
  const p = new Px(w, h)
  if (lying) {
    p.ellipse(0, 0, w, h, wood.base)
    for (let x = 2; x < w - 2; x += 4) p.rect(x, 1, 1, h - 2, wood.dark)
    p.rect(4, 0, 2, h, hoop).rect(w - 6, 0, 2, h, hoop)
    p.ellipse(w - 7, 2, 6, h - 4, wood.light)
    p.ellipse(w - 6, 4, 4, h - 8, wood.shine)
  } else {
    p.ellipse(0, 0, w, h, wood.base)
    p.rect(1, 2, w - 2, h - 4, wood.base)
    for (let x = 3; x < w - 2; x += 4) p.rect(x, 2, 1, h - 4, wood.dark)
    p.rect(1, 4, w - 2, 2, hoop).rect(1, h - 6, w - 2, 2, hoop)
    p.rect(3, 2, 2, h - 4, wood.light)
  }
  p.outline(INK)
  return p
}

function crate(w: number, h: number, bg: boolean): Px {
  const wood = bg ? { dark: '#4f3a3c', base: '#6e5250', light: '#8a6a62', shine: '#a3806f' } : WOOD
  const p = new Px(w, h, wood.base)
  p.frame(0, 0, w, h, INK)
  p.frame(1, 1, w - 2, h - 2, wood.dark)
  p.rect(2, 2, w - 4, 1, wood.shine)
  for (let y = 5; y < h - 2; y += 4) p.rect(2, y, w - 4, 1, wood.dark)
  p.line(2, h - 3, w - 3, 2, wood.light)
  p.line(3, h - 3, w - 3, 3, wood.dark)
  for (const [x, y] of [
    [2, 2],
    [w - 3, 2],
    [2, h - 3],
    [w - 3, h - 3],
  ] as const)
    p.set(x, y, STEEL.light)
  return p
}

function bottle(w: number, h: number, glass: string, lying: boolean): Px {
  const p = new Px(w, h)
  const dark = darken(glass, 0.35)
  const light = lighten(glass, 0.4)
  if (lying) {
    p.rect(0, 1, w - 4, h - 2, glass)
    p.rect(w - 4, 2, 3, h - 4, glass)
    p.rect(w - 1, 2, 1, h - 4, '#c8a070')
    p.rect(1, 2, w - 6, 1, light)
    p.rect(0, h - 2, w - 4, 1, dark)
  } else {
    p.rect(0, Math.floor(h * 0.4), w, h - Math.floor(h * 0.4), glass)
    p.rect(2, 2, w - 4, Math.floor(h * 0.4), glass)
    p.rect(2, 0, w - 4, 2, '#c8a070')
    p.rect(1, Math.floor(h * 0.45), 1, h - Math.floor(h * 0.45) - 1, light)
    p.rect(w - 1, Math.floor(h * 0.45), 1, h - Math.floor(h * 0.45), dark)
    p.rect(1, Math.floor(h * 0.65), w - 2, 3, '#efe2c4')
  }
  p.outline(INK)
  return cropTo(p, w, h)
}

/** Keep a drawing inside w×h after an outline (the outline may need one more pixel). */
function cropTo(p: Px, w: number, h: number) {
  const out = new Px(w, h)
  out.draw(p)
  return out
}

function curtain(torn: boolean): Px {
  const p = new Px(26, 89)
  p.rect(0, 0, 26, 4, GOLD.dark)
  p.rect(0, 0, 26, 1, GOLD.light)
  for (let x = 1; x < 25; x++) {
    const fold = Math.sin((x / 26) * Math.PI * 4)
    const end = torn ? 84 - ((x * 7) % 9) - (x > 14 ? 10 : 0) : 86 - Math.round(Math.abs(fold) * 4)
    for (let y = 4; y < end; y++)
      p.set(x, y, fold > 0.4 ? RED.light : fold < -0.4 ? RED.dark : RED.base)
  }
  // A tie-back rope.
  p.rect(1, 48, 24, 2, GOLD.base)
    .set(12, 50, GOLD.light)
    .set(12, 51, GOLD.base)
    .set(12, 52, GOLD.dark)
  p.outline(INK)
  return cropTo(p, 26, 89)
}

function door(): Px {
  const p = new Px(41, 49)
  p.ellipse(2, 0, 37, 30, '#5b4a6a')
  p.rect(2, 14, 37, 35, '#5b4a6a')
  p.ellipse(5, 3, 31, 26, WOOD.base)
  p.rect(5, 16, 31, 33, WOOD.base)
  for (let x = 9; x < 36; x += 6) p.rect(x, 4, 1, 45, WOOD.dark)
  p.rect(5, 20, 31, 2, STEEL.dark).rect(5, 36, 31, 2, STEEL.dark)
  p.circle(30, 29, 1.5, GOLD.base)
  p.rect(7, 6, 2, 40, WOOD.light)
  p.outline(INK)
  return cropTo(p, 41, 49)
}

export function decoracao(): SpriteDrawing {
  const place = (art: Px) => {
    const frame = new Px(41, 89)
    frame.draw(art)
    return frame
  }
  const items: [string, Px][] = [
    ['barril', cropTo(barrel(23, 25, false, false), 23, 25)],
    ['caixa', crate(25, 18, false)],
    ['barril-fundo', cropTo(barrel(21, 22, false, true), 21, 22)],
    ['barril-deitado', cropTo(barrel(21, 22, true, true), 21, 22)],
    ['caixa-fundo', crate(21, 16, true)],
    ['garrafa-verde', bottle(7, 17, '#4f9a4e', false)],
    ['garrafa-verde-deitada', bottle(15, 7, '#4f9a4e', true)],
    ['garrafa-azul', bottle(7, 14, '#4f86c9', false)],
    ['garrafa-azul-deitada', bottle(12, 7, '#4f86c9', true)],
    ['cortina', curtain(false)],
    ['cortina-rasgada', curtain(true)],
    ['porta', door()],
  ]
  return sprite(
    'decoracao',
    41,
    89,
    items.map(([name, art]) => one(name, place(art))),
  )
}

function candle(frame: number): Px {
  const p = new Px(10, 20)
  // Holder.
  p.rect(1, 17, 8, 3, GOLD.dark).rect(2, 17, 6, 1, GOLD.light)
  p.rect(3, 9, 4, 8, CLOTH.base).rect(5, 9, 2, 8, CLOTH.shade)
  p.set(3, 10, '#ffffff').set(6, 12, CLOTH.base)
  // Flame flicker.
  const lean = [0, 1, 0, -1, 0, 1][frame]!
  const tall = [6, 7, 5, 6, 7, 5][frame]!
  p.ellipse(3 + lean, 9 - tall, 4, tall, GOLD.base)
  p.ellipse(4 + lean, 9 - tall + 2, 2, tall - 2, GOLD.shine)
  p.set(5, 8, INK)
  p.outline(INK)
  return cropTo(p, 10, 20)
}

function candleLight(frame: number): Px {
  const p = new Px(32, 32)
  const r = [12, 13, 12.5, 11.5][frame]!
  // A soft glow made of sparse dots (pixel art has no half transparency).
  const rng = random(41 + frame)
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const d = Math.hypot(x - 15.5, y - 15.5)
      if (d > r) continue
      const t = d / r
      const keep = t < 0.35 ? 0.55 : t < 0.7 ? 0.28 : 0.1
      if (((x + y * 3 + frame) % 4 === 0 || rng.chance(keep * 0.4)) && rng.chance(keep * 1.6))
        p.set(x, y, t < 0.45 ? '#ffe9a8' : '#f7cf72')
    }
  return p
}

function windowFrame(frame: number): Px {
  const p = new Px(29, 31)
  const c = 14
  p.circle(c + 0.5, 15.5, 14, '#6f5040')
  p.circle(c + 0.5, 15.5, 12, GOLD.dark)
  p.circle(c + 0.5, 15.5, 10.5, '#7fb7e0')
  // Sky outside with a drifting cloud and a light sweep.
  const glass = new Px(29, 31)
  glass.circle(c + 0.5, 15.5, 10.5, '#7fb7e0')
  glass.rect(0, 18, 29, 13, '#5d8fc4')
  const cloud = ((frame * 2) % 36) - 8
  glass.ellipse(cloud, 9, 9, 4, '#e6f2ff')
  glass.ellipse(cloud + 4, 7, 6, 4, '#ffffff')
  const sweep = ((frame * 3) % 48) - 12
  for (let y = 0; y < 31; y++)
    for (let x = 0; x < 29; x++) if (Math.abs(x + y - sweep - 15) < 2) glass.set(x, y, '#cfe6fb')
  for (let y = 0; y < 31; y++)
    for (let x = 0; x < 29; x++)
      if (p.get(x, y) === '#7fb7e0') p.set(x, y, glass.get(x, y) ?? '#7fb7e0')
  // Cross bars and rivets.
  p.rect(c, 5, 2, 21, GOLD.base).rect(4, 15, 21, 2, GOLD.base)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    p.set(c + 0.5 + Math.cos(a) * 12.6, 15.5 + Math.sin(a) * 12.6, GOLD.shine)
  }
  p.outline(INK)
  return cropTo(p, 29, 31)
}

function chain(length: number, frame: number): Px {
  const p = new Px(8, 58)
  const sway = Math.sin((frame / 8) * Math.PI * 2)
  for (let y = 0, i = 0; y < length - 4; y += 4, i++) {
    const x = Math.round(3.5 + sway * (y / length) * 1.5)
    if (i % 2 === 0) p.rect(x - 1, y, 3, 5, STEEL.dark).rect(x, y + 1, 1, 3, STEEL.light)
    else p.rect(x - 2, y + 1, 5, 3, STEEL.dark).rect(x - 1, y + 2, 3, 1, STEEL.light)
  }
  const end = length - 5
  const ex = Math.round(3.5 + sway * 1.5)
  p.rect(ex - 2, end, 5, 4, STEEL.base).set(ex - 1, end + 1, SILVER.shine)
  p.outline(INK)
  return cropTo(p, 8, 58)
}

function propeller(frame: number): Px {
  const p = new Px(32, 10)
  p.rect(0, 5, 32, 4, WOOD.base)
  p.rect(0, 5, 32, 1, WOOD.shine)
  p.rect(0, 8, 32, 1, WOOD.dark)
  p.rect(14, 2, 4, 4, STEEL.dark)
  const blades = [
    [4, 28],
    [9, 23],
    [13, 19],
    [9, 23],
  ][frame]!
  p.rect(blades[0]!, 1, blades[1]! - blades[0]!, 2, SILVER.light)
  p.rect(15, 0, 2, 2, STEEL.base)
  p.outline(INK)
  return cropTo(p, 32, 10)
}

function boat(): Px {
  const p = new Px(78, 22)
  p.polygon(
    [
      [0, 6],
      [78, 6],
      [72, 21],
      [6, 21],
    ],
    WOOD.base,
  )
  p.rect(1, 6, 76, 3, WOOD.shine)
  for (let y = 11; y < 21; y += 4) p.line(4, y, 74, y, WOOD.dark)
  p.rect(10, 1, 4, 6, WOOD.dark).rect(64, 1, 4, 6, WOOD.dark)
  for (let x = 6; x < 74; x += 12) p.set(x, 13, STEEL.light)
  p.outline(INK)
  return cropTo(p, 78, 22)
}

// ---- items -----------------------------------------------------------------------------------

function coin(frame: number, metal: typeof GOLD): Px {
  const widths = [11, 9, 5, 9]
  const w = widths[frame]!
  const p = new Px(11, 11)
  const x0 = (11 - w) / 2
  p.ellipse(x0, 0, w, 11, metal.dark)
  if (w > 3) {
    p.ellipse(x0 + 1, 1, w - 2, 9, metal.base)
    p.ellipse(x0 + 1, 1, w - 3, 7, metal.light)
    if (w > 7) p.rect(5, 3, 1, 5, metal.dark).set(4, 3, metal.shine).set(3, 4, metal.shine)
    else p.rect(Math.floor(x0 + w / 2), 3, 1, 5, metal.dark)
  } else p.rect(x0 + 1, 1, 1, 9, metal.light)
  return p
}

function diamond(frame: number): Px {
  const p = new Px(13, 13)
  const w = [13, 9, 5, 9][frame]!
  const x0 = (13 - w) / 2
  p.polygon(
    [
      [x0, 4],
      [x0 + w * 0.25, 0],
      [x0 + w * 0.75, 0],
      [x0 + w, 4],
      [6.5, 13],
    ],
    '#3fa9d9',
  )
  p.polygon(
    [
      [x0 + 1, 4],
      [x0 + w * 0.3, 1],
      [6.5, 4],
      [6.5, 12],
    ],
    '#8fe0ff',
  )
  p.rect(Math.round(x0 + 1), 4, Math.max(1, Math.round(w - 2)), 1, '#c9f3ff')
  p.set(Math.round(x0 + w * 0.35), 2, '#ffffff')
  p.outline('#1d4f7a')
  return cropTo(p, 13, 13)
}

function potion(frame: number): Px {
  const p = new Px(9, 15)
  p.rect(3, 0, 3, 2, '#c8a070')
  p.rect(3, 2, 3, 3, '#cfe6f0')
  p.ellipse(0, 4, 9, 11, RED.base)
  p.rect(1, 6, 7, 4, RED.light)
  p.ellipse(0, 4, 9, 4, '#cfe6f0')
  p.set(2, 8, '#ffd0d0').set(2, 9, '#ffd0d0')
  // Bubbles rising.
  const y = 12 - (frame % 7)
  if (y > 5) p.set(5, y, PINK.shine)
  if ((frame + 3) % 7 < 5) p.set(3, 12 - ((frame + 3) % 7), PINK.shine)
  p.outline(INK)
  return cropTo(p, 9, 15)
}

function skull(frame: number): Px {
  const p = new Px(16, 25)
  const bob = Math.round(Math.sin((frame / 8) * Math.PI * 2) * 1.5) + 2
  p.ellipse(1, bob, 14, 12, CLOTH.base)
  p.rect(4, bob + 10, 8, 4, CLOTH.base)
  p.rect(1, bob + 4, 2, 4, CLOTH.shade)
    .rect(5, bob + 12, 1, 2, CLOTH.shade)
    .rect(9, bob + 12, 1, 2, CLOTH.shade)
  p.ellipse(3, bob + 5, 4, 4, INK).ellipse(9, bob + 5, 4, 4, INK)
  p.set(4, bob + 6, RED.light).set(10, bob + 6, RED.light)
  p.rect(7, bob + 9, 2, 1, INK)
  p.set(4, bob + 1, '#ffffff').set(5, bob + 1, '#ffffff')
  // Golden sparkle.
  const spark = frame % 4 === 0
  if (spark)
    p.set(13, bob - 1, GOLD.shine)
      .set(12, bob, GOLD.light)
      .set(14, bob, GOLD.light)
  p.outline(INK)
  return cropTo(p, 16, 25)
}

export function itens(): SpriteDrawing {
  const place = (art: Px) => {
    const frame = new Px(16, 25)
    frame.draw(art)
    return frame
  }
  return sprite('itens', 16, 25, [
    { name: 'ouro', fps: 6, loop: true, frames: [0, 1, 2, 3].map((f) => place(coin(f, GOLD))) },
    { name: 'prata', fps: 6, loop: true, frames: [0, 1, 2, 3].map((f) => place(coin(f, SILVER))) },
    { name: 'diamante', fps: 6, loop: true, frames: [0, 1, 2, 3].map((f) => place(diamond(f))) },
    {
      name: 'pocao',
      fps: 6,
      loop: true,
      frames: [0, 1, 2, 3, 4, 5, 6].map((f) => place(potion(f))),
    },
    {
      name: 'caveira',
      fps: 6,
      loop: true,
      frames: [0, 1, 2, 3, 4, 5, 6, 7].map((f) => place(skull(f))),
    },
  ])
}

function particle(frame: number): Px {
  const p = new Px(15, 15)
  const r = [3, 5.5, 7][frame]!
  if (frame < 2) p.circle(7, 7, r, '#fff6d8')
  if (frame === 1) p.circle(7, 7, r - 2, '#ffffff')
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + frame * 0.3
    const d = r + (frame === 2 ? 0 : 1)
    p.set(7 + Math.cos(a) * d, 7 + Math.sin(a) * d, frame === 2 ? '#e8dfc8' : GOLD.shine)
  }
  if (frame === 2)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.5
      p.set(7 + Math.cos(a) * 4, 7 + Math.sin(a) * 4, '#fff6d8')
    }
  return p
}

// ---- water, wallpaper, interface ---------------------------------------------------------

function waterTop(frame: number): Px {
  const p = new Px(32, 32)
  for (let x = 0; x < 32; x++) {
    const crest = Math.round(4 + Math.sin(((x + frame * 4) / 16) * Math.PI * 2) * 1.5)
    for (let y = crest; y < 32; y++)
      p.set(x, y, y < crest + 2 ? SEA.foam : y < crest + 4 ? SEA.light : SEA.base)
    if ((x + frame * 3) % 11 === 0) p.set(x, crest + 6, SEA.light)
  }
  for (let x = 0; x < 32; x++)
    for (let y = 14; y < 32; y++) if ((x * 3 + y * 7 + frame) % 23 === 0) p.set(x, y, SEA.light)
  return p
}

function waterBody(): Px {
  const p = new Px(32, 32, SEA.base)
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) if ((x * 3 + y * 7) % 23 === 0) p.set(x, y, SEA.light)
  for (let y = 0; y < 32; y += 8)
    for (let x = (y / 2) % 16; x < 32; x += 16) p.rect(x, y + 3, 5, 1, mix(SEA.base, SEA.deep, 0.5))
  return p
}

function wallpaper(base: string): Px {
  const p = new Px(32, 32, base)
  const dark = darken(base, 0.18)
  const light = lighten(base, 0.18)
  // Diamond pattern with small dots, tileable.
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const dx = Math.abs(((x + 8) % 16) - 8)
      const dy = Math.abs(((y + 8) % 16) - 8)
      if (dx + dy === 7) p.set(x, y, dark)
      if (dx + dy === 0) p.set(x, y, light)
    }
  for (const [x, y] of [
    [0, 0],
    [16, 16],
  ] as const)
    p.rect(x, y, 2, 2, light).set(x, y, lighten(base, 0.35))
  return p
}

export function azulejos(): SpriteDrawing {
  const colors: [string, string][] = [
    ['azul', '#6c8fc0'],
    ['marrom', '#9a7258'],
    ['cinza', '#8c8a9c'],
    ['verde', '#6f9e74'],
    ['rosa', '#c07f93'],
    ['roxo', '#8a73b0'],
    ['amarelo', '#c9a85c'],
  ]
  return sprite(
    'azulejos',
    32,
    32,
    colors.map(([name, color]) => one(name, wallpaper(color))),
  )
}

function heart(frame: number): Px {
  const p = new Px(8, 8)
  const shape = ['.##.##..', '#######.', '#######.', '.#####..', '..###...', '...#....', '........']
  shape.forEach((row, y) => {
    for (const [x, c] of [...row].entries()) {
      if (c === '#') p.set(x, y, RED.base)
    }
  })
  p.set(1, 1, '#ffffff').set(2, 1, RED.light).set(1, 2, RED.light)
  p.rect(5, 2, 1, 2, RED.dark).set(4, 4, RED.dark).set(3, 5, RED.dark)
  // Shine sweeps across.
  if (frame > 0) {
    const x = frame * 2 - 1
    for (let y = 0; y < 7; y++) if (p.get(x + y - 2, y) === RED.base) p.set(x + y - 2, y, '#ff9d9d')
  }
  return p
}

export function interfaceSprite(): SpriteDrawing {
  const place = (art: Px) => {
    const frame = new Px(11, 11)
    frame.draw(art)
    return frame
  }
  const icon = coin(0, GOLD)
  icon.set(5, 3, GOLD.dark)
  return sprite('interface', 11, 11, [
    { name: 'coracao', fps: 6, loop: false, frames: [0, 1, 2, 3].map((f) => place(heart(f))) },
    one('moeda', place(icon)),
  ])
}

// ---- clouds ---------------------------------------------------------------------------------

const CLOUD = { light: '#fffaf0', base: '#f3ead8', shade: '#dccdb6', deep: '#c4b39d' }

function puff(p: Px, cx: number, cy: number, r: number) {
  p.ellipse(cx - r, cy - r * 0.8, r * 2, r * 1.6, CLOUD.base)
}

function shadeCloud(p: Px) {
  for (let y = 0; y < p.height; y++)
    for (let x = 0; x < p.width; x++) {
      if (p.get(x, y) === null) continue
      if (p.get(x, y - 2) === null && p.get(x, y - 1) !== null) p.set(x, y, CLOUD.light)
      else if (p.get(x, y + 3) === null || y >= p.height - 3) p.set(x, y, CLOUD.shade)
    }
  p.outline(CLOUD.deep)
}

function smallCloud(w: number, h: number, seed: number): BackgroundDrawing {
  const rng = random(seed)
  const p = new Px(w, h)
  const base = h - 4
  p.rect(6, base - 8, w - 12, 8, CLOUD.base)
  for (let x = 10; x < w - 10; x += rng.int(10, 18)) {
    const r = rng.int(Math.floor(h * 0.2), Math.floor(h * 0.42))
    puff(p, x + r / 2, base - r * 0.7, r)
  }
  puff(p, 10, base - 5, 6)
  puff(p, w - 10, base - 5, 6)
  for (let y = base + 1; y < h; y++) for (let x = 0; x < w; x++) p.set(x, y, null)
  shadeCloud(p)
  return { kind: 'background', name: `nuvem-${seed}`, image: p }
}

function largeCloud(): BackgroundDrawing {
  // A bank of clouds on the horizon; it repeats sideways, so both ends match.
  const w = 512
  const h = 202
  const p = new Px(w, h)
  const rng = random(77)
  p.rect(0, h - 40, w, 40, CLOUD.base)
  const bumps: [number, number][] = []
  for (let x = 0; x < w; x += rng.int(28, 52)) bumps.push([x, rng.int(28, 70)])
  for (const [x, r] of bumps)
    for (const shiftX of [-w, 0, w]) puff(p, x + shiftX, h - 30 - r * 0.6, r)
  for (const [x, r] of bumps)
    for (const shiftX of [-w, 0, w]) puff(p, x + 20 + shiftX, h - 20 - r * 0.2, r * 0.6)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) if (p.get(x, y) !== null && y > h - 18) p.set(x, y, CLOUD.shade)
  shadeCloud(p)
  for (let x = 0; x < w; x++) p.set(x, h - 1, CLOUD.shade)
  return { kind: 'background', name: 'nuvem-grande', image: p }
}

// ---- world map pieces -----------------------------------------------------------------------

function mapWater(frame: number): Px {
  const p = new Px(32, 32, SEA.base)
  for (let y = 0; y < 32; y += 8)
    for (let x = 0; x < 32; x++) {
      const yy = y + Math.round(Math.sin(((x + frame * 4 + y) / 32) * Math.PI * 2) * 1.5) + 3
      if ((x + y) % 16 < 6) p.set(x, yy, SEA.light)
    }
  if (frame === 1) p.set(20, 13, SEA.shine).set(21, 13, SEA.shine)
  if (frame === 2) p.set(8, 25, SEA.shine).set(9, 25, SEA.shine)
  return p
}

function mapPalm(frame: number): Px {
  const p = new Px(52, 64)
  const sway = [0, 1, 2, 1, 0][frame]!
  trunk(p, [
    [26, 58],
    [25, 40],
    [26 + sway, 18],
  ])
  crown(p, 26 + sway, 16, sway, LEAF, 1.35)
  p.outline(INK)
  for (let x = 16; x < 36; x++) if (p.get(x, 61) === null) p.set(x, 61, '#3f7d4a')
  for (let x = 19; x < 33; x++) if (p.get(x, 62) === null) p.set(x, 62, '#3f7d4a')
  return p
}

function grassTuft(w: number, h: number, seed: number): Px {
  const rng = random(seed)
  const p = new Px(w, h)
  for (let x = 1; x < w - 1; x += rng.int(2, 3)) {
    const t = rng.int(Math.floor(h / 2), h - 1)
    p.line(x, h - 1, x + rng.int(-1, 1), h - 1 - t, rng.pick(['#79b867', '#5c9e57', '#9fd27e']))
  }
  p.outline('#2f5a3f')
  return cropTo(p, w, h)
}

function mapStone(): Px {
  const p = new Px(14, 13)
  p.ellipse(0, 3, 14, 10, '#8780ab')
  p.ellipse(3, 1, 8, 7, '#aaa4c9')
  p.set(5, 2, '#c9c4e0').set(6, 2, '#c9c4e0')
  p.rect(0, 11, 14, 1, '#5b5580')
  p.outline(INK)
  return cropTo(p, 14, 13)
}

export function enfeitesMapa(): SpriteDrawing {
  const place = (art: Px) => {
    const frame = new Px(20, 13)
    frame.draw(art)
    return frame
  }
  return sprite('enfeites-mapa', 20, 13, [
    one('capim-1', place(grassTuft(20, 12, 1))),
    one('capim-2', place(grassTuft(14, 8, 2))),
    one('capim-3', place(grassTuft(14, 10, 3))),
    one('capim-4', place(grassTuft(16, 10, 4))),
    one('capim-5', place(grassTuft(18, 10, 5))),
    one('pedra', place(mapStone())),
  ])
}

const SAND = { dark: '#b88a55', base: '#e2b97a', light: '#f3d59c' }

function pathPiece(connect: { n?: boolean; e?: boolean; s?: boolean; w?: boolean }): Px {
  const p = new Px(32, 32)
  const band = (x: number, y: number, w: number, h: number) => p.rect(x, y, w, h, SAND.base)
  if (connect.n) band(8, 0, 16, 24)
  if (connect.s) band(8, 8, 16, 24)
  if (connect.w) band(0, 8, 24, 16)
  if (connect.e) band(8, 8, 24, 16)
  // Rounded inner corner of a bend.
  if (
    Object.values(connect).filter(Boolean).length === 2 &&
    !(connect.n && connect.s) &&
    !(connect.e && connect.w)
  ) {
    const cx = connect.e ? 24 : 8
    const cy = connect.s ? 24 : 8
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const outside = (connect.e ? x < 8 : x > 23) || (connect.s ? y < 8 : y > 23)
        if (
          outside &&
          Math.hypot(x + 0.5 - (connect.e ? 24 : 8), y + 0.5 - (connect.s ? 24 : 8)) > 16
        )
          p.set(x, y, null)
      }
    void cx
    void cy
  }
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++)
      if (p.get(x, y) === SAND.base && (x * 7 + y * 13) % 17 === 0) p.set(x, y, SAND.light)
  // Darker sand along the sides of the path (not where it continues into the next tile).
  const marks: [number, number][] = []
  const empty = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < 32 && y < 32 && p.get(x, y) === null
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++)
      if (
        p.get(x, y) !== null &&
        (empty(x - 1, y) || empty(x + 1, y) || empty(x, y - 1) || empty(x, y + 1))
      )
        marks.push([x, y])
  for (const [x, y] of marks) p.set(x, y, SAND.dark)
  return p
}

function node(): Px {
  const p = new Px(64, 64)
  p.ellipse(10, 18, 44, 34, '#5b5580')
  p.ellipse(10, 14, 44, 34, '#aaa4c9')
  p.ellipse(13, 17, 38, 27, SAND.base)
  p.ellipse(17, 20, 30, 20, SAND.light)
  // A wooden stake with a little flag marks the stage.
  p.rect(31, 13, 3, 20, WOOD.base).rect(31, 13, 1, 20, WOOD.light)
  p.polygon(
    [
      [34, 13],
      [44, 16],
      [34, 20],
    ],
    RED.base,
  )
  p.line(34, 14, 41, 16, RED.light)
  p.ellipse(27, 30, 11, 5, SAND.dark)
  p.outline(INK)
  return p
}

export function worldPieces(): Drawing[] {
  return [
    sprite('mar', 32, 32, [{ name: 'ondas', fps: 6, loop: true, frames: [0, 1, 2].map(mapWater) }]),
    sprite('palmeira-mapa', 52, 64, [
      { name: 'balancar', fps: 5, loop: true, frames: [0, 1, 2, 3, 4].map(mapPalm) },
    ]),
    enfeitesMapa(),
    sprite('caminho', 32, 32, [
      one('horizontal', pathPiece({ e: true, w: true })),
      one('vertical', pathPiece({ n: true, s: true })),
      one('cima-esquerda', pathPiece({ n: true, w: true })),
      one('cima-direita', pathPiece({ n: true, e: true })),
      one('baixo-esquerda', pathPiece({ s: true, w: true })),
      one('baixo-direita', pathPiece({ s: true, e: true })),
    ]),
    sprite('marco', 64, 64, [one('fase', node())]),
  ]
}

export function levelPieces(): Drawing[] {
  return [
    sprite('serra', 38, 38, [
      { name: 'girar', fps: 6, loop: true, frames: [0, 1, 2, 3, 4, 5, 6, 7].map(saw) },
      one(
        'elo',
        (() => {
          const f = new Px(38, 38)
          f.draw(chainLink(4, STEEL.light, STEEL.dark))
          return f
        })(),
      ),
    ]),
    sprite('bola-espinhos', 27, 27, [
      one('bola', spikeBall()),
      one(
        'elo',
        (() => {
          const f = new Px(27, 27)
          f.draw(chainLink(7, STEEL.light, INK))
          return f
        })(),
      ),
    ]),
    sprite('espinhos', 32, 32, [
      { name: 'brilhar', fps: 6, loop: true, frames: [0, 1, 2, 3].map(floorSpikes) },
    ]),
    sprite('bandeira', 34, 93, [
      {
        name: 'tremular',
        fps: 6,
        loop: true,
        frames: Array.from({ length: 9 }, (_, f) => flag(f)),
      },
    ]),
    palmeiras(),
    decoracao(),
    sprite('vela', 10, 20, [
      { name: 'queimar', fps: 6, loop: true, frames: [0, 1, 2, 3, 4, 5].map(candle) },
    ]),
    sprite('luz-vela', 32, 32, [
      { name: 'brilhar', fps: 6, loop: true, frames: [0, 1, 2, 3].map(candleLight) },
    ]),
    sprite('janela', 29, 31, [
      {
        name: 'brilhar',
        fps: 6,
        loop: true,
        frames: Array.from({ length: 24 }, (_, f) => windowFrame(f)),
      },
    ]),
    sprite('correntes', 8, 58, [
      {
        name: 'grande',
        fps: 6,
        loop: true,
        frames: Array.from({ length: 8 }, (_, f) => chain(58, f)),
      },
      {
        name: 'pequena',
        fps: 6,
        loop: true,
        frames: Array.from({ length: 8 }, (_, f) => chain(31, f)),
      },
    ]),
    sprite('helice', 32, 10, [
      { name: 'girar', fps: 6, loop: true, frames: [0, 1, 2, 3].map(propeller) },
    ]),
    sprite('barco', 78, 22, [one('flutuar', boat())]),
    itens(),
    sprite('particula', 15, 15, [
      { name: 'brilho', fps: 6, loop: false, frames: [0, 1, 2].map(particle) },
    ]),
    sprite('agua', 32, 32, [
      { name: 'superficie', fps: 6, loop: true, frames: [0, 1, 2].map(waterTop) },
      one('fundo', waterBody()),
    ]),
    azulejos(),
    interfaceSprite(),
    largeCloud(),
    smallCloud(148, 48, 1),
    smallCloud(266, 70, 2),
    smallCloud(280, 78, 3),
  ]
}
