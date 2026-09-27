import { type ScenePredictionPreview, sceneModel } from './catalog'
import { openScene } from './engine'
import type { SceneActivity } from './index'
import { sceneStart } from './start'
import type { SceneState } from './state'

export interface ScenePredictionPreviewResult {
  preview: ScenePredictionPreview
  state: SceneState
}

/**
 * Prepara a prévia a partir da mesma atividade que a criança abrirá depois do palpite.
 * Ela recebe o caso e o elenco reais, mas nunca compartilha a sessão nem as descobertas da criança.
 */
export function scenePredictionPreview(activity: SceneActivity): ScenePredictionPreviewResult {
  return {
    preview: sceneModel(activity.scene).predictionPreview,
    state: openScene(sceneStart(activity)),
  }
}
