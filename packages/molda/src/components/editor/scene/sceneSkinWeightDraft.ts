import { COPY } from '../../../core/copy'
import { readNormalizedSceneSkinInfluences } from '../../../scene/readSkin'
import {
  SCENE_SKIN_WEIGHT_TOLERANCE,
  type SceneSkinBinding,
  type SceneSkinInfluence,
} from '../../../scene/skin'
import { normalizeSceneSkinWeights } from '../../../scene/skinWeights'
import { requireScene } from '../../../scene/validation'

export interface SceneSkinWeightDraftRow {
  jointId: string
  /** Display text is not the source of an untouched weight: percent round-trips can change Double. */
  text: string
  value: number | null
}

export function sceneSkinWeightDraftRow(jointId: string, weight: number): SceneSkinWeightDraftRow {
  return { jointId, text: String(Number((weight * 100).toPrecision(6))), value: weight }
}

export function editSceneSkinWeightDraftRow(
  row: SceneSkinWeightDraftRow,
  text: string,
): SceneSkinWeightDraftRow {
  const trimmed = text.trim(),
    decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed),
    percent = Number(trimmed),
    weight = percent / 100,
    // Neither decimal parsing nor division may turn a positive entered force into zero.
    nonzero = /[1-9]/.test(trimmed.split(/[eE]/, 1)[0] ?? ''),
    value =
      decimal &&
      Number.isFinite(percent) &&
      percent >= 0 &&
      percent <= 100 &&
      (!nonzero || weight > 0)
        ? weight
        : null
  return { ...row, text, value }
}

export function sceneSkinWeightDraft(skin: SceneSkinBinding, vertexIds: readonly string[]) {
  const firstId = vertexIds[0]
  requireScene(
    firstId === undefined || Object.hasOwn(skin.weights, firstId),
    'weights',
    COPY.scene.skinWeights.changed,
  )
  const first = firstId === undefined ? [] : skin.weights[firstId]!
  let mixed = false
  for (const id of vertexIds) {
    requireScene(Object.hasOwn(skin.weights, id), 'weights', COPY.scene.skinWeights.changed)
    const row = skin.weights[id]!
    if (
      row.length !== first.length ||
      row.some((item, i) => item.jointId !== first[i]!.jointId || item.weight !== first[i]!.weight)
    )
      mixed = true
  }
  return {
    mixed,
    // Never silently use the first point's mixture for a heterogeneous selection.
    rows: mixed ? [] : first.map((item) => sceneSkinWeightDraftRow(item.jointId, item.weight)),
  }
}

function values(rows: readonly SceneSkinWeightDraftRow[]): SceneSkinInfluence[] {
  return rows.map((row) => {
    requireScene(row.value !== null, 'weight', COPY.scene.skinWeights.invalid)
    return { jointId: row.jointId, weight: row.value }
  })
}

export function readSceneSkinWeightDraft(rows: readonly SceneSkinWeightDraftRow[]) {
  const input = values(rows)
  requireScene(
    Math.abs(input.reduce((sum, row) => sum + row.weight, 0) - 1) <= SCENE_SKIN_WEIGHT_TOLERANCE,
    'weights',
    COPY.scene.skinWeights.total,
  )
  const result = readNormalizedSceneSkinInfluences(input, 'weights')
  for (const influence of result)
    requireScene(
      influence.weight === 0 || Math.fround(influence.weight) > 0,
      'weights',
      COPY.scene.skinWeights.precision,
    )
  return result
}

/** Explicit draft actions only; neither operation writes the document or silently removes zero slots. */
export function normalizeSceneSkinWeightDraft(
  rows: readonly SceneSkinWeightDraftRow[],
  equal = false,
) {
  const result = normalizeSceneSkinWeights(
    equal ? rows.map((row) => ({ jointId: row.jointId, weight: 1 })) : values(rows),
  )
  return result.map((row) => sceneSkinWeightDraftRow(row.jointId, row.weight))
}
