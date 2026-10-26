import {
  openScene,
  stepScene,
  type SceneState,
  type SceneAction,
} from '../../../packages/core/src/learning/scene'

export type Kind = 'quadro' | 'limite' | 'memoria' | 'porta' | 'posicao'
const scene = {
  quadro: 'lighthouse-walk',
  limite: 'lighthouse-walk',
  memoria: 'collect-and-remember',
  porta: 'lighthouse-key',
  posicao: 'lighthouse-position',
} as const
export type Exploration = {
  state: SceneState
  seen: Record<string, boolean>
  command: boolean
  moved: number
  last: string
}
export type Action =
  | SceneAction
  | { type: 'frames'; count: number }
  | { type: 'reset-all' }
  | { type: 'movement-command'; enabled: boolean }
export function begin(kind: Kind): Exploration {
  return {
    state: openScene({ scene: scene[kind] }),
    seen: {},
    command: kind !== 'quadro',
    moved: 0,
    last: 'start',
  }
}
/** Evidence is observed independently of any suggested order. Resets of the scene retain evidence. */
export function explore(kind: Kind, old: Exploration, action: Action): Exploration {
  if (action.type === 'reset-all') return begin(kind)
  if (action.type === 'movement-command')
    return { ...old, command: action.enabled, last: action.type }
  if (action.type === 'frames') {
    let next = old
    for (let i = 0; i < action.count; i++)
      next = explore(kind, next, { type: 'advance', seconds: 1 / 30 })
    return next
  }
  const before = old.state
  // The prototype separates the installed command from the key's state.
  const missingCommand = kind === 'quadro' && action.type === 'advance' && !old.command
  const input = missingCommand ? { ...before, walk: { ...before.walk, arrow: false } } : before
  // Editing a collection rule changes the next encounter, never the saved result.
  const state =
    kind === 'memoria' && action.type === 'remember-collection'
      ? { ...before, collection: { ...before.collection, remember: action.enabled } }
      : stepScene({ scene: scene[kind] }, input, action)
  if (missingCommand) state.walk.arrow = before.walk.arrow
  const seen = { ...old.seen }
  let moved = old.moved
  if (kind === 'quadro' && action.type === 'advance') {
    if (state.walk.x > before.walk.x) {
      moved++
      if (moved >= 2) seen.movement = true
    }
    if (!old.command && before.walk.arrow) seen['no-command'] = true
    if (old.command && !before.walk.arrow && state.walk.x === before.walk.x) {
      seen.still = true
      if (before.walk.x > 208) seen.release = true
    }
  }
  if (kind === 'limite') {
    for (const id of state.evidence.discoveries) seen[id] = true
  }
  if (kind === 'memoria') {
    if (action.type === 'collect-key' && before.collection.keyPresent) {
      seen[state.collection.hasKey ? 'with-memory' : 'without-memory'] = true
    }
    if (
      action.type === 'leave-key' &&
      before.collection.position === 'touching' &&
      state.collection.hasKey
    )
      seen.away = true
    if (
      action.type === 'restart-collection' &&
      before.collection.hasKey &&
      !state.collection.hasKey
    )
      seen.restart = true
  }
  if (kind === 'porta' && action.type === 'try-lighthouse-door')
    seen[state.lighthouse.checkedKey ? 'with-key' : 'without-key'] = true
  if (kind === 'posicao' && action.type === 'key-position') {
    const diff = state.keyPosition[action.axis] - before.keyPosition[action.axis]
    if (diff) seen[`${action.axis}-${diff > 0 ? 'plus' : 'minus'}`] = true
  }
  return { state, seen, command: old.command, moved, last: action.type }
}
