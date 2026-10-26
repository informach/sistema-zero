import { openScene, stepScene, type SceneAction } from '../../../packages/core/src/learning/scene'
import type { Part } from './data'
const scene = (part: Part) => (part === 'touch' ? 'touch-response' : 'found-counter')
export function start(part: Part) {
  const state = openScene({ scene: scene(part) })
  if (part === 'touch') state.match.gardenRound = 2
  return { state, seen: {} as Record<string, boolean> }
}
export type Model = ReturnType<typeof start>
export type Action = SceneAction | { type: 'new-trial' } | { type: 'reset-all' }
export function reduce(part: Part, old: Model, action: Action): Model {
  if (action.type === 'reset-all') return start(part)
  if (action.type === 'new-trial') {
    const fresh = start(part)
    fresh.state.match.touch = old.state.match.touch
    fresh.state.caption = 'Os esconderijos voltaram. A ligação continua como você deixou.'
    return { ...fresh, seen: old.seen }
  }
  const state = stepScene({ scene: scene(part) }, old.state, action)
  const seen = { ...old.seen }
  if (
    part === 'touch' &&
    action.type === 'touch-hiding-place' &&
    !old.state.match.gardenFound?.includes(action.id)
  ) {
    if (!old.state.match.touch) seen['no-response'] = true
    else {
      seen.responds = true
      seen['target-' + action.id] = true
    }
  }
  if (part === 'count') {
    for (const id of state.evidence.discoveries) seen[id] = true
    // Even before finding anyone, an empty touch is a valid observation of an unchanged value.
    if (action.type === 'look-around') seen['no-find'] = true
  }
  return { state, seen }
}

export type HistoryAction = Action | { type: 'undo' }
export function historyStep(part: Part, history: Model[], action: HistoryAction): Model[] {
  if (action.type === 'undo') return history.length > 1 ? history.slice(0, -1) : history
  if (action.type === 'reset-all') return [start(part)]
  return [...history.slice(-29), reduce(part, history[history.length - 1]!, action)]
}
