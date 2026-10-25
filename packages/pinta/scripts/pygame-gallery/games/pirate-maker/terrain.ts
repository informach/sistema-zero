/**
 * The island ground as a 47-piece "blob" tileset and the animated water.
 *
 * Every cell of the editor knows which of its 8 neighbours have terrain (A on top, then clockwise:
 * B top-right, C right, D bottom-right, E bottom, F bottom-left, G left, H top-left). A corner
 * neighbour only changes the picture when both sides next to it have terrain, which leaves 47
 * different pieces (the original drew 232 files, one per combination). Each piece is drawn from
 * that neighbourhood: the distance to the empty cells decides grass, sandstone border or rock.
 */
import { Px, random } from '../../pixel'
import { P } from './palette'

const SIZE = 32
const SIDES: Record<string, string> = { B: 'AC', D: 'CE', F: 'EG', H: 'GA' }
const DIRECTIONS: Record<string, [number, number]> = {
  A: [0, -1],
  B: [1, -1],
  C: [1, 0],
  D: [1, 1],
  E: [0, 1],
  F: [-1, 1],
  G: [-1, 0],
  H: [-1, -1],
}

/** The 47 pieces in tileset order: the same list as TERRAIN_TILES in the game's settings.py. */
export const TERRAIN_TILES: string[] = (() => {
  const names: string[] = []
  for (let mask = 0; mask < 256; mask++) {
    const all = [...'ABCDEFGH'].filter((_, bit) => (mask >> bit) & 1).join('')
    const kept = [...all].filter((name) => 'ACEG'.includes(name) || [...SIDES[name]!].every((side) => all.includes(side)))
    const name = kept.join('') || 'X'
    if (!names.includes(name)) names.push(name)
  }
  return names
})()

/** The rock inside the island, the same 32×32 pattern in every piece (seamless). */
const ROCK = (() => {
  const rock = new Px(SIZE, SIZE, P.rock1)
  const rng = random(77)
  const pebbles: [number, number, number, number][] = [
    [3, 4, 6, 4],
    [18, 2, 5, 4],
    [26, 13, 6, 5],
    [9, 15, 5, 3],
    [15, 23, 7, 5],
    [2, 25, 4, 3],
    [27, 27, 4, 3],
  ]
  for (const [x, y, w, h] of pebbles)
    for (const dx of [-SIZE, 0, SIZE])
      for (const dy of [-SIZE, 0, SIZE]) {
        rock.ellipse(x + dx, y + dy + 1, w, h, P.rock0)
        rock.ellipse(x + dx, y + dy, w, h, P.rock2)
        rock.ellipse(x + dx + 1, y + dy, w - 2, Math.max(1, h - 2), P.rock2)
        rock.set(x + dx + 1, y + dy + 1, P.rock3).set(x + dx + 2, y + dy + 1, P.rock3)
      }
  rock.speckle(rng, 0.05, [P.rock0], P.rock1)
  // a few cracks
  for (const [x, y] of [[12, 8], [22, 19], [6, 20]] as const)
    rock.set(x, y, P.rock0).set(x + 1, y + 1, P.rock0).set(x + 1, y + 2, P.rock0)
  return rock
})()

/** Jagged lower edge of the grass (period 32, so neighbours meet). */
const GRASS_DEPTH = [6, 7, 6, 5, 6, 8, 7, 6, 5, 6, 7, 6, 6, 8, 6, 5, 6, 7, 8, 6, 5, 6, 6, 7, 6, 5, 7, 8, 6, 6, 5, 6]
const BORDER = 6
const RADIUS = 7

function distanceToSquare(x: number, y: number, dx: number, dy: number) {
  const left = dx * SIZE
  const top = dy * SIZE
  const ox = Math.max(left - x, 0, x - (left + SIZE))
  const oy = Math.max(top - y, 0, y - (top + SIZE))
  return Math.hypot(ox, oy)
}

/** One piece of ground for the neighbours in `name` ('X' = none). */
export function terrainTile(name: string): Px {
  const has = (side: string) => name.includes(side)
  const air = Object.entries(DIRECTIONS).filter(([side]) => !has(side))
  const tile = new Px(SIZE, SIZE)
  // convex corners: both sides of the corner are empty
  const corners = [
    { open: !has('A') && !has('G'), cx: RADIUS, cy: RADIUS, top: true },
    { open: !has('A') && !has('C'), cx: SIZE - RADIUS, cy: RADIUS, top: true },
    { open: !has('E') && !has('G'), cx: RADIUS, cy: SIZE - RADIUS, top: false },
    { open: !has('E') && !has('C'), cx: SIZE - RADIUS, cy: SIZE - RADIUS, top: false },
  ]
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const px = x + 0.5
      const py = y + 0.5
      let up = Infinity
      let other = Infinity
      let towards: [number, number] = [0, 0]
      for (const [side, [dx, dy]] of air) {
        const distance = distanceToSquare(px, py, dx, dy)
        // the empty cell above (or an empty top corner over solid sides) is where the grass grows
        const above = side === 'A' || (side === 'B' && has('C')) || (side === 'H' && has('G'))
        if (above && distance < up) up = distance
        if (!above && distance < other) other = distance
        if (distance < Math.min(up, other) + 0.001) towards = [dx, dy]
      }
      let cut = false
      for (const corner of corners) {
        if (!corner.open) continue
        const inX = corner.cx < SIZE / 2 ? px < corner.cx : px > corner.cx
        const inY = corner.cy < SIZE / 2 ? py < corner.cy : py > corner.cy
        if (!inX || !inY) continue
        const away = RADIUS - Math.hypot(px - corner.cx, py - corner.cy)
        if (away < 0) cut = true
        else if (corner.top) up = Math.min(up, away)
        else other = Math.min(other, away)
        towards = [corner.cx < SIZE / 2 ? -1 : 1, corner.top ? -1 : 1]
      }
      if (cut) continue
      const distance = Math.min(up, other)
      let color: string
      if (distance < 1) color = P.ink
      else if (up <= other + 1.5 && up < GRASS_DEPTH[x]!) {
        const depth = GRASS_DEPTH[x]!
        if (up < 2) color = (x * 7 + y) % 9 === 0 ? P.grass2 : P.grass3
        else if (up < 3.2) color = P.grass2
        else if (up < depth - 1) color = (x + y * 3) % 5 === 0 ? P.grass2 : P.grass1
        else color = P.grass0
      } else if (up <= other + 1.5 && up < GRASS_DEPTH[x]! + 1.6) color = P.stone0
      else if (distance < BORDER) {
        // a row of sandstone bricks along the edge
        const lit = towards[0] < 0 || (towards[1] < 0 && towards[0] <= 0)
        const vertical = towards[0] !== 0 && towards[1] === 0
        const along = vertical ? y : x
        const brick = vertical ? 8 : 8
        const joint = (along + (vertical ? 3 : 5)) % brick === 0
        if (distance > BORDER - 1) color = P.rock0
        else if (joint) color = P.stone0
        else if ((along + (vertical ? 3 : 5)) % brick === 1 || distance < 2) color = lit ? P.stone2 : P.stone1
        else if (distance > BORDER - 2.2) color = P.stone0
        else color = P.stone1
      } else color = ROCK.get(x, y)!
      tile.set(x, y, color)
    }
  return tile
}

/** Water surface (3 frames: the waves travel) and the deep water below a surface. */
function waterBody(water: Px, from: number, frame: number) {
  for (let y = from; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) water.set(x, y, P.water1)
  // darker streaks, the same in every frame and in the deep water (they line up)
  for (const [x, y, w] of [[3, 12, 5], [19, 17, 6], [9, 24, 4], [24, 28, 5], [14, 6, 3], [27, 8, 3]] as const)
    if (y >= from + 2) water.rect(x, y, w, 1, P.water0)
  // glints that move with the waves
  if (frame >= 0)
    for (const [x, y] of [[6, 9], [21, 13], [12, 20], [28, 23]] as const)
      if (y >= from + 2) water.rect((x + frame * 3) % SIZE, y, 2, 1, P.water2)
}

export function waterSurface(frame: number): Px {
  const water = new Px(SIZE, SIZE)
  waterBody(water, 4, frame)
  for (let x = 0; x < SIZE; x++) {
    const wave = Math.round(Math.sin(((x + frame * (SIZE / 3)) / SIZE) * Math.PI * 4) * 1.2)
    const top = 4 + wave
    for (let y = 0; y < top; y++) water.set(x, y, null)
    water.set(x, top, P.foam)
    water.set(x, top + 1, (x + frame) % 4 === 0 ? P.foam : P.water2)
    water.set(x, top + 2, P.water2)
  }
  return water
}

export function waterDeep(): Px {
  const water = new Px(SIZE, SIZE)
  waterBody(water, 0, -1)
  return water
}
