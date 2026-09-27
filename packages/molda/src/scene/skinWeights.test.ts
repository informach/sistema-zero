import { expect, test } from 'bun:test'
import { SCENE_SKIN_WEIGHT_TOLERANCE } from './skin'
import { normalizeSceneSkinWeights } from './skinWeights'

test('explicit normalization owns stable ids/order, keeps zero slots and handles Double extremes without overflow', () => {
  for (const values of [
    [2, 6, 0],
    [Number.MAX_VALUE, Number.MAX_VALUE, 0],
    [Number.MIN_VALUE, Number.MIN_VALUE, 0],
    [0.1, 0.2, 0.3, 0.4],
  ]) {
    const input = values.map((weight, i) => ({ jointId: `joint-${i}`, weight })),
      before = structuredClone(input),
      result = normalizeSceneSkinWeights(input)
    expect(input).toEqual(before)
    expect(result === input).toBe(false)
    expect(result.map((item) => item.jointId)).toEqual(input.map((item) => item.jointId))
    expect(Math.abs(result.reduce((sum, item) => sum + item.weight, 0) - 1)).toBeLessThan(
      SCENE_SKIN_WEIGHT_TOLERANCE,
    )
    expect(
      result.every((item) => Number.isFinite(item.weight) && item.weight >= 0 && item.weight <= 1),
    ).toBe(true)
    for (const [i, weight] of values.entries()) {
      if (weight === 0) expect(result[i]!.weight).toBe(0)
      expect(result[i] === input[i]).toBe(false)
    }
  }
  expect(
    normalizeSceneSkinWeights([
      { jointId: 'a', weight: 2 },
      { jointId: 'b', weight: 6 },
    ]),
  ).toEqual([
    { jointId: 'a', weight: 0.25 },
    { jointId: 'b', weight: 0.75 },
  ])
})

test('normalization does not invent a bone, drop an unrepresentable influence, coerce data or prune a fifth bone', () => {
  const invalid: unknown[] = [
    [],
    [{ jointId: 'a', weight: 0 }],
    [{ jointId: 'a', weight: -1 }],
    [{ jointId: 'a', weight: NaN }],
    [{ jointId: 'a', weight: Infinity }],
    [{ jointId: 'a', weight: '1' }],
    [{ jointId: 'a', weight: 1, extra: true }],
    [
      { jointId: 'a', weight: 1 },
      { jointId: 'a', weight: 1 },
    ],
    [
      { jointId: 'a', weight: Number.MIN_VALUE },
      { jointId: 'b', weight: Number.MAX_VALUE },
    ],
    Array.from({ length: 5 }, (_, i) => ({ jointId: `b${i}`, weight: 1 })),
    Array(2),
    [{ jointId: 'bad id', weight: 1 }],
  ]
  for (const input of invalid) expect(() => normalizeSceneSkinWeights(input as never)).toThrow()
})
