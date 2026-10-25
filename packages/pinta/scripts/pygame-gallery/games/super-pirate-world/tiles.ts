/**
 * Super Pirate World tiles, drawn from their keys ("material:NESW/corners", see maps.ts): a
 * side whose bit is 0 is exposed (the block ends there) and gets the rim of its material; a
 * corner bit 0 is an inner corner. 32 px pieces (64 px in the game).
 */
import type { TilesetDrawing } from '../../drawing'
import { mix, Px, type Random, random } from '../../pixel'
import { TILE_KEYS, type TilesetKey } from './maps'
import {
  BRICK,
  COPPER,
  EARTH,
  GRASS,
  INK,
  INSIDE,
  SEA,
  STEEL,
  STONE,
  TRIM,
  VOID,
  WALL,
  WOOD,
} from './palette'

const T = 32

interface Sides {
  n: boolean
  e: boolean
  s: boolean
  w: boolean
  /** Inner corners: true when that diagonal is open. */
  ne: boolean
  se: boolean
  sw: boolean
  nw: boolean
}

function parse(key: string): { material: string; sides: Sides } {
  const [material, code = '1111/1111'] = key.split(':') as [string, string?]
  const [edges, corners = '1111'] = code.split('/') as [string, string?]
  const bit = (text: string, index: number) => text[index] === '1'
  return {
    material,
    sides: {
      n: !bit(edges, 0),
      e: !bit(edges, 1),
      s: !bit(edges, 2),
      w: !bit(edges, 3),
      ne: !bit(corners, 0) && bit(edges, 0) && bit(edges, 1),
      se: !bit(corners, 1) && bit(edges, 1) && bit(edges, 2),
      sw: !bit(corners, 2) && bit(edges, 2) && bit(edges, 3),
      nw: !bit(corners, 3) && bit(edges, 3) && bit(edges, 0),
    },
  }
}

function seedOf(key: string) {
  let hash = 2166136261
  for (const char of key) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return hash >>> 0
}

/** Cut rounded corners where two exposed sides meet (radius r). */
function roundCorners(p: Px, s: Sides, r: number) {
  const corners: [boolean, number, number][] = [
    [s.n && s.w, 0, 0],
    [s.n && s.e, T - 1, 0],
    [s.s && s.e, T - 1, T - 1],
    [s.s && s.w, 0, T - 1],
  ]
  for (const [on, cx, cy] of corners) {
    if (!on) continue
    for (let y = 0; y < r; y++)
      for (let x = 0; x < r; x++) {
        const dx = r - x - 0.5
        const dy = r - y - 0.5
        if (dx * dx + dy * dy > r * r)
          p.set(cx === 0 ? x : T - 1 - x, cy === 0 ? y : T - 1 - y, null)
      }
  }
}

/** An outline on the exposed silhouette: painted pixels touching the tile border or a hole. */
function inkEdges(p: Px, s: Sides, color = INK) {
  const open = (x: number, y: number) => {
    if (x < 0) return s.w
    if (x >= T) return s.e
    if (y < 0) return s.n
    if (y >= T) return s.s
    return p.get(x, y) === null
  }
  const marks: [number, number][] = []
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++)
      if (
        p.get(x, y) !== null &&
        (open(x - 1, y) || open(x + 1, y) || open(x, y - 1) || open(x, y + 1))
      )
        marks.push([x, y])
  for (const [x, y] of marks) p.set(x, y, color)
}

/** A cobblestone with light from the top-left. */
function stone(p: Px, x: number, y: number, w: number, h: number, rng: Random, palette = STONE) {
  const base = rng.pick([palette.base, palette.base, mix(palette.base, palette.dark, 0.25)])
  const shape = new Px(w, h)
  shape.ellipse(0, 0, w, h, base)
  shape.rim(palette.light, palette.dark)
  shape.set(1, 1, palette.shine)
  for (let yy = 0; yy < h; yy++)
    for (let xx = 0; xx < w; xx++) {
      const color = shape.get(xx, yy)
      if (color && p.get(x + xx, y + yy) !== null) p.set(x + xx, y + yy, color)
    }
}

/** Staggered rows of stones along one side (rows 1 or 2). */
function stoneBand(p: Px, side: 'n' | 'e' | 's' | 'w', rows: number, rng: Random) {
  for (let row = 0; row < rows; row++) {
    const thick = row === 0 ? 5 : 4
    const depth = row === 0 ? 0 : 5
    for (let a = row === 0 ? 0 : -4; a < T; a += 8) {
      if (row > 0 && rng.chance(0.3)) continue
      const b = side === 'n' || side === 'w' ? depth : T - depth - thick
      if (side === 'n' || side === 's') stone(p, a, b, 7, thick, rng)
      else stone(p, b, a, thick, 7, rng)
    }
  }
}

// ---- island ground (outside) ------------------------------------------------------------

function grassTop(p: Px, rng: Random, from = 0, to = T) {
  // Turf along the top: light blades, a body and hanging tufts.
  for (let x = from; x < to; x++) {
    const hang = 5 + ((x * 7 + 3) % 5 === 0 ? 3 : 0) + ((x * 3) % 7 === 0 ? 1 : 0)
    for (let y = 0; y < hang; y++) {
      const color =
        y === 0
          ? INK
          : y === 1
            ? GRASS.shine
            : y < 3
              ? GRASS.light
              : y < hang - 1
                ? GRASS.base
                : GRASS.dark
      if (p.get(x, y) !== null) p.set(x, y, color)
    }
    if (rng.chance(0.18) && p.get(x, 2) !== null) p.set(x, 2, GRASS.shine)
  }
}

function earth(p: Px, rng: Random) {
  p.rect(0, 0, T, T, EARTH.base)
  p.speckle(rng, 0.06, [EARTH.light, EARTH.deep])
  for (let i = 0; i < 4; i++) {
    const x = rng.int(3, 27)
    const y = rng.int(8, 27)
    p.set(x, y, EARTH.dot).set(x + 1, y, EARTH.light)
  }
}

function island(s: Sides, rng: Random): Px {
  const p = new Px(T, T)
  earth(p, rng)
  roundCorners(p, s, 6)
  if (s.w) stoneBand(p, 'w', 2, rng)
  if (s.e) stoneBand(p, 'e', 2, rng)
  if (s.s) stoneBand(p, 's', 2, rng)
  if (s.n) {
    stoneBand(p, 'n', 2, rng)
    grassTop(p, rng)
  }
  // Inner corners: a few stones (and turf when the open diagonal is above).
  const corner = (cx: number, cy: number, top: boolean) => {
    stone(p, cx === 0 ? 0 : T - 7, cy === 0 ? 0 : T - 6, 7, 6, rng)
    stone(p, cx === 0 ? 0 : T - 5, cy === 0 ? 5 : T - 10, 5, 4, rng)
    if (top) {
      for (let x = 0; x < 6; x++)
        for (let y = 0; y < 4 - (x > 3 ? 1 : 0); y++)
          p.set(
            cx === 0 ? x : T - 1 - x,
            y,
            y === 0 ? GRASS.light : y < 2 ? GRASS.base : GRASS.dark,
          )
    }
  }
  if (s.ne) corner(T, 0, true)
  if (s.nw) corner(0, 0, true)
  if (s.se) corner(T, T, false)
  if (s.sw) corner(0, T, false)
  inkEdges(p, s)
  if (s.n)
    for (let x = 0; x < T; x++)
      if (p.get(x, 0) === INK && p.get(x, 1) !== null) p.set(x, 1, GRASS.shine)
  return p
}

// ---- brick terrain (inside) -------------------------------------------------------------

function brickPattern(p: Px, brick: string, mortar: string, light?: string, from = 0) {
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      if (p.get(x, y) === null) continue
      const row = Math.floor((y + from) / 4)
      const bx = (x + (row % 2) * 4) % 8
      const line = (y + from) % 4 === 3 || bx === 7
      p.set(x, y, line ? mortar : light && (y + from) % 4 === 0 && bx < 6 ? light : brick)
    }
}

function trimBand(p: Px, s: Sides) {
  const band = 5
  const paint = (x: number, y: number, edge: 'n' | 'e' | 's' | 'w', depth: number) => {
    if (p.get(x, y) === null) return
    const color =
      depth === 0
        ? INK
        : edge === 'n' || edge === 'w'
          ? depth === 1
            ? TRIM.shine
            : depth < band - 1
              ? TRIM.light
              : TRIM.dark
          : depth === 1
            ? TRIM.base
            : depth < band - 1
              ? TRIM.base
              : TRIM.dark
    p.set(x, y, color)
  }
  for (let d = 0; d < band; d++)
    for (let i = 0; i < T; i++) {
      if (s.n) paint(i, d, 'n', d)
      if (s.s) paint(i, T - 1 - d, 's', d)
      if (s.w) paint(d, i, 'w', d)
      if (s.e) paint(T - 1 - d, i, 'e', d)
    }
  // Joints in the trim every 16 px.
  for (const j of [15]) {
    if (s.n) p.rect(j, 1, 1, band - 1, TRIM.dark)
    if (s.s) p.rect(j, T - band, 1, band - 1, TRIM.dark)
    if (s.w) p.rect(1, j, band - 1, 1, TRIM.dark)
    if (s.e) p.rect(T - band, j, band - 1, 1, TRIM.dark)
  }
}

function bricks(s: Sides, rng: Random): Px {
  const p = new Px(T, T, INSIDE.base)
  brickPattern(p, INSIDE.brick, INSIDE.line)
  // Red bricks near the exposed sides, fading into the dark wall.
  const red = new Px(T, T, BRICK.base)
  brickPattern(red, BRICK.base, BRICK.mortar, BRICK.light)
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      const near = Math.min(s.n ? y : 99, s.s ? T - 1 - y : 99, s.w ? x : 99, s.e ? T - 1 - x : 99)
      const cornerNear = Math.min(
        s.ne ? Math.max(T - 1 - x, y) : 99,
        s.nw ? Math.max(x, y) : 99,
        s.se ? Math.max(T - 1 - x, T - 1 - y) : 99,
        s.sw ? Math.max(x, T - 1 - y) : 99,
      )
      const d = Math.min(near, cornerNear + 3)
      if (d < 13 || (d < 16 && (x + y) % 3 === 0)) p.set(x, y, red.get(x, y))
    }
  p.speckle(rng, 0.02, [BRICK.dark], BRICK.base)
  roundCorners(p, s, 3)
  trimBand(p, s)
  const cap = (x: number, y: number) => {
    const block = new Px(7, 7, TRIM.base)
    block.rim(TRIM.shine, TRIM.dark)
    block.frame(0, 0, 7, 7, INK)
    p.draw(block, x, y)
  }
  if (s.ne) cap(T - 7, 0)
  if (s.nw) cap(0, 0)
  if (s.se) cap(T - 7, T - 7)
  if (s.sw) cap(0, T - 7)
  return p
}

// ---- metal frames and blocks ------------------------------------------------------------

function frame(s: Sides, rng: Random, metal: typeof STEEL, ornament: boolean): Px {
  const p = new Px(T, T, VOID.base)
  p.speckle(rng, 0.04, [VOID.dot])
  const band = 5
  for (let d = 0; d < band; d++)
    for (let i = 0; i < T; i++) {
      const color = (edge: 'n' | 'e' | 's' | 'w') =>
        d === 0
          ? INK
          : d === band - 1
            ? metal.dark
            : d === 1
              ? edge === 'n' || edge === 'w'
                ? metal.shine
                : metal.light
              : metal.base
      if (s.n) p.set(i, d, color('n'))
      if (s.s) p.set(i, T - 1 - d, color('s'))
      if (s.w) p.set(d, i, color('w'))
      if (s.e) p.set(T - 1 - d, i, color('e'))
    }
  // Rivets every 8 px along each band.
  for (let i = 4; i < T; i += 8) {
    const rivet = (x: number, y: number) => p.set(x, y, metal.shine).set(x + 1, y + 1, metal.dark)
    if (s.n) rivet(i, 2)
    if (s.s) rivet(i, T - 4)
    if (s.w) rivet(2, i)
    if (s.e) rivet(T - 4, i)
  }
  const plate = (x: number, y: number) => {
    const block = new Px(7, 7, metal.base)
    block.rim(metal.shine, metal.dark)
    block.frame(0, 0, 7, 7, INK)
    if (ornament)
      block
        .set(2, 2, metal.dark)
        .set(3, 2, metal.dark)
        .set(4, 2, metal.dark)
        .set(4, 3, metal.dark)
        .set(4, 4, metal.dark)
        .set(3, 4, metal.dark)
    else block.set(3, 3, metal.shine)
    p.draw(block, x, y)
  }
  // Corner plates where two bands meet, and small plates in inner corners.
  if (s.n && s.w) plate(0, 0)
  if (s.n && s.e) plate(T - 7, 0)
  if (s.s && s.w) plate(0, T - 7)
  if (s.s && s.e) plate(T - 7, T - 7)
  if (s.ne) plate(T - 7, 0)
  if (s.nw) plate(0, 0)
  if (s.se) plate(T - 7, T - 7)
  if (s.sw) plate(0, T - 7)
  return p
}

function slab(s: Sides, metal: typeof STEEL, face: string): Px {
  const p = new Px(T, T, face)
  const bevel = 4
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      const dn = s.n ? y : 99
      const ds = s.s ? T - 1 - y : 99
      const dw = s.w ? x : 99
      const de = s.e ? T - 1 - x : 99
      const d = Math.min(dn, ds, dw, de)
      if (d === 0) p.set(x, y, INK)
      else if (d <= bevel) {
        const color =
          d === dn
            ? metal.shine
            : d === dw
              ? metal.light
              : d === ds
                ? metal.dark
                : mix(metal.dark, metal.base, 0.5)
        p.set(x, y, color)
      }
    }
  // A soft highlight on the face.
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++)
      if (p.get(x, y) === face && (x + y) % 11 === 0 && y < T / 2)
        p.set(x, y, mix(face, metal.shine, 0.35))
  return p
}

// ---- background wall --------------------------------------------------------------------

function wall(s: Sides, rng: Random): Px {
  const p = new Px(T, T, WALL.base)
  brickPattern(p, WALL.base, WALL.mortar, WALL.light)
  p.speckle(rng, 0.03, [WALL.dark, WALL.shine], WALL.base)
  // Shadow towards exposed sides (the wall ends there).
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      const near = Math.min(s.n ? y : 99, s.s ? T - 1 - y : 99, s.w ? x : 99, s.e ? T - 1 - x : 99)
      const corner = Math.min(
        s.ne ? Math.max(T - 1 - x, y) : 99,
        s.nw ? Math.max(x, y) : 99,
        s.se ? Math.max(T - 1 - x, T - 1 - y) : 99,
        s.sw ? Math.max(x, T - 1 - y) : 99,
      )
      const d = Math.min(near, corner)
      if (d === 0 && near === 0) p.set(x, y, INK)
      else if (d < 3) p.set(x, y, WALL.mortar)
      else if (d < 5 && p.get(x, y) !== WALL.mortar) p.set(x, y, WALL.dark)
    }
  return p
}

// ---- wooden platforms and grass ---------------------------------------------------------

function plank(index: number): Px {
  const p = new Px(T, T)
  const caps = index >= 4
  const kind = index % 4 // 0 left end, 1 middle, 2 right end, 3 single
  const left = kind === 0 || kind === 3
  const right = kind === 2 || kind === 3
  const x0 = left ? 1 : 0
  const x1 = right ? T - 1 : T
  p.rect(x0, 0, x1 - x0, 7, INK)
  p.rect(x0 + (left ? 1 : 0), 1, x1 - x0 - (left ? 1 : 0) - (right ? 1 : 0), 5, WOOD.base)
  p.rect(x0 + (left ? 1 : 0), 1, x1 - x0 - (left ? 1 : 0) - (right ? 1 : 0), 1, WOOD.shine)
  p.rect(x0 + (left ? 1 : 0), 5, x1 - x0 - (left ? 1 : 0) - (right ? 1 : 0), 1, WOOD.dark)
  // Wood grain and nails.
  for (const gx of [5, 13, 22, 27])
    if (gx > x0 + 2 && gx < x1 - 3) p.set(gx, 3, WOOD.dark).set(gx + 1, 3, WOOD.dark)
  for (const gx of [9, 18])
    if (gx > x0 + 2 && gx < x1 - 3) p.set(gx, 2, WOOD.light).set(gx + 1, 2, WOOD.light)
  if (caps) {
    const cap = (x: number) => {
      p.rect(x, 0, 5, 7, INK)
      p.rect(x + 1, 1, 3, 5, STEEL.base)
      p.set(x + 1, 1, STEEL.shine)
        .set(x + 2, 1, STEEL.shine)
        .set(x + 1, 2, STEEL.light)
      p.rect(x + 1, 5, 3, 1, STEEL.dark)
    }
    if (left) cap(0)
    if (right) cap(T - 5)
  } else {
    if (left) p.set(1, 0, null).set(1, 6, null)
    if (right) p.set(T - 2, 0, null).set(T - 2, 6, null)
  }
  // Hanging bracket under the plank.
  const bracket = kind === 0 ? 10 : kind === 2 ? 19 : kind === 3 ? 14 : -1
  if (bracket >= 0) {
    p.rect(bracket, 7, 5, 3, INK)
    p.rect(bracket + 1, 7, 3, 2, caps ? STEEL.dark : WOOD.dark)
  }
  return p
}

function tufts(index: number): Px {
  const p = new Px(T, T)
  const spots = [[4, 15, 25], [3, 11, 19, 27], [], [6, 16, 24]][index] ?? [8, 20]
  for (const [n, x] of spots.entries()) {
    const height = 3 + ((n + index) % 3)
    for (let y = 0; y < height; y++) {
      p.set(x, T - 1 - y, y === height - 1 ? GRASS.shine : GRASS.light)
      if (y < height - 1) p.set(x + 1, T - 1 - y, GRASS.base)
    }
    p.set(x - 1, T - 1, GRASS.base)
      .set(x - 1, T - 2, GRASS.light)
      .set(x + 2, T - 1, GRASS.dark)
  }
  p.outline(INK)
  for (let x = 0; x < T; x++) p.set(x, T - 1, p.get(x, T - 2) === null ? null : p.get(x, T - 1))
  return p
}

// ---- world map ----------------------------------------------------------------------------

const MAP_GRASS = {
  dark: '#3f7d4a',
  base: '#5c9e57',
  light: '#79b867',
  shine: '#9fd27e',
  tuft: '#4a8a4c',
}
const CLIFF = {
  dark: '#5b5580',
  base: '#8780ab',
  light: '#aaa4c9',
  stripe: '#6a6491',
  shine: '#c9c4e0',
}

function mapGrass(p: Px, rng: Random, height = T) {
  p.rect(0, 0, T, height, MAP_GRASS.base)
  for (let i = 0; i < 6; i++) {
    const x = rng.int(1, 29)
    const y = rng.int(1, height - 4)
    p.set(x, y, MAP_GRASS.tuft)
      .set(x + 1, y - 1, MAP_GRASS.light)
      .set(x + 2, y, MAP_GRASS.tuft)
  }
  p.speckle(rng, 0.04, [MAP_GRASS.light, MAP_GRASS.dark])
}

function cliffFace(p: Px, from: number, to: number) {
  for (let y = from; y < to; y++)
    for (let x = 0; x < T; x++) {
      const wave = Math.round(Math.sin((x / T) * Math.PI * 2) * 2)
      const band = (y + wave + Math.floor(x / 3)) % 10
      p.set(
        x,
        y,
        band === 0 ? CLIFF.stripe : band === 1 ? CLIFF.dark : band === 5 ? CLIFF.light : CLIFF.base,
      )
    }
}

function worldTile(key: string, rng: Random): Px {
  const p = new Px(T, T)
  const [kind, bits = ''] = key.split(':') as [string, string?]
  const closed = (i: number) => bits[i] === '1'
  if (kind === 'G') {
    const s = {
      n: !closed(0),
      e: !closed(1),
      s: !closed(2),
      w: !closed(3),
      ne: false,
      se: false,
      sw: false,
      nw: false,
    }
    mapGrass(p, rng)
    roundCorners(p, s, 5)
    inkEdges(p, s)
    // A darker rim of turf inside the outline.
    for (let y = 0; y < T; y++)
      for (let x = 0; x < T; x++) {
        if (
          p.get(x, y) !== MAP_GRASS.base &&
          p.get(x, y) !== MAP_GRASS.light &&
          p.get(x, y) !== MAP_GRASS.tuft &&
          p.get(x, y) !== MAP_GRASS.dark
        )
          continue
        const near = Math.min(
          s.n ? y : 99,
          s.s ? T - 1 - y : 99,
          s.w ? x : 99,
          s.e ? T - 1 - x : 99,
        )
        if (near <= 2) p.set(x, y, near === 1 && s.n && y === 1 ? MAP_GRASS.shine : MAP_GRASS.dark)
      }
    return p
  }
  if (kind === 'L') {
    const e = !closed(0)
    const w = !closed(1)
    mapGrass(p, rng, 16)
    cliffFace(p, 16, T)
    // Wavy grass lip hanging over the cliff.
    for (let x = 0; x < T; x++) {
      const lip = 15 + ((x * 5) % 4 === 0 ? 2 : (x * 3) % 5 === 0 ? 1 : 0)
      for (let y = 13; y <= lip; y++)
        p.set(x, y, y === lip ? INK : y >= lip - 1 ? MAP_GRASS.dark : MAP_GRASS.base)
      p.set(x, lip + 1, CLIFF.dark)
    }
    const s = { n: false, e, s: false, w, ne: false, se: false, sw: false, nw: false }
    inkEdges(p, s)
    return p
  }
  if (kind === 'C') {
    const e = !closed(0)
    const w = !closed(1)
    const bottom = !closed(2)
    cliffFace(p, 0, T)
    const s = { n: false, e, s: bottom, w, ne: false, se: false, sw: false, nw: false }
    if (bottom) {
      roundCorners(p, s, 4)
      for (let x = 0; x < T; x++) {
        p.set(x, T - 4, CLIFF.dark)
        p.set(x, T - 3, SEA.foam)
        p.set(x, T - 2, SEA.shine)
      }
    }
    inkEdges(p, s)
    for (let y = 0; y < T; y++) {
      if (w && p.get(1, y) !== null && p.get(1, y) !== INK) p.set(1, y, CLIFF.light)
      if (e && p.get(T - 2, y) !== null && p.get(T - 2, y) !== INK) p.set(T - 2, y, CLIFF.dark)
    }
    return p
  }
  if (kind === 'F') {
    const e = !closed(0)
    const w = !closed(1)
    for (let x = 0; x < T; x++) {
      if ((w && x < 2) || (e && x > T - 3)) continue
      p.set(x, 0, SEA.foam).set(x, 1, x % 6 < 3 ? SEA.foam : SEA.shine)
      if (x % 7 === 2) p.set(x, 2, SEA.shine)
    }
    return p
  }
  // Bridges.
  if (kind.startsWith('tronco-v')) {
    const part = Number(kind.slice(-1))
    for (const x0 of [2, 17]) {
      p.rect(x0, 0, 13, T, INK)
      p.rect(x0 + 1, 0, 11, T, WOOD.base)
      p.rect(x0 + 1, 0, 3, T, WOOD.light)
      p.rect(x0 + 9, 0, 3, T, WOOD.dark)
      for (let y = 3; y < T; y += 9) p.rect(x0 + 5, y, 3, 1, WOOD.dark)
      if (part === 0) {
        p.rect(x0, 0, 13, 1, null)
        p.rect(x0 + 1, 1, 11, 4, WOOD.shine)
        p.rect(x0 + 3, 2, 7, 2, WOOD.light)
        p.rect(x0, 5, 13, 1, INK)
      }
      if (part === 2) {
        p.rect(x0 + 1, T - 6, 11, 5, '#e7c08a')
        p.rect(x0 + 4, T - 4, 5, 2, WOOD.light)
        p.rect(x0, T - 1, 13, 1, INK)
      }
    }
    return p
  }
  const part = Number(kind.slice(-1))
  const rows = kind.startsWith('troncos') ? [3, 17] : [10]
  for (const y0 of rows) {
    const x0 = part === 0 ? 2 : 0
    const x1 = part === 2 ? T - 2 : T
    p.rect(x0, y0, x1 - x0, 12, INK)
    p.rect(x0, y0 + 1, x1 - x0, 10, WOOD.base)
    p.rect(x0, y0 + 1, x1 - x0, 3, WOOD.light)
    p.rect(x0, y0 + 9, x1 - x0, 2, WOOD.dark)
    for (let x = x0 + 3; x < x1; x += 10) p.rect(x, y0 + 5, 4, 1, WOOD.dark)
    if (part === 0) p.rect(x0 + 1, y0 + 1, 3, 10, '#e7c08a').set(x0 + 2, y0 + 5, WOOD.light)
    if (part === 2) p.rect(x1 - 4, y0 + 1, 3, 10, '#e7c08a').set(x1 - 3, y0 + 5, WOOD.light)
  }
  return p
}

// ---- tilesets -----------------------------------------------------------------------------

export function tileImage(key: string): Px {
  const rng = random(seedOf(key))
  if (key.startsWith('tabua-')) return plank(Number(key.slice(6)))
  if (key.startsWith('capim-')) return tufts(Number(key.slice(6)))
  const { material, sides } = parse(key)
  switch (material) {
    case 'ilha':
      return island(sides, rng)
    case 'tijolo':
      return bricks(sides, rng)
    case 'parede':
      return wall(sides, rng)
    case 'aco':
      return frame(sides, rng, STEEL, false)
    case 'cobre':
      return frame(sides, rng, COPPER, true)
    case 'aco-bloco':
      return slab(sides, STEEL, '#a7b2c4')
    case 'cobre-bloco':
      return slab(sides, COPPER, '#e9a86a')
    default:
      return worldTile(key, rng)
  }
}

const SOLID: TilesetKey[] = ['terreno', 'metal']
const NAMES: Record<TilesetKey, string> = {
  terreno: 'terreno',
  metal: 'metal',
  parede: 'parede',
  plataformas: 'plataformas',
  capim: 'capim',
  ilhas: 'ilhas',
}

export function tilesets(): Record<TilesetKey, TilesetDrawing> {
  const result = {} as Record<TilesetKey, TilesetDrawing>
  for (const key of Object.keys(TILE_KEYS) as TilesetKey[])
    result[key] = {
      kind: 'tileset',
      name: NAMES[key],
      tileSize: T,
      tiles: TILE_KEYS[key].map((tileKey) => ({
        image: tileImage(tileKey),
        ...(SOLID.includes(key)
          ? { collision: 'solid' as const }
          : key === 'plataformas'
            ? { collision: 'platform' as const }
            : {}),
      })),
    }
  return result
}
