/**
 * Python Monsters battle art: the six attack effects, the three battle backgrounds (each one in
 * two halves, because a Pinta background is at most 512 px wide), the menu buttons, the stat
 * icons, the "can't catch" cross and the stars of the evolution.
 */
import type { BackgroundDrawing, Drawing, SpriteDrawing } from '../../drawing'
import { mix, Px, random } from '../../pixel'
import { bayer, crop, hash, INK, PAL, periodicNoise } from './kit'

const S = 96
const C = S / 2

// Attack effects -----------------------------------------------------------------------------

function explosion(frame: number): Px {
  const p = new Px(S, S)
  const rng = random(70 + frame)
  const radius = [10, 22, 32, 36][frame]!
  const colors = ['#c2401f', '#ef6f2a', '#f9a23c', '#ffe08a', '#ffffff']
  if (frame < 3) {
    colors.forEach((color, index) => {
      const r = radius * (1 - index * 0.2)
      if (r > 1) p.circle(C + (index ? -index : 0), C - index, r, color)
    })
    for (let k = 0; k < 10 + frame * 6; k++) {
      const a = rng.next() * Math.PI * 2
      const d = radius + rng.int(-4, 6)
      const size = rng.int(2, 5)
      p.circle(C + Math.cos(a) * d, C + Math.sin(a) * d, size, rng.pick(colors.slice(0, 3)))
    }
  } else {
    // Smoke puffs with the last embers.
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2
      p.circle(C + Math.cos(a) * 24, C + Math.sin(a) * 20, 9, k % 2 ? '#6e6478' : '#8e8498')
      p.circle(C + Math.cos(a) * 24 - 2, C + Math.sin(a) * 20 - 2, 4, '#b0a8ba')
    }
    for (let k = 0; k < 8; k++)
      p.rect(rng.int(20, 76), rng.int(20, 76), 2, 2, rng.pick(['#f9a23c', '#ffe08a']))
  }
  p.outline(INK)
  return p
}

function fire(frame: number): Px {
  const p = new Px(S, S)
  const height = [24, 48, 60, 30][frame]!
  const rng = random(80 + frame)
  const tongue = (x: number, h: number, w: number, color: string) =>
    p.polygon(
      [
        [x - w, C + 26],
        [x - w * 0.6, C + 26 - h * 0.6],
        [x + rng.int(-3, 3), C + 26 - h],
        [x + w * 0.6, C + 26 - h * 0.55],
        [x + w, C + 26],
      ],
      color,
    )
  for (const [x, scale] of [
    [C - 16, 0.7],
    [C + 16, 0.75],
    [C, 1],
  ] as const) {
    tongue(x, height * scale, 12 * scale + 4, '#c2401f')
    tongue(x, height * scale * 0.85, 10 * scale + 3, '#ef6f2a')
    tongue(x, height * scale * 0.6, 7 * scale + 2, '#f9a23c')
    tongue(x, height * scale * 0.35, 4 * scale + 1, '#ffe08a')
  }
  for (let k = 0; k < 6 + frame * 2; k++)
    p.rect(rng.int(24, 72), C + 26 - rng.int(height * 0.6, height + 8), 2, 2, '#ffe08a')
  p.outline('#6a1a10')
  return p
}

function green(frame: number): Px {
  const p = new Px(S, S)
  const leafColors = [PAL.grass[2], PAL.grass[3], PAL.grass[4], PAL.grass[5]]
  const spin = frame * 0.7
  const r = [14, 24, 30, 34][frame]!
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + spin
    const x = C + Math.cos(a) * r
    const y = C + Math.sin(a) * r * 0.8
    p.ellipse(x - 5, y - 3, 10, 6, leafColors[k % 4]!)
    p.line(x - 4, y, x + 4, y, PAL.grass[1])
  }
  // Rising sparkles.
  for (let k = 0; k < 6; k++) {
    const x = 24 + k * 9
    const y = 70 - ((frame * 12 + k * 17) % 50)
    p.rect(x, y - 2, 1, 5, '#e8ffd0')
      .rect(x - 2, y, 5, 1, '#e8ffd0')
      .set(x, y, '#ffffff')
  }
  if (frame === 3)
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) if (p.get(x, y) && bayer(x, y) < 0.4) p.set(x, y, null)
  p.outline(PAL.grass[0])
  return p
}

function ice(frame: number): Px {
  const p = new Px(S, S)
  const rng = random(90)
  const shards = 9
  for (let k = 0; k < shards; k++) {
    const a = rng.next() * Math.PI * 2
    const fly = [24, 12, 4, 0][frame]!
    const d = 8 + rng.int(0, 16) + fly
    const x = C + Math.cos(a) * d
    const y = C + Math.sin(a) * d
    const len = rng.int(7, 13) * (frame === 3 ? 0.6 : 1)
    const tip: [number, number] = [x - Math.cos(a) * len, y - Math.sin(a) * len]
    const side = 3
    p.polygon(
      [
        [x + Math.sin(a) * side, y - Math.cos(a) * side],
        tip,
        [x - Math.sin(a) * side, y + Math.cos(a) * side],
        [x + Math.cos(a) * 3, y + Math.sin(a) * 3],
      ],
      PAL.ice[2],
    )
    p.line(x, y, tip[0], tip[1], PAL.ice[4])
  }
  if (frame >= 2) {
    p.circle(C, C, frame === 2 ? 12 : 16, frame === 2 ? PAL.ice[3] : null)
    if (frame === 3) for (let k = 0; k < 10; k++) p.set(rng.int(28, 68), rng.int(28, 68), '#ffffff')
  }
  p.outline(PAL.ice[0])
  return p
}

function scratch(frame: number): Px {
  const p = new Px(S, S)
  const reach = [0.35, 0.8, 1, 1][frame]!
  for (let k = 0; k < 3; k++) {
    const x0 = 30 + k * 12
    const y0 = 20
    const x1 = x0 + 22
    const y1 = 76
    const steps = 64
    for (let s = 0; s <= steps * reach; s++) {
      const t = s / steps
      const x = x0 + (x1 - x0) * t
      const y = y0 + (y1 - y0) * t
      const w = Math.sin(t * Math.PI) * 5 + 1
      p.rect(x - w / 2, y, Math.max(1, w), 1, frame === 3 ? '#f9a23c' : '#ffe08a')
      p.rect(x - w / 4, y, Math.max(1, w / 2), 1, frame === 3 ? '#ffe08a' : '#ffffff')
    }
  }
  if (frame === 3)
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) if (p.get(x, y) && bayer(x, y) < 0.5) p.set(x, y, null)
  p.outline('#7a4a10')
  return p
}

function splash(frame: number): Px {
  const p = new Px(S, S)
  const rng = random(110)
  if (frame === 0) {
    // A wave coming from the left.
    p.ellipse(10, 36, 60, 24, PAL.water[3])
      .ellipse(16, 38, 44, 14, PAL.water[4])
      .ellipse(20, 40, 24, 6, '#ffffff')
  } else {
    const r = [0, 16, 28, 36][frame]!
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2
      const d = r + rng.int(-4, 4)
      const size = Math.max(2, 6 - frame + rng.int(0, 2))
      p.circle(C + Math.cos(a) * d, C + Math.sin(a) * d, size, k % 3 ? PAL.water[3] : PAL.water[4])
      p.set(C + Math.cos(a) * d - 1, C + Math.sin(a) * d - 1, '#ffffff')
    }
    if (frame === 1) p.circle(C, C, 12, PAL.water[3]).circle(C - 3, C - 3, 5, PAL.water[5])
  }
  p.outline(PAL.water[0])
  return p
}

// Backgrounds ----------------------------------------------------------------------------------

const W = 640
const H = 360

function sky(p: Px, top: string, bottom: string, horizon: number) {
  const bands = 8
  for (let y = 0; y < horizon; y++) {
    const t = y / horizon
    const band = Math.floor(t * bands)
    const frac = t * bands - band
    const a = mix(top, bottom, band / bands)
    const b = mix(top, bottom, (band + 1) / bands)
    for (let x = 0; x < W; x++) p.set(x, y, frac > bayer(x, y) ? b : a)
  }
}

function clouds(p: Px, seed: number, y0: number, color: string, shade: string) {
  const rng = random(seed)
  for (let k = 0; k < 6; k++) {
    const x = rng.int(0, W - 120)
    const y = y0 + rng.int(-10, 30)
    const w = rng.int(70, 120)
    for (let b = 0; b < 5; b++) p.ellipse(x + b * (w / 5), y - rng.int(0, 10), w / 3, 18, color)
    p.rect(x + 4, y + 10, w, 4, shade)
  }
}

function hills(p: Px, base: number, amplitude: number, color: string, seed: number) {
  for (let x = 0; x < W; x++) {
    const h = base - amplitude * (0.5 + 0.5 * Math.sin(x / 70 + seed) * Math.sin(x / 31 + seed * 2))
    for (let y = Math.round(h); y < H; y++) p.set(x, y, color)
  }
}

function field(p: Px, from: number, colors: readonly string[], seed: number) {
  for (let y = from; y < H; y++)
    for (let x = 0; x < W; x++) {
      // Far (top) to near (bottom), dithered between the bands, gently waved by noise.
      const n = periodicNoise(x, y * 3, 40, 640, seed)
      const t = (y - from) / (H - from)
      const v = Math.max(
        0,
        Math.min(colors.length - 1.001, t * (colors.length - 1) + (n - 0.5) * 0.9),
      )
      const index = Math.floor(v)
      p.set(x, y, v - index > bayer(x, y) ? colors[index + 1]! : colors[index]!)
      if (hash(x, y, seed) < 0.01) p.set(x, y, colors[Math.max(0, index - 1)]!)
    }
}

function treeLine(
  p: Px,
  base: number,
  dark: string,
  mid: string,
  light: string,
  seed: number,
  pine = false,
) {
  const rng = random(seed)
  for (let x = -10; x < W + 10; x += rng.int(18, 30)) {
    const h = rng.int(28, 52)
    if (pine) {
      p.polygon(
        [
          [x, base - h],
          [x - 14, base],
          [x + 14, base],
        ],
        mid,
      )
      p.polygon(
        [
          [x, base - h],
          [x - 14, base],
          [x, base],
        ],
        light,
      )
      p.polygon(
        [
          [x, base - h],
          [x - 8, base - h * 0.55],
          [x + 6, base - h * 0.5],
        ],
        '#ffffff',
      )
    } else {
      p.circle(x, base - h * 0.6, h * 0.45, mid)
      p.circle(x - 4, base - h * 0.7, h * 0.25, light)
      p.rect(x - 2, base - h * 0.2, 4, h * 0.2, dark)
    }
  }
  p.rect(0, base, W, 4, dark)
}

function forest(): Px {
  const p = new Px(W, H)
  sky(p, '#5aa8e6', '#bfe6fa', 150)
  clouds(p, 3, 40, '#ffffff', '#d8eefa')
  hills(p, 150, 40, '#7fb8c8', 1)
  treeLine(p, 150, '#2c5a2e', '#3f7d34', '#5ea23e', 4)
  field(p, 154, [PAL.grass[4], PAL.grass[3], PAL.grass[3], PAL.grass[2]], 5)
  // Flowers and tufts.
  const rng = random(6)
  for (let k = 0; k < 90; k++) {
    const x = rng.int(0, W)
    const y = rng.int(170, H - 4)
    if (k % 3)
      p.set(x, y, PAL.grass[1])
        .set(x + 1, y - 1, PAL.grass[5])
        .set(x - 1, y - 1, PAL.grass[5])
    else p.set(x, y, rng.pick(['#ffffff', '#f6e05e', '#f28ab2']))
  }
  return p
}

function beach(): Px {
  const p = new Px(W, H)
  sky(p, '#4f9fe0', '#cdeefc', 130)
  clouds(p, 9, 30, '#ffffff', '#d8eefa')
  // The sea.
  for (let y = 120; y < 160; y++)
    for (let x = 0; x < W; x++)
      p.set(
        x,
        y,
        (y + Math.floor(x / 40)) % 9 === 0 ? PAL.water[4] : y < 135 ? PAL.water[2] : PAL.water[3],
      )
  for (let x = 0; x < W; x++) {
    const shore = 158 + Math.round(Math.sin(x / 40) * 3)
    for (let y = 150; y < shore + 3; y++) if (y >= shore) p.set(x, y, '#ffffff')
  }
  field(p, 162, [PAL.sand[4], PAL.sand[3], PAL.sand[3], PAL.sand[2]], 10)
  // Wind ripples and shells.
  const rng = random(11)
  for (let k = 0; k < 60; k++) {
    const x = rng.int(0, W - 20)
    const y = rng.int(175, H - 4)
    p.rect(x, y, rng.int(8, 18), 1, PAL.sand[1])
  }
  // A palm on the far right.
  for (let y = 70; y < 172; y++) {
    const x = 588 + Math.sin((y - 70) / 34) * 10
    p.rect(x, y, 9, 1, y % 7 < 3 ? '#a77a45' : '#c99a5a')
      .set(x + 8, y, '#7a5230')
      .set(x, y, '#d8b07a')
  }
  for (const [dx, dy] of [
    [-46, 14],
    [-34, -10],
    [-4, -22],
    [26, -14],
    [44, 10],
    [-16, 26],
    [18, 24],
  ] as const) {
    const length = Math.hypot(dx, dy)
    const nx = -dy / length
    const ny = dx / length
    const points: [number, number][] = []
    for (let k = 0; k <= 8; k++) {
      const t = k / 8
      const w = Math.sin(t * Math.PI) * 6
      points.push([596 + dx * t + nx * w, 68 + dy * t + t * t * 14 + ny * w])
    }
    for (let k = 8; k >= 0; k--) {
      const t = k / 8
      points.push([596 + dx * t - nx * 2, 68 + dy * t + t * t * 14 - ny * 2])
    }
    p.polygon(points, PAL.grass[3])
    p.line(596, 68, 596 + dx * 0.9, 68 + dy * 0.9 + 11, PAL.grass[1])
  }
  p.circle(593, 72, 4, '#7a4a28').circle(601, 73, 4, '#6a3e22')
  return p
}

function snowfield(): Px {
  const p = new Px(W, H)
  sky(p, '#7fb4e2', '#e4f2fb', 150)
  clouds(p, 13, 30, '#ffffff', '#e6eef8')
  hills(p, 150, 34, '#c4d8ee', 7)
  treeLine(p, 152, PAL.snow[1], '#2c7570', '#3f9a88', 14, true)
  field(p, 156, [PAL.snow[5], PAL.snow[4], PAL.snow[4], PAL.snow[3]], 15)
  const rng = random(16)
  for (let k = 0; k < 80; k++) p.set(rng.int(0, W), rng.int(0, H), '#ffffff')
  for (let k = 0; k < 30; k++)
    p.rect(rng.int(0, W - 20), rng.int(170, H - 4), rng.int(6, 16), 1, PAL.snow[2])
  return p
}

function halves(name: string, image: Px): BackgroundDrawing[] {
  return [
    { kind: 'background', name: `${name}-esquerda`, image: crop(image, 0, 0, W / 2, H) },
    { kind: 'background', name: `${name}-direita`, image: crop(image, W / 2, 0, W / 2, H) },
  ]
}

// Menu buttons, stat icons, cross, stars --------------------------------------------------------

function button(kind: 'espada' | 'escudo' | 'setas' | 'mao', lit: boolean): Px {
  const p = new Px(16, 16)
  const tone = {
    espada: ['#8a1f2a', '#c23440', '#e8606a'],
    escudo: ['#2b2a7a', '#4646b0', '#7a7ae0'],
    setas: ['#1f6a3a', '#2f9a52', '#6fd08a'],
    mao: ['#9a5a1a', '#d8902c', '#f6c45a'],
  }[kind]
  if (kind === 'espada') {
    p.line(4, 11, 12, 3, tone[1]!, 2).line(5, 10, 12, 3, tone[2]!)
    p.line(3, 8, 7, 12, '#6e4a26', 2).rect(2, 12, 3, 3, '#6e4a26')
  } else if (kind === 'escudo') {
    p.polygon(
      [
        [2, 2],
        [14, 2],
        [14, 8],
        [8, 15],
        [2, 8],
      ],
      tone[1]!,
    )
    p.polygon(
      [
        [4, 4],
        [8, 4],
        [8, 12],
        [4, 8],
      ],
      tone[2]!,
    )
  } else if (kind === 'setas') {
    p.circle(8, 8, 6, tone[1]!).circle(8, 8, 3, null)
    p.polygon(
      [
        [12, 1],
        [15, 5],
        [10, 6],
      ],
      tone[2]!,
    ).polygon(
      [
        [4, 15],
        [1, 11],
        [6, 10],
      ],
      tone[2]!,
    )
  } else {
    p.rect(3, 6, 10, 8, tone[1]!)
      .rect(3, 3, 2, 5, tone[1]!)
      .rect(6, 2, 2, 5, tone[1]!)
      .rect(9, 2, 2, 5, tone[1]!)
      .rect(12, 4, 2, 5, tone[1]!)
    p.rect(4, 7, 3, 3, tone[2]!)
  }
  if (lit) {
    p.outline('#ffffff')
    p.outline(INK)
  } else p.outline(INK)
  return p
}

function stat(kind: string): Px {
  const p = new Px(8, 8)
  switch (kind) {
    case 'vida':
      p.rect(1, 2, 2, 3, '#e23b4a')
        .rect(5, 2, 2, 3, '#e23b4a')
        .rect(1, 3, 6, 2, '#e23b4a')
        .rect(2, 5, 4, 1, '#e23b4a')
        .rect(3, 6, 2, 1, '#e23b4a')
        .set(1, 2, '#ff9aa0')
      break
    case 'energia':
      p.polygon(
        [
          [5, 0],
          [1, 5],
          [4, 5],
          [3, 8],
          [7, 3],
          [4, 3],
        ],
        '#5fd0f0',
      )
      break
    case 'ataque':
      p.line(1, 7, 7, 1, '#e8606a', 1).line(1, 5, 3, 7, '#6e4a26')
      break
    case 'defesa':
      p.polygon(
        [
          [1, 1],
          [7, 1],
          [7, 4],
          [4, 7],
          [1, 4],
        ],
        '#7a7ae0',
      ).set(2, 2, '#c0c0ff')
      break
    case 'velocidade':
      p.polygon(
        [
          [0, 3],
          [4, 3],
          [4, 1],
          [8, 4],
          [4, 7],
          [4, 5],
          [0, 5],
        ],
        '#f6c45a',
      )
      break
    case 'recuperacao':
      p.rect(3, 1, 2, 6, '#5fd06a').rect(1, 3, 6, 2, '#5fd06a').set(3, 1, '#c8ffc8')
      break
  }
  return p
}

function cross(): Px {
  const p = new Px(32, 32)
  p.line(5, 5, 27, 27, '#c2343f', 6).line(27, 5, 5, 27, '#c2343f', 6)
  p.line(5, 4, 27, 26, '#e8606a', 2).line(27, 4, 5, 26, '#e8606a', 2)
  p.outline(INK)
  return p
}

function stars(frame: number, total: number): Px {
  const p = new Px(128, 96)
  const rng = random(500)
  for (let k = 0; k < 26; k++) {
    const x = rng.int(4, 123)
    const y = rng.int(4, 91)
    const born = rng.next() * 0.6
    const life = 0.25 + rng.next() * 0.3
    const t = (frame / (total - 1) - born) / life
    if (t < 0 || t > 1) continue
    const size = Math.round(Math.sin(t * Math.PI) * 3)
    const color = t < 0.6 ? '#ffffff' : '#fff0a8'
    p.set(x, y, color)
    for (let s = 1; s <= size; s++)
      p.set(x - s, y, color)
        .set(x + s, y, color)
        .set(x, y - s, color)
        .set(x, y + s, color)
    if (size >= 2)
      p.set(x - 1, y - 1, '#cfe8ff')
        .set(x + 1, y + 1, '#cfe8ff')
        .set(x + 1, y - 1, '#cfe8ff')
        .set(x - 1, y + 1, '#cfe8ff')
  }
  return p
}

export function battleDrawings(): Drawing[] {
  const anim = (name: string, make: (frame: number) => Px) => ({
    name,
    fps: 6,
    loop: false,
    frames: [0, 1, 2, 3].map(make),
  })
  const one = (name: string, frame: Px) => ({ name, fps: 1, loop: false, frames: [frame] })
  const sprite = (
    name: string,
    width: number,
    height: number,
    animations: SpriteDrawing['animations'],
  ): SpriteDrawing => ({
    kind: 'sprite',
    name,
    frameWidth: width,
    frameHeight: height,
    animations,
  })
  return [
    sprite('ataques', S, S, [
      anim('explosao', explosion),
      anim('fogo', fire),
      anim('verde', green),
      anim('gelo', ice),
      anim('arranhao', scratch),
      anim('respingo', splash),
    ]),
    ...halves('batalha-floresta', forest()),
    ...halves('batalha-areia', beach()),
    ...halves('batalha-gelo', snowfield()),
    sprite(
      'botoes',
      16,
      16,
      (['espada', 'escudo', 'setas', 'mao'] as const).map((kind) => ({
        name: kind,
        fps: 1,
        loop: false,
        frames: [button(kind, false), button(kind, true)],
      })),
    ),
    sprite(
      'atributos',
      8,
      8,
      ['vida', 'energia', 'ataque', 'defesa', 'velocidade', 'recuperacao'].map((kind) =>
        one(kind, stat(kind)),
      ),
    ),
    sprite('cruz', 32, 32, [one('cruz', cross())]),
    sprite('estrelas', 128, 96, [
      {
        name: 'brilhar',
        fps: 20,
        loop: false,
        frames: Array.from({ length: 24 }, (_, frame) => stars(frame, 24)),
      },
    ]),
  ]
}
