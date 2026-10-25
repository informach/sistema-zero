/**
 * Python Monsters overworld objects: trees, palms, ruins, rocks, tall grass, the buildings, the
 * animated sea and coasts, and the little shadow and "!" bubble of the characters.
 */
import type { BackgroundDrawing, Drawing, SpriteDrawing } from '../../drawing'
import { darken, Px, random } from '../../pixel'
import { INK, PAL } from './kit'
import { coastTile, type Mat, waterTile } from './terrain'

// Trees -------------------------------------------------------------------------------------

interface Leaves {
  dark: string
  mid: string
  light: string
  shine: string
}
const GREEN: Leaves = { dark: '#2c5a2e', mid: '#3f7d34', light: '#5ea23e', shine: '#8cc95a' }
const TEAL: Leaves = { dark: '#1f4f55', mid: '#2c7570', light: '#3f9a88', shine: '#7cc9ac' }
const TRUNK = { dark: '#4a2a1a', mid: '#6e4026', light: '#94603a' }

/** A leafy canopy from overlapping blobs, lit from the top-left, with leaf clusters. */
function canopy(p: Px, blobs: [number, number, number][], leaves: Leaves, seed: number) {
  const rng = random(seed)
  const mask = new Px(p.width, p.height)
  for (const [cx, cy, r] of blobs) mask.circle(cx, cy, r, '#000000')
  const box = {
    x0: Math.min(...blobs.map((b) => b[0] - b[2])),
    y0: Math.min(...blobs.map((b) => b[1] - b[2])),
  }
  const w = Math.max(...blobs.map((b) => b[0] + b[2])) - box.x0
  const h = Math.max(...blobs.map((b) => b[1] + b[2])) - box.y0
  for (let y = 0; y < p.height; y++)
    for (let x = 0; x < p.width; x++) {
      if (!mask.get(x, y)) continue
      // Distance to the closest blob edge gives each blob its own round shading.
      let best = -Infinity
      let shade = 0
      for (const [cx, cy, r] of blobs) {
        const d = r - Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
        if (d > best) {
          best = d
          shade = (x - cx + (y - cy)) / r
        }
      }
      const global = (x - box.x0) / w + (y - box.y0) / h
      const t = shade * 0.75 + (global - 1) * 0.6
      p.set(
        x,
        y,
        t < -0.75 ? leaves.shine : t < -0.2 ? leaves.light : t < 0.45 ? leaves.mid : leaves.dark,
      )
    }
  // Leaf clusters: small light arcs on the lit side, dark notches on the shade.
  for (let k = 0; k < (w * h) / 22; k++) {
    const x = box.x0 + rng.int(1, w - 2)
    const y = box.y0 + rng.int(1, h - 2)
    const here = p.get(x, y)
    if (!here || !mask.get(x, y - 1)) continue
    if (here === leaves.light || here === leaves.shine)
      p.set(x, y, leaves.shine).set(x - 1, y + 1, leaves.mid)
    else if (here === leaves.mid) p.set(x, y, leaves.dark).set(x + 1, y, leaves.dark)
  }
}

function trunk(p: Px, cx: number, top: number, bottom: number, width: number) {
  p.rect(cx - width / 2, top, width, bottom - top, TRUNK.mid)
  p.rect(cx - width / 2, top, 1, bottom - top, TRUNK.light)
  p.rect(cx + width / 2 - 2, top, 2, bottom - top, TRUNK.dark)
  for (let y = top + 3; y < bottom; y += 5) p.set(cx - 1, y, TRUNK.dark).set(cx, y + 2, TRUNK.light)
  // Roots.
  p.rect(cx - width / 2 - 2, bottom - 3, 3, 3, TRUNK.mid).rect(
    cx + width / 2 - 1,
    bottom - 3,
    3,
    3,
    TRUNK.dark,
  )
  p.rect(cx - width / 2 - 2, bottom - 1, width + 4, 1, TRUNK.dark)
}

/** A soft ground shadow under trees (drawn before everything, no outline). */
function groundShadow(p: Px, cx: number, y: number, w: number, color: string) {
  p.ellipse(cx - w / 2, y - 4, w, 9, color)
}

function roundTree(leaves: Leaves, bushy: boolean, seed: number): Px {
  const p = new Px(64, 96)
  trunk(p, 32, 58, 90, 10)
  const blobs: [number, number, number][] = bushy
    ? [
        [32, 24, 17],
        [16, 38, 14],
        [48, 38, 14],
        [22, 54, 13],
        [42, 54, 13],
        [32, 46, 15],
      ]
    : [
        [32, 28, 20],
        [17, 44, 14],
        [47, 44, 14],
        [32, 52, 16],
      ]
  canopy(p, blobs, leaves, seed)
  if (bushy) {
    // Fruits.
    const rng = random(seed + 9)
    for (let k = 0; k < 5; k++) {
      const x = rng.int(14, 50)
      const y = rng.int(20, 58)
      if (p.get(x, y) && p.get(x + 1, y + 1))
        p.set(x, y, '#e8584f')
          .set(x + 1, y, '#e8584f')
          .set(x, y + 1, '#a8323f')
          .set(x + 1, y + 1, '#a8323f')
          .set(x, y, '#ffb3a1')
    }
  }
  p.outline(INK)
  return withShadow(p, 32, 91, 46, '#3a6e33')
}

/** The ground shadow goes under the outlined drawing (the outline must not ring it). */
function withShadow(p: Px, cx: number, y: number, w: number, color: string) {
  const out = new Px(p.width, p.height)
  groundShadow(out, cx, y, w, color)
  out.draw(p)
  return out
}

function pine(): Px {
  const p = new Px(64, 96)
  trunk(p, 32, 64, 90, 8)
  const tiers = [
    [14, 34, 13],
    [28, 50, 19],
    [44, 68, 26],
  ] as const
  const ice = PAL.snow
  for (const [top, bottom, half] of tiers) {
    p.polygon(
      [
        [32, top - 6],
        [32 - half, bottom],
        [32 + half, bottom],
      ],
      TEAL.mid,
    )
    p.polygon(
      [
        [32, top - 6],
        [32 - half, bottom],
        [30, bottom],
      ],
      TEAL.light,
    )
    p.polygon(
      [
        [34, top],
        [32 + half, bottom],
        [36, bottom],
      ],
      TEAL.dark,
    )
    // Snow on the tier.
    p.polygon(
      [
        [32, top - 6],
        [32 - half * 0.7, bottom - 6],
        [32 - half * 0.2, bottom - 9],
        [32 + half * 0.3, bottom - 5],
        [32 + half * 0.65, bottom - 7],
      ],
      ice[4],
    )
    p.polygon(
      [
        [32, top - 6],
        [32 - half * 0.7, bottom - 6],
        [32 - half * 0.3, bottom - 8],
      ],
      ice[5],
    )
    p.rect(32 - half * 0.5, bottom - 6, half * 0.4, 2, ice[2])
  }
  p.polygon(
    [
      [32, 2],
      [28, 9],
      [36, 9],
    ],
    ice[5],
  )
  p.outline(INK)
  return withShadow(p, 32, 91, 44, '#a6c4e2')
}

function palm(lean: number, small = false): Px {
  const w = small ? 32 : 64
  const h = small ? 64 : 96
  const p = new Px(w, h)
  const s = small ? 0.55 : 1
  const base = [w / 2, h - 3]
  const top = [w / 2 + lean * 10 * s, h - 66 * s]
  // A segmented, curved trunk.
  for (let t = 0; t <= 1; t += 0.02) {
    const x = base[0]! + (top[0]! - base[0]!) * t + Math.sin(t * Math.PI) * lean * 6 * s
    const y = base[1]! + (top[1]! - base[1]!) * t
    const width = (small ? 4 : 7) - t * 2
    p.rect(x - width / 2, y, width, 2, Math.floor(t * 18) % 2 ? '#a77a45' : '#c99a5a')
    p.set(x + width / 2 - 1, y, '#7a5230')
  }
  // Fronds.
  const [cx, cy] = top as [number, number]
  const fronds: [number, number][] = [
    [-1, 0.15],
    [-0.7, -0.55],
    [0, -0.85],
    [0.7, -0.5],
    [1, 0.2],
    [-0.35, 0.65],
    [0.4, 0.6],
  ]
  for (const [dx, dy] of fronds) {
    const length = 26 * s
    for (let k = 0; k <= length; k++) {
      const t = k / length
      const x = cx + dx * length * t
      const y = cy + dy * length * t + t * t * 10 * s
      const thick = Math.max(1, Math.round((1 - Math.abs(t - 0.4) * 1.4) * 5 * s))
      p.rect(x - thick / 2, y - thick / 2, thick, thick, t < 0.5 ? GREEN.light : GREEN.mid)
      p.set(x, y - thick / 2, GREEN.shine)
      if (k % 3 === 0) p.set(x, y + thick / 2, GREEN.dark)
    }
  }
  // Coconuts.
  p.circle(cx - 2, cy + 3, 2.2 * s + 0.5, '#7a4a28')
    .circle(cx + 3, cy + 4, 2.2 * s + 0.5, '#6a3e22')
    .set(cx - 3, cy + 2, '#b07a48')
  p.outline(INK)
  return withShadow(p, w / 2 + lean * 3 * s, h - 2, 30 * s, '#c88e50')
}

function smallTree(leaves: Leaves): Px {
  const p = new Px(32, 64)
  trunk(p, 16, 38, 61, 6)
  canopy(
    p,
    [
      [16, 22, 12],
      [9, 34, 9],
      [23, 34, 9],
      [16, 38, 10],
    ],
    leaves,
    5,
  )
  p.outline(INK)
  return withShadow(p, 16, 61, 24, '#3a6e33')
}

// Ruins, gate, rocks, tall grass --------------------------------------------------------------

const MARBLE = ['#5b5f73', '#8a8fa6', '#b9bfd1', '#dfe3ee', '#f6f7fb']

function column(height: number, broken: 'none' | 'top' | 'slant'): Px {
  const p = new Px(32, 96)
  const x0 = 7
  const width = 18
  const bottom = height - 2
  // Base and capital.
  p.rect(x0 - 3, bottom - 8, width + 6, 8, MARBLE[2]!)
    .rect(x0 - 3, bottom - 8, width + 6, 2, MARBLE[3]!)
    .rect(x0 - 3, bottom - 2, width + 6, 2, MARBLE[1]!)
  const shaftTop = broken === 'none' ? 12 : 4
  p.rect(x0, shaftTop, width, bottom - 8 - shaftTop, MARBLE[3]!)
  for (let x = x0 + 2; x < x0 + width; x += 4)
    p.rect(x, shaftTop, 1, bottom - 8 - shaftTop, MARBLE[2]!)
  p.rect(x0, shaftTop, 3, bottom - 8 - shaftTop, MARBLE[4]!).rect(
    x0 + width - 3,
    shaftTop,
    3,
    bottom - 8 - shaftTop,
    MARBLE[1]!,
  )
  if (broken === 'none')
    p.rect(x0 - 3, 4, width + 6, 8, MARBLE[2]!)
      .rect(x0 - 3, 4, width + 6, 2, MARBLE[4]!)
      .rect(x0 - 3, 10, width + 6, 2, MARBLE[1]!)
  else {
    const jag = broken === 'top' ? [0, 3, 1, 5, 2, 4, 1, 3, 0] : [0, 1, 3, 4, 6, 7, 9, 10, 12]
    for (let k = 0; k < width; k++)
      p.rect(x0 + k, shaftTop, 1, jag[Math.floor((k / width) * jag.length)]!, null)
    // Cracks and a fallen chip.
    p.line(x0 + 5, shaftTop + 10, x0 + 8, shaftTop + 16, MARBLE[1]!).line(
      x0 + 8,
      shaftTop + 16,
      x0 + 6,
      shaftTop + 22,
      MARBLE[1]!,
    )
  }
  // Moss.
  const rng = random(height)
  for (let k = 0; k < 6; k++)
    p.tint(x0 + rng.int(0, width - 1), bottom - 9 - rng.int(0, 6), GREEN.light)
  p.outline(INK)
  return p
}

function gateArch(): Px {
  const p = new Px(116, 40)
  p.rect(2, 8, 112, 16, MARBLE[3]!)
  p.rect(2, 8, 112, 3, MARBLE[4]!).rect(2, 21, 112, 3, MARBLE[1]!)
  p.rect(0, 2, 116, 7, MARBLE[2]!).rect(0, 2, 116, 2, MARBLE[4]!)
  for (let x = 8; x < 110; x += 12) p.rect(x, 12, 6, 7, MARBLE[2]!).rect(x, 12, 6, 1, MARBLE[1]!)
  // The sun emblem in the middle.
  p.circle(58, 16, 9, '#f2c14e').circle(58, 16, 6, '#ffe28a').circle(56, 14, 2, '#fff6cf')
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2
    p.set(58 + Math.cos(a) * 11, 16 + Math.sin(a) * 11, '#d9902f')
  }
  p.rect(6, 24, 10, 14, MARBLE[3]!)
    .rect(100, 24, 10, 14, MARBLE[3]!)
    .rect(6, 24, 2, 14, MARBLE[4]!)
    .rect(108, 24, 2, 14, MARBLE[1]!)
  p.outline(INK)
  return p
}

function rock(width: number, ramp: readonly string[], seed: number, snow = false): Px {
  const p = new Px(30, 30)
  const rng = random(seed)
  const points: [number, number][] = []
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2
    const r = 0.8 + rng.next() * 0.2
    points.push([width / 2 + Math.cos(a) * (width / 2 - 2) * r, 17 + Math.sin(a) * 11 * r])
  }
  p.polygon(points, ramp[2]!)
  for (let y = 0; y < 30; y++)
    for (let x = 0; x < 30; x++) {
      if (!p.get(x, y)) continue
      const t = (x - width / 2) / width + (y - 16) / 22
      p.set(x, y, t < -0.35 ? ramp[4]! : t < 0 ? ramp[3]! : t > 0.38 ? ramp[1]! : ramp[2]!)
    }
  p.line(width / 2 - 3, 12, width / 2 + 2, 19, ramp[1]!).line(
    width / 2 + 2,
    19,
    width / 2 + 1,
    24,
    ramp[1]!,
  )
  if (snow)
    p.ellipse(width / 2 - 8, 6, 14, 6, PAL.snow[5]).ellipse(width / 2 - 6, 9, 10, 3, PAL.snow[3])
  else p.set(width / 2 - 5, 11, ramp[4]!).set(width / 2 - 4, 11, '#ffffff')
  p.outline(INK)
  return p
}

function tallGrass(blades: readonly string[], seed: number, frost = false): Px {
  const p = new Px(32, 32)
  const rng = random(seed)
  // Three rows of blades, back to front: the back ones taller and darker.
  for (let row = 0; row < 3; row++) {
    const base = 18 + row * 6
    for (let x = 1 + row; x < 31; x += 3) {
      const height = rng.int(9, 14) - row
      const lean = rng.int(-2, 2)
      for (let y = 0; y < height; y++) {
        const px = x + Math.round((lean * y * y) / (height * height))
        const t = y / height
        const color =
          t > 0.75 ? blades[3]! : t > 0.4 ? blades[2]! : row === 2 ? blades[2]! : blades[1]!
        p.set(px, base - y, color)
        if (y < height - 3) p.set(px + 1, base - y, row === 0 ? blades[0]! : blades[1]!)
      }
    }
  }
  if (frost) for (let k = 0; k < 22; k++) p.tint(rng.int(1, 30), rng.int(6, 28), '#ffffff')
  p.outline(blades[0] === GREEN.dark ? '#1c3a20' : darken(blades[0]!, 0.35))
  return p
}

// Buildings ---------------------------------------------------------------------------------

function windowAt(p: Px, x: number, y: number, w: number, h: number) {
  p.rect(x - 1, y - 1, w + 2, h + 2, '#5a4636')
  p.rect(x, y, w, h, '#7cc6ec')
    .rect(x, y, w, 2, '#c8ecff')
    .rect(x + w / 2 - 0.5, y, 1, h, '#5a4636')
    .rect(x, y + h / 2, w, 1, '#5a4636')
  p.rect(x - 2, y + h + 1, w + 4, 2, '#e8dccb')
}

/** A house seen from the front and above: a shingled roof, walls, windows and a door at `door`. */
function house(
  width: number,
  height: number,
  roof: readonly string[],
  wall: readonly string[],
  door: number,
  seed: number,
): Px {
  const p = new Px(width, height)
  const margin = Math.round(width * 0.08)
  const roofTop = Math.round(height * 0.16)
  const roofBottom = Math.round(height * 0.58)
  const wallTop = roofBottom - 2
  const wallBottom = height - 6
  // Walls with planks and wooden corner posts.
  p.rect(margin, wallTop, width - margin * 2, wallBottom - wallTop, wall[2]!)
  for (let y = wallTop + 5; y < wallBottom; y += 6)
    p.rect(margin, y, width - margin * 2, 1, wall[1]!)
  for (const x of [margin, width - margin - 5])
    p.rect(x, wallTop, 5, wallBottom - wallTop, '#7a4a2a').rect(
      x,
      wallTop,
      1,
      wallBottom - wallTop,
      '#a8683a',
    )
  p.rect(margin - 3, wallBottom, width - margin * 2 + 6, 4, '#8a7b6e').rect(
    margin - 3,
    wallBottom,
    width - margin * 2 + 6,
    1,
    '#b6a898',
  )
  // The roof: a wide slope seen from above, with rows of shingles.
  const left = margin - 7
  const right = width - margin + 7
  p.polygon(
    [
      [left, roofBottom],
      [margin + 2, roofTop],
      [width - margin - 2, roofTop],
      [right, roofBottom],
    ],
    roof[2]!,
  )
  for (let y = roofTop + 5; y < roofBottom; y += 6) {
    const t = (y - roofTop) / (roofBottom - roofTop)
    const x0 = margin + 2 - (margin + 2 - left) * t
    const x1 = width - margin - 2 + (right - width + margin + 2) * t
    p.line(x0, y, x1, y, roof[1]!)
    for (let x = x0 + ((y / 6) % 2 ? 4 : 0); x < x1 - 2; x += 8) p.line(x, y - 4, x, y, roof[1]!)
  }
  // Light from the left: the left third is lighter, a lit ridge on top.
  for (let y = roofTop; y < roofBottom; y++)
    for (let x = 0; x < width * 0.36; x++) if (p.get(x, y) === roof[2]) p.set(x, y, roof[3]!)
  p.rect(margin + 2, roofTop, width - margin * 2 - 4, 3, roof[4]!)
  p.rect(left, roofBottom, right - left, 3, roof[0]!)
  // Chimney.
  const cx = Math.round(width * 0.7)
  p.rect(cx, roofTop - 8, 11, 18, '#9b5a44')
    .rect(cx, roofTop - 8, 11, 3, '#c07a5c')
    .rect(cx + 8, roofTop - 5, 3, 15, '#6e3a2c')
  // Windows and the door.
  const winY = wallTop + 9
  windowAt(p, margin + 12, winY, 16, 14)
  windowAt(p, width - margin - 30, winY, 16, 14)
  const doorW = 22
  const doorX = door - doorW / 2
  p.rect(doorX - 2, wallBottom - 30, doorW + 4, 30, '#5a3a26')
  p.rect(doorX, wallBottom - 28, doorW, 28, '#a8683a').rect(
    doorX,
    wallBottom - 28,
    doorW,
    2,
    '#c98a50',
  )
  p.rect(doorX + doorW / 2 - 0.5, wallBottom - 26, 1, 24, '#7a4a28').set(
    doorX + doorW - 5,
    wallBottom - 14,
    '#f2d06b',
  )
  p.rect(doorX - 5, wallBottom, doorW + 10, 4, '#c9b9a6')
  const rng = random(seed)
  for (let k = 0; k < 14; k++)
    p.tint(rng.int(margin + 5, width - margin - 6), rng.int(wallTop + 2, wallBottom - 2), wall[1]!)
  p.outline(INK)
  return p
}

function hospital(): Px {
  const p = new Px(192, 192)
  const roof = ['#7c1f2b', '#a5293a', '#cf3b47', '#e8606a', '#f6a0a5']
  const wall = ['#b3aeb9', '#d9d4dd', '#f2eef3', '#ffffff']
  const wallTop = 86
  p.rect(14, wallTop, 164, 102, wall[2]!)
  for (let y = wallTop + 8; y < 188; y += 8) p.rect(14, y, 164, 1, wall[1]!)
  p.rect(14, wallTop, 4, 102, wall[3]!).rect(174, wallTop, 4, 102, wall[0]!)
  // A rounded red roof.
  p.polygon(
    [
      [4, 92],
      [26, 22],
      [166, 22],
      [188, 92],
    ],
    roof[2]!,
  )
  p.polygon(
    [
      [4, 92],
      [26, 22],
      [96, 22],
      [96, 92],
    ],
    roof[3]!,
  )
  for (let y = 28; y < 92; y += 8) p.rect(4, y, 184, 1, roof[1]!).tint(4, y, roof[1]!)
  p.rect(0, 90, 192, 5, roof[0]!)
  p.rect(22, 20, 148, 4, roof[4]!)
  // The cross sign.
  p.circle(96, 54, 20, '#ffffff').circle(96, 54, 18, '#f7f3f8')
  p.rect(90, 40, 12, 28, '#e23b4a').rect(82, 48, 28, 12, '#e23b4a').rect(90, 40, 3, 28, '#ff7b84')
  // Windows and the sliding door (bottom centre).
  for (const x of [26, 52, 128, 154]) windowAt(p, x, 106, 16, 18)
  p.rect(66, 132, 60, 56, '#5d6a7c')
  p.rect(70, 136, 25, 48, '#8fd3f2').rect(97, 136, 25, 48, '#8fd3f2')
  p.rect(70, 136, 25, 3, '#d8f3ff')
    .rect(97, 136, 25, 3, '#d8f3ff')
    .rect(73, 142, 3, 30, '#d8f3ff')
    .rect(100, 142, 3, 30, '#d8f3ff')
  p.rect(60, 124, 72, 8, roof[2]!).rect(60, 124, 72, 2, roof[4]!)
  p.rect(62, 186, 68, 4, '#cfc6d6')
  p.outline(INK)
  return p
}

function temple(element: 'fogo' | 'planta' | 'agua'): Px {
  const p = new Px(224, 224)
  const tone = {
    fogo: ['#7a2b1c', '#b8432a', '#e8703a', '#f8a85e', '#ffe0a0'],
    planta: ['#24502c', '#367a3a', '#4fa24a', '#86cf6a', '#d6f5a8'],
    agua: ['#183f7a', '#2560a8', '#3b8ad6', '#79bdf0', '#d2efff'],
  }[element]
  const stone = ['#3f3d55', '#5f5d7a', '#8381a3', '#adabc9', '#dcdaf0']
  // An octagonal hall with a glass dome.
  const oct = (cx: number, cy: number, r: number): [number, number][] =>
    Array.from({ length: 8 }, (_, k) => [
      cx + Math.cos(((k + 0.5) / 8) * Math.PI * 2) * r,
      cy + Math.sin(((k + 0.5) / 8) * Math.PI * 2) * r * 0.62,
    ])
  p.polygon(oct(112, 150, 104), stone[1]!)
  p.polygon(oct(112, 146, 100), stone[2]!)
  p.rect(18, 150, 188, 64, stone[2]!)
  p.polygon(oct(112, 92, 104), stone[3]!)
  p.polygon(oct(112, 92, 88), tone[1]!)
  p.polygon(oct(112, 88, 70), tone[2]!)
  p.polygon(oct(112, 84, 44), stone[4]!)
  p.polygon(oct(112, 84, 38), '#8fe3ff')
  p.ellipse(92, 66, 18, 8, '#e6fbff')
  // Columns along the front.
  for (const x of [28, 60, 146, 178]) {
    p.rect(x, 140, 14, 72, stone[3]!)
      .rect(x, 140, 3, 72, stone[4]!)
      .rect(x + 11, 140, 3, 72, stone[1]!)
    p.rect(x - 3, 136, 20, 6, stone[4]!).rect(x - 3, 208, 20, 6, stone[1]!)
  }
  // The element emblem over the door.
  p.circle(112, 140, 18, stone[4]!).circle(112, 140, 15, tone[1]!)
  if (element === 'fogo') {
    p.polygon(
      [
        [112, 126],
        [102, 146],
        [112, 152],
        [122, 146],
      ],
      tone[3]!,
    )
    p.polygon(
      [
        [112, 134],
        [107, 147],
        [112, 150],
        [117, 147],
      ],
      tone[4]!,
    )
  } else if (element === 'planta') {
    p.ellipse(103, 130, 18, 22, tone[3]!)
      .line(104, 151, 120, 131, tone[0]!)
      .line(108, 146, 112, 140, tone[4]!)
  } else {
    p.polygon(
      [
        [112, 125],
        [102, 143],
        [112, 153],
        [122, 143],
      ],
      tone[3]!,
    )
    p.circle(112, 144, 8, tone[3]!).circle(109, 142, 2, tone[4]!)
  }
  // The door (bottom centre, where the transition is).
  p.rect(96, 168, 32, 52, stone[0]!)
  p.rect(99, 172, 26, 48, tone[0]!).rect(99, 172, 26, 4, tone[2]!).rect(111, 176, 2, 44, stone[0]!)
  p.rect(90, 216, 44, 6, stone[3]!).rect(90, 216, 44, 2, stone[4]!)
  for (let y = 150; y < 214; y += 9) p.rect(18, y, 10, 1, stone[1]!).rect(196, y, 10, 1, stone[1]!)
  p.outline(INK)
  return p
}

// Water, coasts, shadow, notice ---------------------------------------------------------------

const SIDES: Record<string, string> = {
  topleft: 'cima-esquerda',
  top: 'cima',
  topright: 'cima-direita',
  left: 'esquerda',
  right: 'direita',
  bottomleft: 'baixo-esquerda',
  bottom: 'baixo',
  bottomright: 'baixo-direita',
}
/** Original coast terrains → the Pinta drawing; `island` = land in the middle of the water. */
export const COASTS: Record<string, { drawing: string; land: Mat; island: boolean }> = {
  grass: { drawing: 'costa-grama', land: 'G', island: false },
  grass_i: { drawing: 'costa-ilha-grama', land: 'G', island: true },
  sand: { drawing: 'costa-areia', land: 'S', island: false },
  sand_i: { drawing: 'costa-ilha-areia', land: 'S', island: true },
}

function coastSprite(name: string, land: Mat, island: boolean): SpriteDrawing {
  const animations = Object.entries(SIDES).map(([side, label]) => {
    let sides = ''
    let pockets: ('TL' | 'TR' | 'BR' | 'BL')[] = []
    if (!island)
      sides = side
        .replace('top', 'T')
        .replace('bottom', 'B')
        .replace('left', 'L')
        .replace('right', 'R')
    else {
      const opposite: Record<string, string> = { top: 'B', bottom: 'T', left: 'R', right: 'L' }
      if (side in opposite) sides = opposite[side]!
      else {
        const v = side.startsWith('top') ? 'B' : 'T'
        const h = side.endsWith('left') ? 'R' : 'L'
        pockets = [`${v}${h}` as 'BR']
      }
    }
    return {
      name: label,
      fps: 6,
      loop: true,
      frames: [0, 1, 2, 3].map((frame) => coastTile(land, sides, pockets, frame)),
    }
  })
  return { kind: 'sprite', name, frameWidth: 32, frameHeight: 32, animations }
}

function notice(): Px {
  const p = new Px(50, 50)
  p.ellipse(5, 3, 40, 36, '#ffffff')
  p.polygon(
    [
      [20, 34],
      [25, 47],
      [30, 34],
    ],
    '#ffffff',
  )
  p.rect(22, 9, 6, 17, '#e23b4a').rect(22, 29, 6, 6, '#e23b4a').rect(22, 9, 2, 17, '#ff8a92')
  p.ellipse(8, 5, 12, 6, '#ffffff')
  p.rim(null, '#d6dbe6')
  p.outline(INK)
  return p
}

function shadow(): Px {
  const p = new Px(26, 10)
  p.ellipse(0, 0, 26, 10, '#2a3a2e')
  p.ellipse(3, 2, 20, 6, '#33473a')
  return p
}

export function objectDrawings(): Drawing[] {
  const one = (name: string, frame: Px) => ({ name, fps: 1, loop: false, frames: [frame] })
  const sprite = (
    name: string,
    width: number,
    height: number,
    animations: ReturnType<typeof one>[],
  ): SpriteDrawing => ({
    kind: 'sprite',
    name,
    frameWidth: width,
    frameHeight: height,
    animations,
  })
  const background = (name: string, image: Px): BackgroundDrawing => ({
    kind: 'background',
    name,
    image,
  })
  return [
    sprite('arvores', 64, 96, [
      one('verde', roundTree(GREEN, false, 3)),
      one('verde-cheia', roundTree(GREEN, true, 4)),
      one('azulada', roundTree(TEAL, false, 5)),
      one('azulada-cheia', roundTree(TEAL, true, 6)),
      one('pinheiro-nevado', pine()),
      one('palmeira', palm(1)),
      one('palmeira-curva', palm(-1)),
    ]),
    sprite('plantas-pequenas', 32, 64, [
      one('arvore-verde', smallTree(GREEN)),
      one('arvore-azulada', smallTree(TEAL)),
      one('palmeira', palm(1, true)),
    ]),
    sprite('ruinas', 32, 96, [
      one('coluna', column(96, 'none')),
      one('coluna-quebrada', column(52, 'top')),
      one('coluna-partida', column(64, 'slant')),
      one('pilar-do-portao', column(64, 'none')),
    ]),
    sprite('portao', 116, 40, [one('arco', gateArch())]),
    sprite('pedras', 30, 30, [
      one('grama', rock(30, PAL.rock, 1)),
      one('grama-2', rock(28, PAL.rock, 2)),
      one(
        'areia',
        rock(
          30,
          PAL.sand.map((c) => darken(c, 0.25)),
          3,
        ),
      ),
      one(
        'areia-2',
        rock(
          28,
          PAL.sand.map((c) => darken(c, 0.25)),
          4,
        ),
      ),
      one('gelo', rock(30, MARBLE, 5, true)),
      one('gelo-2', rock(28, MARBLE, 6, true)),
    ]),
    sprite('mato', 32, 32, [
      one('grama', tallGrass([GREEN.dark, GREEN.mid, GREEN.light, GREEN.shine], 1)),
      one('gelo', tallGrass([TEAL.dark, TEAL.mid, TEAL.light, '#e6fbff'], 2, true)),
      one('areia', tallGrass(['#7a5a2a', '#a8803a', '#cfa64e', '#f0d488'], 3)),
    ]),
    background('predio-hospital', hospital()),
    background(
      'casa-verde',
      house(
        160,
        160,
        ['#1f4a3a', '#2c6a4e', '#3f8f63', '#5fb37c', '#9fdcae'],
        ['#8a6a4a', '#b8916a', '#e2c69e', '#f4e2c2'],
        48,
        1,
      ),
    ),
    background(
      'casa-roxa',
      house(
        160,
        160,
        ['#2e2457', '#43377e', '#5d4fa8', '#8073c8', '#b8adf0'],
        ['#8a6a4a', '#b8916a', '#e2c69e', '#f4e2c2'],
        48,
        2,
      ),
    ),
    background(
      'casa-grande',
      house(
        224,
        224,
        ['#5a2a1c', '#7a3b26', '#a4543a', '#c97a58', '#eab096'],
        ['#7a7e8e', '#a8acbb', '#d2d6e2', '#f0f2f8'],
        112,
        3,
      ),
    ),
    background('templo-fogo', temple('fogo')),
    background('templo-planta', temple('planta')),
    background('templo-agua', temple('agua')),
    {
      kind: 'sprite',
      name: 'ondas',
      frameWidth: 32,
      frameHeight: 32,
      animations: [{ name: 'ondas', fps: 6, loop: true, frames: [0, 1, 2, 3].map(waterTile) }],
    },
    ...Object.values(COASTS).map((coast) => coastSprite(coast.drawing, coast.land, coast.island)),
    sprite('sombra', 26, 10, [one('sombra', shadow())]),
    sprite('aviso', 50, 50, [one('aviso', notice())]),
  ]
}
