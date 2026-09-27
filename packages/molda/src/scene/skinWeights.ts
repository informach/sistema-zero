import { SCENE_SKIN_LIMITS, type SceneSkinInfluence } from './skin'
import * as v from './validation'

/** Strict ownership at a command/import boundary, without normalization or pruning. */
export function readSceneSkinInfluences(raw: unknown, path: string): SceneSkinInfluence[] {
  const items = v.list(raw, path, SCENE_SKIN_LIMITS.influences)
  v.requireScene(items.length > 0, path, 'Escolha pelo menos um osso para este ponto.')
  const ids = new Set<string>()
  return items.map((raw, i) => {
    const itemPath = `${path}[${i}]`,
      row = v.record(raw, itemPath, ['jointId', 'weight']),
      jointId = v.id(row.jointId, `${itemPath}.jointId`)
    v.requireScene(!ids.has(jointId), itemPath, 'O mesmo osso aparece duas vezes neste ponto.')
    ids.add(jointId)
    return { jointId, weight: v.number(row.weight, `${itemPath}.weight`, 0) }
  })
}

/** Explicit author action. Scale before summing to avoid overflow and tiny reciprocals. */
export function normalizeSceneSkinWeights(
  raw: readonly SceneSkinInfluence[],
): SceneSkinInfluence[] {
  const items = readSceneSkinInfluences(raw, 'weights'),
    maximum = Math.max(...items.map((item) => item.weight))
  v.requireScene(maximum > 0, 'weights', 'Dê força a pelo menos um osso antes de normalizar.')
  const scaled = items.map((item) => item.weight / maximum),
    total = scaled.reduce((sum, value) => sum + value, 0)
  return items.map((item, i) => {
    const weight = scaled[i]! / total
    // A positive influence disappearing is a conversion, not normalization.
    v.requireScene(
      item.weight === 0 || weight > 0,
      'weights',
      'A diferença entre os pesos é grande demais para preservar todos os ossos.',
    )
    return { jointId: item.jointId, weight }
  })
}
