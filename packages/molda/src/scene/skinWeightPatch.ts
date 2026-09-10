import { readNormalizedSceneSkinInfluences } from './readSkin'
import { SCENE_SKIN_LIMITS, type SceneSkinBinding, type SceneSkinInfluence } from './skin'
import { normalizeSceneSkinWeights } from './skinWeights'
import * as v from './validation'

/** Shared sparse row reader/copy. Structural references are checked by the enclosing command. */
export function patchSceneSkinWeights(
  skin: SceneSkinBinding,
  patch: Record<string, SceneSkinInfluence[]>,
  normalize: boolean,
): SceneSkinBinding {
  const ids = Object.keys(patch)
  v.requireScene(
    ids.length <= SCENE_SKIN_LIMITS.weightedVertices,
    'weights',
    'Pontos fora do orçamento.',
  )
  const changes = ids.flatMap((id) => {
    v.requireScene(
      Object.hasOwn(skin.weights, id),
      'weights',
      'Os pesos apontam para um ponto ausente.',
    )
    const next = readNormalizedSceneSkinInfluences(
        normalize ? normalizeSceneSkinWeights(patch[id]!) : patch[id],
        `weights.${id}`,
      ),
      previous = skin.weights[id]!
    return previous.length === next.length &&
      previous.every(
        (influence, i) =>
          influence.jointId === next[i]!.jointId && influence.weight === next[i]!.weight,
      )
      ? []
      : [[id, next] as const]
  })
  return changes.length
    ? { ...skin, weights: { ...skin.weights, ...Object.fromEntries(changes) } }
    : skin
}
