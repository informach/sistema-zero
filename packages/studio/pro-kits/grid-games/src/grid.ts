export interface Cell {
  x: number
  y: number
}
export const cellKey = ({ x, y }: Cell): string => `${x},${y}`
export const sameCell = (a: Cell, b: Cell): boolean => a.x === b.x && a.y === b.y
export const distance = (a: Cell, b: Cell): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
export const directions: readonly Cell[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
]

/** Breadth-first search over a bounded board. No diagonal movement or recursion. */
export function reachable(
  start: Cell,
  maxSteps: number,
  canEnter: (from: Cell, to: Cell) => boolean,
): Cell[] {
  const queue = [{ ...start, steps: 0 }],
    visited = new Set([cellKey(start)])
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index]!
    if (current.steps >= maxSteps) continue
    for (const direction of directions) {
      const next = { x: current.x + direction.x, y: current.y + direction.y }
      const key = cellKey(next)
      if (visited.has(key) || !canEnter(current, next)) continue
      visited.add(key)
      queue.push({ ...next, steps: current.steps + 1 })
    }
  }
  return queue.slice(1).map(({ x, y }) => ({ x, y }))
}

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0 || 1
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 4294967296
  }
}
