export interface GameSnapshot {
  phase: string
  readiness?: 'loading' | 'ready' | 'error'
  score: number
  goal: number
  seed?: number
  health?: number
  maxHealth?: number
  tick?: number
  elapsedSeconds?: number
  timeGoalSeconds?: number
  resultReason?: 'time' | 'kills' | 'health'
  timing?: { discardedSeconds: number }
  player?: { x: number; y: number; z?: number; grounded?: boolean }
  targets?: Array<{ x: number; y: number; z?: number }>
  board?: number[][]
  rules?: { range: number; fuseTicks: number; movementTicks: number }
  charges?: Array<{ x: number; y: number; id: number; remaining: number }>
  pulses?: Array<{ cells: Array<{ x: number; y: number }>; remaining: number }>
  round?: number
  turn?: 'player' | 'rival'
  cursor?: { x: number; y: number }
  selectedId?: string | null
  coins?: number
  terrain?: number[][]
  moves?: Array<{ x: number; y: number }>
  units?: Array<{
    x: number
    y: number
    id: string
    side: 'friend' | 'rival'
    role: 'guardian' | 'scout'
    health: number
    maxHealth: number
    moved: boolean
    acted: boolean
  }>
  piece?: { x: number; y: number; cells: [number, number][] }
}
/** Executes in the browser realm. Input only; no game-state mutation. */
export function driveGame(options: {
  id: string
  lose: boolean
  timeoutMs?: number
}): Promise<GameSnapshot>
