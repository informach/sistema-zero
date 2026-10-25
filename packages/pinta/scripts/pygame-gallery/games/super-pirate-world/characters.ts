/** Super Pirate World characters: the pirate, the tooth, the shell (and its pearl), the map icon. */
import type { SpriteDrawing } from '../../drawing'
import { Px, shift } from '../../pixel'
import { CLOTH, GOLD, INK, NAVY, PINK, PURPLE, RED, SILVER, SKIN, WOOD } from './palette'

const BEARD = { dark: '#7c3524', base: '#b8552f', light: '#e0824a' }
const BOOT = { dark: '#3a2228', base: '#5a3530' }

type Sword = 'rest' | 'up' | 'slash' | 'down' | 'none' | 'raised'

interface Pose {
  /** Upper body offset (breathing / bounce). */
  dy?: number
  dx?: number
  /** Feet offsets [backX, backY, frontX, frontY] (negative y = lifted). */
  feet?: [number, number, number, number]
  sword?: Sword
  eyes?: 'open' | 'closed' | 'hurt'
  /** Back arm raised (jump / fall). */
  armUp?: boolean
  hatTilt?: number
}

const CX = 27
const FOOT = 38

function leg(p: Px, x: number, y: number) {
  // Pants from the hip (y 33) down to the boot.
  const top = 33
  p.rect(x, top, 3, Math.max(1, y - 2 - top), NAVY.base)
  p.rect(x, top, 1, Math.max(1, y - 2 - top), NAVY.light)
  p.rect(x - 1, y - 2, 5, 3, BOOT.base)
  p.rect(x - 1, y, 5, 1, BOOT.dark)
  p.set(x + 3, y - 1, BOOT.base)
}

function sword(p: Px, kind: Sword, hx: number, hy: number) {
  const blade = (points: [number, number][]) => {
    for (const [x, y] of points) p.rect(x, y, 2, 2, SILVER.base)
    for (const [x, y] of points) p.set(x, y, SILVER.shine)
  }
  if (kind === 'none') return
  if (kind === 'rest') {
    p.rect(hx, hy - 2, 2, 5, GOLD.base).set(hx, hy - 2, GOLD.shine)
    p.rect(hx + 2, hy - 1, 11, 3, SILVER.base)
    p.rect(hx + 2, hy - 1, 11, 1, SILVER.shine)
    p.rect(hx + 2, hy + 1, 11, 1, SILVER.dark)
    p.rect(hx + 13, hy, 2, 2, SILVER.base).set(hx + 15, hy, SILVER.light)
    return
  }
  if (kind === 'up' || kind === 'raised') {
    p.rect(hx - 1, hy - 1, 4, 2, GOLD.base)
    const pts: [number, number][] = []
    for (let i = 1; i <= 10; i++) pts.push([hx + Math.round(i * 0.55), hy - 1 - i])
    blade(pts)
    return
  }
  if (kind === 'slash') {
    p.rect(hx, hy - 2, 2, 5, GOLD.base).set(hx, hy - 2, GOLD.shine)
    p.rect(hx + 2, hy - 1, 15, 3, SILVER.base)
    p.rect(hx + 2, hy - 1, 15, 1, SILVER.shine)
    p.rect(hx + 2, hy + 1, 15, 1, SILVER.dark)
    p.rect(hx + 17, hy, 2, 2, SILVER.light)
    return
  }
  // down
  p.rect(hx - 1, hy - 1, 4, 2, GOLD.base)
  const pts: [number, number][] = []
  for (let i = 1; i <= 9; i++) pts.push([hx + Math.round(i * 0.9), hy + Math.round(i * 0.55)])
  blade(pts)
}

function head(p: Px, cx: number, top: number, eyes: Pose['eyes'], tilt: number) {
  // Face.
  p.ellipse(cx - 6, top + 4, 13, 11, SKIN.base)
  p.rect(cx - 6, top + 9, 2, 3, SKIN.dark)
  // Beard and sideburn.
  p.ellipse(cx - 5, top + 11, 12, 6, BEARD.base)
  p.rect(cx - 1, top + 13, 5, 1, BEARD.light)
  p.rect(cx - 5, top + 6, 2, 7, BEARD.base)
  p.rect(cx + 1, top + 10, 5, 1, BEARD.base)
  p.set(cx - 5, top + 15, BEARD.dark).set(cx + 6, top + 13, BEARD.dark)
  // Mouth, nose and cheek.
  p.rect(cx + 1, top + 11, 4, 1, BEARD.dark).set(cx + 5, top + 10, BEARD.dark)
  p.rect(cx + 5, top + 8, 3, 2, SKIN.base).set(cx + 7, top + 9, SKIN.dark)
  p.set(cx + 1, top + 9, PINK.base).set(cx + 2, top + 9, PINK.light)
  // Eye.
  if (eyes === 'closed') p.rect(cx + 2, top + 7, 3, 1, INK)
  else if (eyes === 'hurt')
    p.set(cx + 2, top + 6, INK)
      .set(cx + 4, top + 6, INK)
      .set(cx + 3, top + 7, INK)
      .set(cx + 2, top + 8, INK)
      .set(cx + 4, top + 8, INK)
  else p.rect(cx + 3, top + 6, 2, 3, INK).set(cx + 3, top + 6, CLOTH.base)
  p.rect(cx + 1, top + 4, 4, 1, BEARD.dark)
  // Tricorn hat with a gold trim and a white feather.
  const h = top - tilt
  p.polygon(
    [
      [cx - 7, h + 5],
      [cx - 5, h - 1],
      [cx + 2, h - 3],
      [cx + 7, h],
      [cx + 8, h + 5],
    ],
    RED.base,
  )
  p.rect(cx - 9, h + 4, 19, 2, RED.dark)
  p.rect(cx - 9, h + 3, 3, 2, RED.dark).rect(cx + 8, h + 2, 3, 3, RED.dark)
  p.rect(cx - 9, h + 5, 19, 1, GOLD.base)
  p.set(cx - 9, h + 2, GOLD.base).set(cx + 10, h + 1, GOLD.base)
  p.rect(cx - 4, h, 6, 1, RED.light).rect(cx - 5, h + 1, 3, 1, RED.light)
  // Skull badge.
  const skull = ['.###.', '#.#.#', '.###.', '.#.#.']
  skull.forEach((row, y) => {
    ;[...row].forEach((c, x) => {
      if (c === '#') p.set(cx - 1 + x, h + y, CLOTH.base)
    })
  })
  // Feather.
  for (let i = 0; i < 6; i++) p.rect(cx - 5 - i, h + 1 - i, 2, 2, i > 3 ? CLOTH.shade : CLOTH.base)
  p.line(cx - 6, h + 2, cx - 11, h - 3, CLOTH.shade)
}

function pirate(pose: Pose = {}): Px {
  const p = new Px(55, 48)
  const dy = pose.dy ?? 0
  const dx = pose.dx ?? 0
  const [bx, by, fx, fy] = pose.feet ?? [0, 0, 0, 0]
  const cx = CX + dx
  // Back arm (behind the body).
  if (pose.armUp) p.rect(cx - 9, 22 + dy, 3, 5, SKIN.dark).rect(cx - 8, 25 + dy, 3, 3, CLOTH.shade)
  else p.rect(cx - 8, 27 + dy, 3, 5, CLOTH.shade).rect(cx - 8, 31 + dy, 3, 2, SKIN.dark)
  // Legs.
  leg(p, CX - 4 + bx, FOOT + by)
  leg(p, CX + 1 + fx, FOOT + fy)
  // Striped shirt and belt.
  const torsoTop = 25 + dy
  p.rect(cx - 6, torsoTop, 13, 34 - torsoTop, CLOTH.base)
  for (let y = torsoTop + 1; y < 33; y += 3) p.rect(cx - 6, y, 13, 1, RED.base)
  p.rect(cx + 4, torsoTop, 3, 34 - torsoTop, CLOTH.shade)
  for (let y = torsoTop + 1; y < 33; y += 3) p.rect(cx + 4, y, 3, 1, RED.dark)
  p.rect(cx - 6, 31 + Math.min(dy, 1), 13, 2, WOOD.dark)
  p.rect(cx, 31 + Math.min(dy, 1), 3, 2, GOLD.base).set(cx + 1, 31 + Math.min(dy, 1), GOLD.shine)
  head(p, cx, 11 + dy, pose.eyes ?? 'open', pose.hatTilt ?? 0)
  // Front arm and sword.
  const kind = pose.sword ?? 'rest'
  if (kind === 'up' || kind === 'raised') {
    p.rect(cx + 5, 22 + dy, 3, 6, CLOTH.shade).rect(cx + 6, 20 + dy, 3, 3, SKIN.base)
    sword(p, kind, cx + 7, 21 + dy)
  } else if (kind === 'slash') {
    p.rect(cx + 5, 27 + dy, 6, 3, CLOTH.shade).rect(cx + 10, 27 + dy, 3, 3, SKIN.base)
    sword(p, kind, cx + 13, 28 + dy)
  } else if (kind === 'down') {
    p.rect(cx + 5, 27 + dy, 3, 5, CLOTH.shade).rect(cx + 6, 31 + dy, 3, 3, SKIN.base)
    sword(p, kind, cx + 8, 33 + dy)
  } else {
    p.rect(cx + 5, 27 + dy, 4, 3, CLOTH.shade).rect(cx + 8, 27 + dy, 3, 3, SKIN.base)
    sword(p, kind, cx + 10, 28 + dy)
  }
  p.outline(INK)
  return p
}

/** The swoosh in front of a slash (drawn after the outline: light only). */
function swoosh(p: Px, cx: number, cy: number, radius: number, from: number, to: number) {
  for (let a = from; a <= to; a += 0.04) {
    const x = cx + Math.cos(a) * radius
    const y = cy + Math.sin(a) * radius
    if (p.get(Math.round(x), Math.round(y)) === null) p.set(x, y, '#ffffff')
    const x2 = cx + Math.cos(a) * (radius - 1)
    const y2 = cy + Math.sin(a) * (radius - 1)
    if (p.get(Math.round(x2), Math.round(y2)) === null) p.set(x2, y2, '#bfe9ff')
  }
  return p
}

export function pirata(): SpriteDrawing {
  const idle = [0, 0, 1, 1, 0].map((dy, i) => pirate({ dy, eyes: i === 3 ? 'closed' : 'open' }))
  const runFeet: [number, number, number, number][] = [
    [-3, 0, 3, -1],
    [-1, -1, 2, 0],
    [1, -2, 0, 0],
    [3, -1, -3, 0],
    [1, 0, -1, -1],
    [-1, 0, 1, -2],
  ]
  const run = runFeet.map((feet, i) => pirate({ feet, dy: i % 3 === 1 ? -1 : 0, dx: 1 }))
  const jump = pirate({ feet: [-2, -3, 2, -2], dy: -1, armUp: true, sword: 'rest' })
  const fall = pirate({ feet: [-1, 0, 2, 1], dy: 0, armUp: true, hatTilt: 1 })
  const wall = shift(pirate({ feet: [0, 0, 2, -2], armUp: true, eyes: 'closed' }).flipX(), 3, 0)
  const attack = [
    pirate({ sword: 'up', dx: -1 }),
    swoosh(pirate({ sword: 'slash', dx: 1 }), 33, 27, 15, -1.2, 0.9),
    pirate({ sword: 'down', dx: 1 }),
  ]
  const airAttack = [
    pirate({ sword: 'up', feet: [-2, -3, 2, -2], armUp: true }),
    swoosh(pirate({ sword: 'slash', feet: [-2, -3, 2, -2], armUp: true }), 33, 27, 15, -1.3, 1.1),
    pirate({ sword: 'down', feet: [-2, -2, 2, -1], armUp: true }),
  ]
  const hit = [
    pirate({ dx: -2, eyes: 'hurt', hatTilt: 2, sword: 'down' }),
    pirate({ dx: -3, dy: 1, eyes: 'hurt', hatTilt: 3, sword: 'down' }),
    pirate({ dx: -1, eyes: 'closed', hatTilt: 1 }),
  ]
  return {
    kind: 'sprite',
    name: 'pirata',
    frameWidth: 55,
    frameHeight: 48,
    animations: [
      { name: 'parado', fps: 6, loop: true, frames: idle },
      { name: 'correr', fps: 6, loop: true, frames: run },
      { name: 'pular', fps: 6, loop: true, frames: [jump] },
      { name: 'cair', fps: 6, loop: true, frames: [fall] },
      { name: 'parede', fps: 6, loop: true, frames: [wall] },
      { name: 'atacar', fps: 6, loop: false, frames: attack },
      { name: 'atacar-no-ar', fps: 6, loop: false, frames: airAttack },
      { name: 'ferido', fps: 6, loop: true, frames: hit },
    ],
  }
}

// ---- tooth ----------------------------------------------------------------------------------

function tooth(frame: number): Px {
  const p = new Px(24, 23)
  const bounce = [0, -1, -2, -1, 0, 1][frame]!
  const step = frame % 3
  // Feet.
  const feet = [
    [5, 9 + step],
    [14 - step, 15],
  ][0]!
  p.rect(4 + (frame % 2 ? 2 : 0), 20, 5, 3, PURPLE.dark)
  p.rect(14 - (frame % 2 ? 2 : 0), 20, 5, 3, PURPLE.dark)
  void feet
  // Body.
  p.ellipse(1, 2 + bounce, 22, 19, PURPLE.base)
  p.ellipse(3, 3 + bounce, 12, 7, PURPLE.light)
  p.set(5, 4 + bounce, PURPLE.shine).set(6, 4 + bounce, PURPLE.shine)
  p.rect(2, 15 + bounce, 20, 4, PURPLE.dark)
  // Horn.
  p.polygon(
    [
      [9, 3 + bounce],
      [12, -1 + bounce],
      [14, 3 + bounce],
    ],
    CLOTH.base,
  )
  // Big mouth with jagged teeth.
  p.rect(9, 10 + bounce, 13, 6, RED.dark)
  p.rect(10, 13 + bounce, 11, 2, RED.base)
  for (let x = 9; x < 22; x += 3) {
    p.polygon(
      [
        [x, 10 + bounce],
        [x + 3, 10 + bounce],
        [x + 1.5, 13 + bounce],
      ],
      CLOTH.base,
    )
    p.polygon(
      [
        [x + 1, 16 + bounce],
        [x + 4, 16 + bounce],
        [x + 2.5, 13.5 + bounce],
      ],
      CLOTH.base,
    )
  }
  // Angry eye.
  p.rect(14, 5 + bounce, 5, 4, CLOTH.base)
  p.rect(16, 6 + bounce, 2, 3, INK)
  p.line(13, 4 + bounce, 19, 5 + bounce, INK)
  p.outline(INK)
  return p
}

export function dente(): SpriteDrawing {
  return {
    kind: 'sprite',
    name: 'dente',
    frameWidth: 24,
    frameHeight: 23,
    animations: [{ name: 'correr', fps: 6, loop: true, frames: [0, 1, 2, 3, 4, 5].map(tooth) }],
  }
}

// ---- shell ----------------------------------------------------------------------------------

function shellFrame(open: number, pearl: boolean, blink = false): Px {
  const p = new Px(38, 23)
  // Bottom half (the base sits on the ground).
  p.ellipse(3, 12, 32, 11, PINK.dark)
  p.rect(3, 17, 32, 5, PINK.dark)
  p.rect(4, 13, 30, 3, PINK.base)
  for (let x = 7; x < 33; x += 5) p.rect(x, 14, 1, 7, PINK.dark)
  // Inside of the mouth when open.
  if (open > 0) {
    p.rect(8, 13 - open, 24, open + 1, '#5a2340')
    p.rect(10, 13 - open + 1, 20, open, '#7a3355')
    if (pearl)
      p.circle(27, 13 - Math.floor(open / 2), 3, CLOTH.base).set(
        26,
        12 - Math.floor(open / 2),
        '#ffffff',
      )
  }
  // Top half (the lid), lifted by `open`.
  const top = 1 - open
  const lid = new Px(38, 23)
  lid.ellipse(2, top + 1, 34, 18, PINK.base)
  for (let y = 0; y < 23; y++) for (let x = 0; x < 38; x++) if (y > top + 11) lid.set(x, y, null)
  for (let x = 6; x < 34; x += 5) lid.line(19, top + 3, x, top + 11, PINK.dark)
  lid.ellipse(8, top + 2, 12, 5, PINK.light)
  lid
    .set(11, top + 3, PINK.shine)
    .set(12, top + 3, PINK.shine)
    .set(13, top + 3, PINK.shine)
  lid.rect(2, top + 11, 34, 1, PINK.dark)
  p.draw(lid)
  // A peeking eye on the lid's front.
  if (!blink) p.rect(29, top + 5, 4, 4, CLOTH.base).rect(31, top + 6, 2, 3, INK)
  else p.rect(29, top + 7, 4, 1, INK)
  p.outline(INK)
  return p
}

export function concha(): SpriteDrawing {
  // Every frame of a Pinta sprite has the sprite's size (a smaller one would be dropped): the
  // 8×8 pearl sits in the TOP-LEFT corner of a 38×23 frame, because the game (`support.trim`)
  // cuts only the empty space to the right and below.
  const ball = new Px(8, 8)
  ball.circle(3.5, 3.5, 3.5, PINK.shine)
  ball.circle(3.5, 3.5, 2.5, CLOTH.base)
  ball.rect(2, 1, 2, 2, '#ffffff')
  ball.set(5, 5, PINK.light).set(4, 5, PINK.light)
  const pearl = new Px(38, 23)
  pearl.draw(ball, 0, 0)
  return {
    kind: 'sprite',
    name: 'concha',
    frameWidth: 38,
    frameHeight: 23,
    animations: [
      { name: 'parado', fps: 6, loop: true, frames: [shellFrame(0, false)] },
      {
        name: 'atirar',
        fps: 6,
        loop: false,
        frames: [
          shellFrame(0, false, true),
          shellFrame(2, false),
          shellFrame(4, true),
          shellFrame(5, false),
          shellFrame(3, false),
          shellFrame(1, false),
        ],
      },
      { name: 'perola', fps: 1, loop: true, frames: [pearl] },
    ],
  }
}

// ---- world map icon -------------------------------------------------------------------------

function iconFrame(dir: 'down' | 'up' | 'right', step: number): Px {
  const p = new Px(32, 38)
  const bob = step % 2 === 1 ? -1 : 0
  const cx = 16
  // Feet.
  const lift = [0, -2, 0, -2][step % 4]!
  if (dir === 'right') {
    p.rect(cx - 5 + (step % 2 ? 2 : 0), 33, 5, 3, BOOT.base).rect(
      cx + 1 - (step % 2 ? 2 : 0),
      33 + (step % 2 ? lift : 0),
      5,
      3,
      BOOT.dark,
    )
  } else {
    p.rect(cx - 6, 33 + (step % 4 === 1 ? lift : 0), 5, 3, BOOT.base).rect(
      cx + 2,
      33 + (step % 4 === 3 ? lift : 0),
      5,
      3,
      BOOT.base,
    )
  }
  p.rect(cx - 6, 30 + bob, 13, 4, NAVY.base)
  // Body.
  p.rect(cx - 7, 21 + bob, 15, 10, CLOTH.base)
  for (let y = 22; y < 31; y += 3) p.rect(cx - 7, y + bob, 15, 1, RED.base)
  p.rect(cx - 7, 28 + bob, 15, 2, WOOD.dark).rect(cx - 1, 28 + bob, 3, 2, GOLD.base)
  // Head.
  p.ellipse(cx - 8, 8 + bob, 17, 15, SKIN.base)
  if (dir === 'up') {
    p.ellipse(cx - 8, 10 + bob, 17, 13, BEARD.base)
    p.rect(cx - 6, 18 + bob, 13, 2, BEARD.dark)
  } else if (dir === 'down') {
    p.ellipse(cx - 7, 15 + bob, 15, 8, BEARD.base)
    p.rect(cx - 2, 18 + bob, 5, 1, BEARD.dark)
    p.rect(cx - 5, 12 + bob, 2, 3, INK).rect(cx + 4, 12 + bob, 2, 3, INK)
    p.set(cx - 5, 12 + bob, CLOTH.base).set(cx + 4, 12 + bob, CLOTH.base)
    p.rect(cx - 1, 14 + bob, 3, 2, SKIN.dark)
  } else {
    p.ellipse(cx - 6, 14 + bob, 14, 8, BEARD.base)
    p.rect(cx + 3, 11 + bob, 2, 3, INK).set(cx + 3, 11 + bob, CLOTH.base)
    p.rect(cx + 7, 14 + bob, 2, 2, SKIN.base)
    p.rect(cx - 7, 11 + bob, 3, 5, BEARD.base)
  }
  // Hat.
  p.polygon(
    [
      [cx - 9, 10 + bob],
      [cx - 6, 3 + bob],
      [cx, 1 + bob],
      [cx + 6, 3 + bob],
      [cx + 9, 10 + bob],
    ],
    RED.base,
  )
  p.rect(cx - 11, 8 + bob, 23, 3, RED.dark)
  p.rect(cx - 11, 10 + bob, 23, 1, GOLD.base)
  p.rect(cx - 4, 3 + bob, 6, 1, RED.light)
  if (dir !== 'up')
    p.rect(cx - 1, 4 + bob, 3, 2, CLOTH.base)
      .set(cx - 1, 4 + bob, INK)
      .set(cx + 1, 4 + bob, INK)
  // Arms.
  const swing = step % 2 ? 1 : -1
  if (dir === 'right')
    p.rect(cx - 2 + swing, 23 + bob, 4, 6, CLOTH.shade).rect(
      cx - 1 + swing,
      28 + bob,
      3,
      2,
      SKIN.base,
    )
  else {
    p.rect(cx - 10, 22 + bob + swing, 3, 7, CLOTH.shade).rect(
      cx - 10,
      28 + bob + swing,
      3,
      2,
      SKIN.base,
    )
    p.rect(cx + 8, 22 + bob - swing, 3, 7, CLOTH.shade).rect(
      cx + 8,
      28 + bob - swing,
      3,
      2,
      SKIN.base,
    )
  }
  p.outline(INK)
  // Shadow on the ground.
  for (let x = cx - 8; x <= cx + 8; x++) if (p.get(x, 36) === null) p.set(x, 36, '#2f5a3f')
  for (let x = cx - 6; x <= cx + 6; x++) if (p.get(x, 37) === null) p.set(x, 37, '#2f5a3f')
  return p
}

export function icone(): SpriteDrawing {
  const right = [0, 1, 2].map((step) => iconFrame('right', step))
  return {
    kind: 'sprite',
    name: 'icone',
    frameWidth: 32,
    frameHeight: 38,
    animations: [
      { name: 'parado', fps: 6, loop: true, frames: [iconFrame('down', 0)] },
      {
        name: 'baixo',
        fps: 6,
        loop: true,
        frames: [0, 1, 2, 3].map((step) => iconFrame('down', step)),
      },
      {
        name: 'esquerda',
        fps: 6,
        loop: true,
        frames: [0, 1, 2, 1].map((step) => iconFrame('right', step).flipX()),
      },
      { name: 'direita', fps: 6, loop: true, frames: right },
      { name: 'cima', fps: 6, loop: true, frames: [0, 1, 2].map((step) => iconFrame('up', step)) },
    ],
  }
}
