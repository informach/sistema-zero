/** PyDew Valley: the pieces of the farmer's house (walls, floor, furniture and rugs). */
import type { TilesetDrawing } from '../../drawing'
import { lighten, Px } from '../../pixel'
import { FLOWER, INK, WATER, WOOD } from './palette'

const T = 32
const LOG = '#9a6a43'
const LOG_LIGHT = '#b98758'
const LOG_DARK = '#74492f'
const CAP = '#e0b47c'
const CAP_DARK = '#c18f5c'
const FLOOR = '#e6c08a'
const FLOOR_DARK = '#c99d66'
const FLOOR_LIGHT = '#f3d6a6'
const BLUE = '#6fa8dc'
const BLUE_DARK = '#4a7fb8'
const BLUE_LIGHT = '#a7cdf0'

/** Front face of a log wall (top cap, logs, dark foot) between x0 and x1. */
function wallFace(tile: Px, x0 = 0, x1 = T) {
  tile.rect(x0, 0, x1 - x0, 6, CAP)
  tile.rect(x0, 0, x1 - x0, 1, INK).rect(x0, 5, x1 - x0, 1, CAP_DARK)
  for (let y = 6; y < 30; y += 6) {
    tile.rect(x0, y, x1 - x0, 6, LOG)
    tile.rect(x0, y, x1 - x0, 1, LOG_LIGHT)
    tile.rect(x0, y + 5, x1 - x0, 1, LOG_DARK)
    for (let x = x0; x < x1; x++) if ((x + y) % 11 === 0) tile.set(x, y + 2, LOG_DARK)
  }
  tile.rect(x0, 30, x1 - x0, 2, INK)
}

/** Top of a side wall seen from above (a beam), x0 to x1. */
function sideCap(tile: Px, x0: number, x1: number, y0 = 0, y1 = T) {
  tile.rect(x0, y0, x1 - x0, y1 - y0, CAP)
  tile.rect(x0, y0, 1, y1 - y0, INK).rect(x1 - 1, y0, 1, y1 - y0, INK)
  tile.rect(x0 + 1, y0, 1, y1 - y0, lighten(CAP, 0.3))
  tile.rect(x1 - 2, y0, 1, y1 - y0, CAP_DARK)
  for (let y = y0 + 3; y < y1; y += 8) tile.rect(x0 + 2, y, x1 - x0 - 4, 1, CAP_DARK)
}

function window(tile: Px) {
  tile.rect(9, 9, 14, 13, LOG_DARK)
  tile.rect(10, 10, 12, 11, WATER.light)
  tile.rect(10, 10, 12, 3, WATER.foam)
  tile.rect(15, 10, 2, 11, LOG_DARK).rect(10, 15, 12, 1, LOG_DARK)
  tile.set(11, 14, '#ffffff').set(12, 13, '#ffffff')
  tile.rect(8, 22, 16, 2, CAP_DARK)
}

function walls(): Px[] {
  const withWindow = new Px(T, T)
  wallFace(withWindow)
  window(withWindow)
  // End of the front wall at the left of the door (a post on its right side).
  const endLeft = new Px(T, T)
  wallFace(endLeft, 0, 26)
  endLeft.rect(23, 0, 4, 32, LOG_DARK).rect(23, 0, 1, 32, LOG_LIGHT).rect(26, 0, 1, 32, INK)
  const cornerTL = new Px(T, T)
  sideCap(cornerTL, 22, T)
  cornerTL.rect(22, 0, 10, 1, INK)
  const plain = new Px(T, T)
  wallFace(plain)
  const cornerTR = new Px(T, T)
  sideCap(cornerTR, 0, 10)
  cornerTR.rect(0, 0, 10, 1, INK)
  const endRight = endLeft.flipX()
  const left = new Px(T, T)
  sideCap(left, 22, T)
  const floor = new Px(T, T, FLOOR)
  for (let x = 0; x < T; x += 8) {
    floor.rect(x, 0, 1, T, FLOOR_DARK)
    floor.rect(x + 1, 0, 1, T, FLOOR_LIGHT)
    const seam = (x / 8) % 2 ? 9 : 25
    floor.rect(x, seam, 8, 1, FLOOR_DARK)
    floor.set(x + 4, (seam + 13) % T, FLOOR_DARK)
  }
  const right = new Px(T, T)
  sideCap(right, 0, 10)
  const cornerBL = new Px(T, T)
  sideCap(cornerBL, 22, T, 0, 6)
  wallFace(cornerBL, 22, T)
  cornerBL.rect(22, 0, 1, T, INK)
  const bottom = new Px(T, T)
  wallFace(bottom)
  const cornerBR = new Px(T, T)
  wallFace(cornerBR, 0, 10)
  cornerBR.rect(9, 0, 1, T, INK)
  return [
    withWindow,
    endLeft,
    cornerTL,
    plain,
    cornerTR,
    endRight,
    left,
    floor,
    right,
    cornerBL,
    bottom,
    cornerBR,
  ]
}

function furniture(): Px[] {
  // Bed: the headboard against the wall, then the blanket.
  const head = new Px(T, T)
  head.rect(4, 14, 24, 18, WOOD.base).rect(4, 14, 24, 2, WOOD.light).rect(4, 14, 2, 18, WOOD.light)
  head.rect(6, 20, 20, 12, '#fbf5e6').rect(8, 22, 16, 8, '#ffffff').rect(6, 30, 20, 2, '#e3d9c4')
  head.outline(INK)
  const body = new Px(T, T)
  body.rect(4, 0, 24, 29, WOOD.base)
  body.rect(5, 0, 22, 27, BLUE)
  body.rect(5, 0, 22, 4, '#fbf5e6').rect(5, 4, 22, 2, BLUE_LIGHT)
  for (let y = 9; y < 26; y += 5) body.rect(7, y, 18, 1, BLUE_DARK)
  body.rect(5, 0, 2, 27, BLUE_LIGHT).rect(25, 0, 2, 27, BLUE_DARK)
  body.rect(4, 27, 24, 2, WOOD.dark)
  body.outline(INK)
  const dresser = new Px(T, T)
  dresser.rect(5, 6, 22, 24, WOOD.base).rect(5, 6, 22, 3, WOOD.pale)
  for (const y of [11, 18, 24]) {
    dresser.rect(7, y, 18, 5, WOOD.light).rect(7, y + 4, 18, 1, WOOD.dark)
    dresser.rect(14, y + 2, 4, 1, WOOD.deep)
  }
  dresser.rect(9, 2, 5, 4, FLOWER.yellow).rect(10, 1, 3, 1, FLOWER.yellowDark)
  dresser.outline(INK)
  const chair = new Px(T, T)
  chair.rect(19, 4, 5, 20, WOOD.base).rect(19, 4, 2, 20, WOOD.light)
  chair.rect(8, 16, 16, 5, WOOD.light).rect(8, 16, 16, 1, WOOD.pale).rect(8, 20, 16, 1, WOOD.dark)
  chair.rect(9, 21, 3, 8, WOOD.dark).rect(20, 21, 3, 8, WOOD.dark)
  chair.outline(INK)
  const stool = new Px(T, T)
  stool.ellipse(8, 12, 16, 9, WOOD.light).ellipse(10, 13, 12, 5, WOOD.pale)
  stool.rect(10, 19, 3, 9, WOOD.dark).rect(19, 19, 3, 9, WOOD.dark)
  stool.outline(INK)
  const table = new Px(T, T)
  table.rect(3, 6, 26, 16, WOOD.light).rect(3, 6, 26, 2, WOOD.pale).rect(3, 20, 26, 2, WOOD.dark)
  table.rect(5, 22, 3, 8, WOOD.dark).rect(24, 22, 3, 8, WOOD.dark)
  table.rect(12, 9, 8, 6, '#fbf5e6').ellipse(13, 9, 6, 4, FLOWER.red)
  table.outline(INK)
  const clock = new Px(T, T)
  clock.circle(16, 16, 9, WOOD.base).circle(16, 16, 7, '#fbf5e6')
  clock.rect(16, 11, 1, 6, INK).rect(16, 16, 4, 1, INK)
  clock.set(16, 10, WOOD.dark).set(22, 16, WOOD.dark).set(16, 22, WOOD.dark).set(10, 16, WOOD.dark)
  clock.outline(INK)
  const rug = (w0: number, w1: number, fringeLeft: boolean, fringeRight: boolean) => {
    const tile = new Px(T, T)
    tile.rect(w0, 5, w1 - w0, 22, BLUE).rect(w0 + 2, 7, w1 - w0 - 4, 18, BLUE_LIGHT)
    tile.rect(w0 + 4, 9, w1 - w0 - 8, 14, BLUE)
    for (let y = 11; y < 21; y += 4)
      for (let x = w0 + 6; x < w1 - 5; x += 4) tile.set(x, y, '#fbf5e6')
    if (fringeLeft)
      for (let y = 6; y < 27; y += 2) tile.set(w0 - 1, y, '#fbf5e6').set(w0 - 2, y, '#fbf5e6')
    if (fringeRight)
      for (let y = 6; y < 27; y += 2) tile.set(w1, y, '#fbf5e6').set(w1 + 1, y, '#fbf5e6')
    tile.rect(w0, 5, w1 - w0, 1, BLUE_DARK).rect(w0, 26, w1 - w0, 1, BLUE_DARK)
    return tile
  }
  const small = rug(6, 26, true, true)
  const bigLeft = rug(4, T, true, false)
  const bigRight = rug(0, 28, false, true)
  return [head, body, dresser, chair, stool, table, clock, small, bigLeft, bigRight]
}

/**
 * `casa`: 0 wall with window · 1 wall end left of the door · 2 corner top-left · 3 wall ·
 * 4 corner top-right · 5 wall end right of the door · 6 left wall · 7 floor · 8 right wall ·
 * 9-11 bottom corners and wall · 12-18 bed head, bed, dresser, chair, stool, table, clock ·
 * 19-21 rugs.
 */
export function houseTiles(): TilesetDrawing {
  const tiles = [...walls(), ...furniture()]
  return {
    kind: 'tileset',
    name: 'casa',
    tileSize: T,
    tiles: tiles.map((image) => ({ image })),
  }
}
