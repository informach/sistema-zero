import { ROOM_GRID, ROOM_ITEM_INFO } from '@/lib/room-catalog'
import type { RoomStateView } from '@/lib/types'
import { effectiveFootprint, type Rot, rectsOverlap, WALL_H_CELLS, wallLength } from './coords'

type Placed = RoomStateView['placedItems']

/** Procura posições livres do editor sem misturar regras de colisão com a UI React. */
export function freeFloorSpot(
  items: Placed,
  w: number,
  h: number,
): { x: number; y: number } | null {
  const occupied = new Set<string>()
  for (const item of items) {
    const info = ROOM_ITEM_INFO[item.itemId]
    // Filho em superfície (`on`) vive no nicho do pai — não ocupa chão.
    if (!info || info.mount === 'wall' || item.on) continue
    const footprint = effectiveFootprint(info.w, info.h, (item.rot ?? 0) as Rot)
    for (let dx = 0; dx < footprint.w; dx++) {
      for (let dy = 0; dy < footprint.h; dy++) occupied.add(`${item.x + dx},${item.y + dy}`)
    }
  }
  for (let y = 0; y <= ROOM_GRID.rows - h; y++) {
    for (let x = 0; x <= ROOM_GRID.cols - w; x++) {
      const free = Array.from({ length: w }, (_, dx) =>
        Array.from({ length: h }, (_, dy) => !occupied.has(`${x + dx},${y + dy}`)).every(Boolean),
      ).every(Boolean)
      if (free) return { x, y }
    }
  }
  return null
}

export function freeWallSpot(
  items: Placed,
  w: number,
  h: number,
): { wall: 'left' | 'right'; u: number; v: number } | null {
  for (const wall of ['right', 'left'] as const) {
    const occupied = new Set<string>()
    for (const item of items) {
      const info = ROOM_ITEM_INFO[item.itemId]
      if (info?.mount !== 'wall' || (item.wall ?? 'right') !== wall) continue
      for (let du = 0; du < info.w; du++) {
        for (let dv = 0; dv < info.h; dv++) occupied.add(`${item.x + du},${item.y + dv}`)
      }
    }
    for (let v = WALL_H_CELLS - h; v >= 0; v--) {
      for (let u = 0; u <= wallLength(wall) - w; u++) {
        const free = Array.from({ length: w }, (_, du) =>
          Array.from({ length: h }, (_, dv) => !occupied.has(`${u + du},${v + dv}`)).every(Boolean),
        ).every(Boolean)
        if (free) return { wall, u, v }
      }
    }
  }
  return null
}

export function isFreeAt(
  items: Placed,
  index: number,
  isWall: boolean,
  wall: 'left' | 'right' | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  return items.every((item, itemIndex) => {
    if (itemIndex === index) return true
    const info = ROOM_ITEM_INFO[item.itemId]
    // Filho em superfície não ocupa chão nem parede.
    if (!info || item.on) return true
    const otherIsWall = info.mount === 'wall'
    if (isWall) {
      return (
        !otherIsWall ||
        (item.wall ?? 'right') !== wall ||
        !rectsOverlap(x, y, w, h, item.x, item.y, info.w, info.h)
      )
    }
    if (otherIsWall) return true
    const footprint = effectiveFootprint(info.w, info.h, (item.rot ?? 0) as Rot)
    return !rectsOverlap(x, y, w, h, item.x, item.y, footprint.w, footprint.h)
  })
}
