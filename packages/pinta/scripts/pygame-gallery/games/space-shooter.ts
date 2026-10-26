/** Space Shooter: the ship, meteors, laser, stars and the explosion, drawn at half size (×2). */
import type { Drawing, SpriteDrawing } from '../drawing'
import { darken, lighten, mix, Px, random } from '../pixel'

const INK = '#1b1426'

function ship(flame: number): Px {
  const s = new Px(56, 38)
  const hull = '#c9d6e8'
  const hullDark = '#8293ad'
  const hullLight = '#eef4fb'
  const accent = '#e8484f'
  const accentDark = '#a8273a'
  // Wings: two swept triangles.
  s.polygon(
    [
      [28, 12],
      [3, 30],
      [3, 34],
      [22, 31],
      [28, 26],
    ],
    hullDark,
  )
  s.polygon(
    [
      [28, 14],
      [7, 29],
      [21, 29],
      [28, 24],
    ],
    hull,
  )
  s.rect(2, 26, 3, 9, accent).rect(2, 26, 1, 9, accentDark)
  // Fuselage.
  s.polygon(
    [
      [28, 1],
      [23, 10],
      [21, 31],
      [28, 35],
    ],
    hull,
  )
  s.rect(23, 14, 5, 17, hull)
  s.mirrorX()
  s.rect(26, 2, 2, 30, hullLight)
  // Cockpit.
  s.ellipse(24, 9, 8, 11, '#2a4a8a')
  s.ellipse(25, 10, 6, 8, '#4f86d9')
  s.rect(26, 11, 2, 3, '#bfe0ff')
  // Stripes and engine block.
  s.rect(22, 22, 12, 2, accent).rect(22, 23, 12, 1, accentDark)
  s.rect(23, 31, 10, 4, '#59647a').rect(24, 31, 8, 1, '#7a869e')
  s.rect(9, 30, 4, 3, '#59647a').rect(43, 30, 4, 3, '#59647a')
  s.rim(null, hullDark)
  s.outline(INK)
  // Engine flame (below the hull, animated).
  const length = [3, 5, 4][flame % 3]!
  s.rect(25, 35, 6, 1, '#ffd24a')
  for (let y = 0; y < length; y++) {
    const half = Math.max(0, 3 - Math.floor((y * 3) / length))
    s.rect(
      28 - half,
      36 + y > 37 ? 37 : 36 + y,
      half * 2,
      1,
      y < 1 ? '#fff4c4' : y < 3 ? '#ffd24a' : '#ff8a3d',
    )
  }
  s.rect(10, 33, 2, flame % 2 ? 2 : 1, '#ffd24a').rect(44, 33, 2, flame % 2 ? 1 : 2, '#ffd24a')
  return s
}

function meteor(seed: number): Px {
  const rng = random(seed)
  const m = new Px(50, 42)
  const base = ['#8a6a55', '#7d6b5d', '#94705a'][seed % 3]!
  const points: [number, number][] = []
  for (let index = 0; index < 11; index++) {
    const angle = (index / 11) * Math.PI * 2
    const radius = 0.78 + rng.next() * 0.22
    points.push([25 + Math.cos(angle) * 23 * radius, 21 + Math.sin(angle) * 19 * radius])
  }
  m.polygon(points, base)
  // Light from the top-left, shade towards the bottom-right.
  for (let y = 0; y < m.height; y++)
    for (let x = 0; x < m.width; x++) {
      if (!m.get(x, y)) continue
      const light = (x - 25) / 23 + (y - 21) / 19
      if (light > 0.55) m.set(x, y, darken(base, 0.32))
      else if (light > 0.15) m.set(x, y, darken(base, 0.15))
      else if (light < -0.75) m.set(x, y, lighten(base, 0.25))
    }
  for (let crater = 0; crater < 5; crater++) {
    const cx = rng.int(10, 38)
    const cy = rng.int(8, 32)
    const r = rng.int(2, 5)
    if (!m.get(cx, cy)) continue
    m.ellipse(cx - r, cy - r, r * 2, r * 2 - 1, darken(base, 0.4))
    m.ellipse(cx - r + 1, cy - r + 1, r * 2 - 1, r * 2 - 2, darken(base, 0.22))
    m.set(cx - r + 1, cy - r, lighten(base, 0.2))
  }
  m.speckle(rng, 0.05, [darken(base, 0.25), lighten(base, 0.12)])
  m.outline(INK)
  return m
}

function laser(glow: boolean): Px {
  // Pinta's smallest frame is 8 px: the beam sits in the middle of it.
  const l = new Px(8, 27)
  l.rect(1, 2, 6, 23, glow ? '#3fd6ff' : '#2bb5e8')
  l.rect(2, 0, 4, 27, glow ? '#8beaff' : '#5fd8ff')
  l.rect(3, 1, 2, 25, '#ffffff')
  l.set(1, 2, null).set(6, 2, null).set(1, 24, null).set(6, 24, null)
  return l
}

function star(phase: number): Px {
  const s = new Px(25, 25)
  const sizes = [5, 7, 9, 7]
  const arm = sizes[phase % 4]!
  const core = '#fff8d6'
  s.rect(12 - arm, 12, arm * 2 + 1, 1, '#ffe27a').rect(12, 12 - arm, 1, arm * 2 + 1, '#ffe27a')
  s.rect(10, 10, 5, 5, '#ffe27a').rect(11, 9, 3, 7, '#ffe27a').rect(9, 11, 7, 3, '#ffe27a')
  s.rect(11, 11, 3, 3, core).set(12, 10, core).set(12, 14, core).set(10, 12, core).set(14, 12, core)
  if (phase % 2 === 0) {
    for (const [dx, dy] of [
      [-4, -4],
      [4, -4],
      [-4, 4],
      [4, 4],
    ] as const)
      s.set(12 + dx, 12 + dy, '#fff1a8')
  }
  s.set(12, 12, '#ffffff')
  return s
}

function explosion(frame: number, total: number): Px {
  const e = new Px(25, 25)
  const t = frame / (total - 1)
  const rng = random(frame * 31 + 7)
  if (t < 0.55) {
    const grow = t / 0.55
    const radius = 3 + grow * 9
    const colors = ['#ff6b2c', '#ffa53a', '#ffd84d', '#fff6c8']
    colors.forEach((color, index) => {
      const r = radius * (1 - index * 0.22)
      if (r > 0.8) e.circle(12.5, 12.5, r, color)
    })
    for (let spark = 0; spark < 8; spark++) {
      const angle = (spark / 8) * Math.PI * 2 + frame * 0.3
      const d = radius + 1 + rng.int(0, 2)
      e.set(12 + Math.cos(angle) * d, 12 + Math.sin(angle) * d, spark % 2 ? '#ffd84d' : '#ff6b2c')
    }
    e.speckle(rng, 0.08, ['#ff8a3d', '#ffe9a0'])
  } else {
    const fade = (t - 0.55) / 0.45
    const smoke = mix('#7a6a7e', '#3a2e3f', fade)
    for (let puff = 0; puff < 6; puff++) {
      const angle = (puff / 6) * Math.PI * 2 + 0.4
      const d = 5 + fade * 6
      const r = Math.max(1, 4 - fade * 3)
      e.circle(
        12.5 + Math.cos(angle) * d,
        12.5 + Math.sin(angle) * d,
        r,
        puff % 2 ? smoke : lighten(smoke, 0.15),
      )
    }
    if (fade < 0.4) e.circle(12.5, 12.5, 3 - fade * 5, '#ff8a3d')
  }
  return e
}

export function drawings(): Drawing[] {
  const nave: SpriteDrawing = {
    kind: 'sprite',
    name: 'nave',
    frameWidth: 56,
    frameHeight: 38,
    animations: [{ name: 'voar', fps: 12, loop: true, frames: [0, 1, 2].map(ship) }],
  }
  return [
    nave,
    {
      kind: 'sprite',
      name: 'meteoro',
      frameWidth: 50,
      frameHeight: 42,
      animations: [{ name: 'pedras', fps: 1, loop: true, frames: [3, 8, 13].map(meteor) }],
    },
    {
      kind: 'sprite',
      name: 'laser',
      // The frames are 8 px wide (Pinta's smallest frame), so is the sprite.
      frameWidth: 8,
      frameHeight: 27,
      animations: [{ name: 'brilhar', fps: 10, loop: true, frames: [laser(false), laser(true)] }],
    },
    {
      kind: 'sprite',
      name: 'estrela',
      frameWidth: 25,
      frameHeight: 25,
      animations: [{ name: 'piscar', fps: 4, loop: true, frames: [0, 1, 2, 3].map(star) }],
    },
    {
      kind: 'sprite',
      name: 'explosao',
      frameWidth: 25,
      frameHeight: 25,
      animations: [
        {
          name: 'explodir',
          fps: 20,
          loop: false,
          frames: Array.from({ length: 21 }, (_, frame) => explosion(frame, 21)),
        },
      ],
    },
  ]
}
