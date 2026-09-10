import { expect, test } from 'bun:test'
import { createSceneSkin } from '../../../scene/skinCommands'
import { normalizeSceneSkinWeights } from '../../../scene/skinWeights'
import { makeSceneSkinFixture } from '../../../testing/sceneSkin'
import {
  editSceneSkinWeightDraftRow,
  normalizeSceneSkinWeightDraft,
  readSceneSkinWeightDraft,
  sceneSkinWeightDraft,
  sceneSkinWeightDraftRow,
} from './sceneSkinWeightDraft'

test('untouched percentages retain exact Double, order and zero influences instead of a percent round-trip', () => {
  const weights = [1 / 3, 1 / 7, 0.1, 0.12345678912345678]
  for (const weight of weights) {
    const rows = [
        sceneSkinWeightDraftRow('upper', weight),
        sceneSkinWeightDraftRow('lower', 1 - weight),
        sceneSkinWeightDraftRow('unused', 0),
      ],
      expected = [
        { jointId: 'upper', weight },
        { jointId: 'lower', weight: 1 - weight },
        { jointId: 'unused', weight: 0 },
      ],
      read = readSceneSkinWeightDraft(rows)
    expect(JSON.stringify(read)).toBe(JSON.stringify(expected))
    expect(read[0]!.weight).toBe(weight)
    expect(rows[0]!.text).toBe(String(Number((weight * 100).toPrecision(6))))
    read[0]!.weight = 0
    expect(rows[0]!.value).toBe(weight)
  }
})

test('mixed selections start with no chosen mixture; uniform and empty selections keep authorial rows own', () => {
  const {
      document,
      input: { id, ...input },
    } = makeSceneSkinFixture(),
    skin = createSceneSkin(document, input, () => id).skins![0]!,
    before = structuredClone(skin),
    ids = Object.keys(skin.weights)
  expect(sceneSkinWeightDraft(skin, ids)).toEqual({ mixed: true, rows: [] })
  expect(sceneSkinWeightDraft(skin, [])).toEqual({ mixed: false, rows: [] })
  const draft = sceneSkinWeightDraft(skin, [ids[0]!])
  expect(draft.mixed).toBe(false)
  expect(readSceneSkinWeightDraft(draft.rows)).toEqual(skin.weights[ids[0]!]!)
  draft.rows[0]!.value = 0.5
  expect(skin).toEqual(before)
  expect(() => sceneSkinWeightDraft(skin, ['absent'])).toThrow()
  expect(() => sceneSkinWeightDraft(skin, [ids[0]!, 'absent'])).toThrow()
  expect(() => sceneSkinWeightDraft(skin, [...ids, 'absent'])).toThrow()
})

test('invalid drafts never clamp, normalize or prune automatically; equal and proportional normalization are explicit', () => {
  const first = sceneSkinWeightDraftRow('upper', 1),
    second = sceneSkinWeightDraftRow('lower', 0)
  for (const text of ['', ' ', 'NaN', 'Infinity', '-1', '101', '1e-323', '1e-999', '0x1']) {
    expect(editSceneSkinWeightDraftRow(first, text).value).toBeNull()
    expect(() => readSceneSkinWeightDraft([editSceneSkinWeightDraftRow(first, text)])).toThrow()
  }
  for (const text of ['0', '-0.00e-999', '+0e3', '.0', '00.'])
    expect(editSceneSkinWeightDraftRow(first, text).value === 0).toBe(true)
  const rows = [editSceneSkinWeightDraftRow(first, '20'), editSceneSkinWeightDraftRow(second, '60')]
  expect(() => readSceneSkinWeightDraft(rows)).toThrow('somar 100%')
  // Preserve the canonical max-scaled normalization, including its Double result near 0.75.
  expect(readSceneSkinWeightDraft(normalizeSceneSkinWeightDraft(rows))).toEqual(
    normalizeSceneSkinWeights([
      { jointId: 'upper', weight: 0.2 },
      { jointId: 'lower', weight: 0.6 },
    ]),
  )
  expect(normalizeSceneSkinWeightDraft(rows).map((row) => row.text)).toEqual(['25', '75'])
  expect(readSceneSkinWeightDraft(normalizeSceneSkinWeightDraft(rows, true))).toEqual([
    { jointId: 'upper', weight: 0.5 },
    { jointId: 'lower', weight: 0.5 },
  ])
  expect(rows.map((row) => row.text)).toEqual(['20', '60'])
  expect(() => normalizeSceneSkinWeightDraft([sceneSkinWeightDraftRow('upper', 0)])).toThrow()
  expect(() => readSceneSkinWeightDraft([first, sceneSkinWeightDraftRow('lower', 1e-100)])).toThrow(
    'pequena demais',
  )
  expect(() => readSceneSkinWeightDraft([first, sceneSkinWeightDraftRow('upper', 0)])).toThrow(
    'duas vezes',
  )
})
