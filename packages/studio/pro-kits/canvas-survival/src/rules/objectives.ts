import type { ArenaEvent, ArenaState } from '../model'

export function resolveObjective(state: ArenaState, events: ArenaEvent[]) {
  if (state.result !== null) return
  if (state.player.health <= 0) state.result = 'lost'
  else if (state.defeated >= state.config.defeatGoal) state.result = 'win-defeats'
  else if (state.tick >= state.config.surviveTicks) state.result = 'win-time'
  if (state.result !== null) {
    events.push({
      type: 'result',
      tick: state.tick,
      x: state.player.x,
      y: state.player.y,
      result: state.result,
      score: state.defeated,
    })
  }
}
