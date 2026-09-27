import { readNormalizedSceneSkinInfluences } from './readSkin'
import { SCENE_SKIN_LIMITS, type SceneSkinInfluence } from './skin'
import { id, number } from './validation'

export type SceneSkinPaintRefusal = 'influence-limit' | 'no-recipient' | 'precision'
export type SceneSkinPaintMix =
  | { status: 'unchanged' }
  | { status: 'blocked'; reason: SceneSkinPaintRefusal }
  | { status: 'changed'; influences: SceneSkinInfluence[] }

/** An explicit painted target redistributes only the other influences already present in this row. */
export function paintSceneSkinWeight(
  original: readonly SceneSkinInfluence[],
  jointId: string,
  target: number,
): SceneSkinPaintMix {
  id(jointId, 'jointId')
  number(target, 'weight', 0, 1)
  const rows = readNormalizedSceneSkinInfluences(original, 'weights'),
    selected = rows.findIndex((row) => row.jointId === jointId),
    previous = selected < 0 ? 0 : rows[selected]!.weight
  if (target === previous) return { status: 'unchanged' }
  if (selected < 0 && rows.length === SCENE_SKIN_LIMITS.influences)
    return { status: 'blocked', reason: 'influence-limit' }
  const maximum = Math.max(0, ...rows.map((row) => (row.jointId === jointId ? 0 : row.weight))),
    remainder = 1 - target
  if (remainder > 0 && maximum === 0) return { status: 'blocked', reason: 'no-recipient' }
  const scaled = rows.map((row) =>
      row.jointId === jointId || maximum === 0 ? 0 : row.weight / maximum,
    ),
    total = scaled.reduce((sum, value) => sum + value, 0)
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    if (i === selected) row.weight = target
    else {
      const weight = remainder === 0 ? 0 : remainder * (scaled[i]! / total)
      if (remainder > 0 && row.weight > 0 && weight === 0)
        return { status: 'blocked', reason: 'precision' }
      row.weight = weight
    }
  }
  if (selected < 0) rows.push({ jointId, weight: target })
  return { status: 'changed', influences: rows }
}
