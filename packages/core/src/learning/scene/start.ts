import type { SceneActivity } from './index'
import type { SceneStart } from './state'

/** Por onde a cena desta atividade começa: a cena, o impulso de partida e o caso. */
export function sceneStart(activity: SceneActivity): SceneStart {
  const impulso =
    activity.type === 'experimentation' && activity.initialImpulse !== undefined
      ? { initialImpulse: activity.initialImpulse }
      : {}
  return { scene: activity.scene, ...impulso, ...(activity.setup ? { setup: activity.setup } : {}) }
}
