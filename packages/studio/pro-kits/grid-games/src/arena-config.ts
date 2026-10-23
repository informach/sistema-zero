import type { ArenaConfig } from './arena-model'

const columns = 11,
  rows = 9
export const config: ArenaConfig = {
  columns,
  rows,
  spawn: { x: 1, y: 1 },
  walls: Array.from({ length: rows }, (_, y) =>
    Array.from({ length: columns }, (_, x) => ({ x, y })),
  )
    .flat()
    .filter(
      ({ x, y }) =>
        x === 0 || y === 0 || x === columns - 1 || y === rows - 1 || (x % 2 === 0 && y % 2 === 0),
    ),
  crates: [
    { x: 3, y: 1 },
    { x: 7, y: 1 },
    { x: 1, y: 3 },
    { x: 5, y: 3 },
    { x: 9, y: 5 },
    { x: 3, y: 7 },
    { x: 7, y: 7 },
  ],
  targetSpawns: [
    { x: 5, y: 1 },
    { x: 9, y: 3 },
    { x: 5, y: 7 },
    { x: 1, y: 7 },
  ],
  targetCount: 3,
  fuseTicks: 75,
  pulseTicks: 18,
  movementTicks: 8,
  range: 2,
  maxCharges: 4,
}
