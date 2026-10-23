import type { BodyBounds } from '../config'
import type { ArenaActor } from '../model'

export interface Aabb {
  x: number
  y: number
  width: number
  height: number
}

export function bodyOffsetX(body: BodyBounds, facingX: number): number {
  return facingX < 0 ? -(body.offsetX + body.width) : body.offsetX
}

export function actorBounds(actor: ArenaActor, previous = false): Aabb {
  return {
    x:
      (previous ? actor.previousX : actor.x) +
      bodyOffsetX(actor.body, previous ? actor.previousFacingX : actor.facingX),
    y: (previous ? actor.previousY : actor.y) + actor.body.offsetY,
    width: actor.body.width,
    height: actor.body.height,
  }
}

/** Encostar na borda conta como contato; a mesma convenção vale para o pulso. */
export function overlaps(a: Aabb, b: Aabb): boolean {
  return (
    a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y
  )
}

export function circleIntersectsAabb(x: number, y: number, radius: number, box: Aabb): boolean {
  const nearestX = Math.max(box.x, Math.min(x, box.x + box.width))
  const nearestY = Math.max(box.y, Math.min(y, box.y + box.height))
  return (x - nearestX) ** 2 + (y - nearestY) ** 2 <= radius * radius
}

/** Primeiro instante de contato [0,1], considerando o deslocamento relativo de ambos. */
export function sweptAabbTime(a0: Aabb, a1: Aabb, b0: Aabb, b1: Aabb): number | null {
  if (overlaps(a0, b0)) return 0
  const dx = a1.x - a0.x - (b1.x - b0.x)
  const dy = a1.y - a0.y - (b1.y - b0.y)
  function interval(
    a: number,
    sizeA: number,
    b: number,
    sizeB: number,
    delta: number,
  ): [number, number] | null {
    if (delta === 0) return a <= b + sizeB && a + sizeA >= b ? [-Infinity, Infinity] : null
    const first = (b - a - sizeA) / delta
    const last = (b + sizeB - a) / delta
    return [Math.min(first, last), Math.max(first, last)]
  }
  const horizontal = interval(a0.x, a0.width, b0.x, b0.width, dx)
  const vertical = interval(a0.y, a0.height, b0.y, b0.height, dy)
  if (!horizontal || !vertical) return null
  const enter = Math.max(horizontal[0], vertical[0])
  const leave = Math.min(horizontal[1], vertical[1])
  return enter <= leave && leave >= 0 && enter <= 1 ? Math.max(0, enter) : null
}
