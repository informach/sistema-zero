import { expect, test } from 'bun:test'
import { readNormalizedSceneSkinInfluences } from './readSkin'
import { paintSceneSkinWeight } from './skinPaintWeights'

test('painting preserves influence order and zeros, redistributes the remaining mixture and never borrows rows', () => {
  const original = [
    { jointId: 'a', weight: 0.5 },
    { jointId: 'zero', weight: 0 },
    { jointId: 'b', weight: 0.125 },
    { jointId: 'c', weight: 0.375 },
  ]
  const before = structuredClone(original),
    result = paintSceneSkinWeight(original, 'a', 0.25)
  expect(result).toEqual({
    status: 'changed',
    influences: [
      { jointId: 'a', weight: 0.25 },
      { jointId: 'zero', weight: 0 },
      { jointId: 'b', weight: 0.1875 },
      { jointId: 'c', weight: 0.5625 },
    ],
  })
  expect(original).toEqual(before)
  if (result.status !== 'changed') throw new Error('Mudança esperada')
  for (const row of result.influences) expect(original.includes(row)).toBe(false)
  expect(readNormalizedSceneSkinInfluences(result.influences, 'result')).toEqual(result.influences)
  expect(paintSceneSkinWeight(original, 'a', 0.5)).toEqual({ status: 'unchanged' })
  expect(paintSceneSkinWeight(original, 'missing', 0)).toEqual({ status: 'unchanged' })
})

test('adding an influence is explicit, never evicts a fifth slot, and removing strength requires an existing recipient', () => {
  expect(paintSceneSkinWeight([{ jointId: 'a', weight: 1 }], 'b', 0.25)).toEqual({
    status: 'changed',
    influences: [
      { jointId: 'a', weight: 0.75 },
      { jointId: 'b', weight: 0.25 },
    ],
  })
  expect(paintSceneSkinWeight([{ jointId: 'a', weight: 1 }], 'a', 0.9)).toEqual({
    status: 'blocked',
    reason: 'no-recipient',
  })
  expect(
    paintSceneSkinWeight(
      [
        { jointId: 'a', weight: 1 },
        { jointId: 'b', weight: 0 },
        { jointId: 'c', weight: 0 },
        { jointId: 'd', weight: 0 },
      ],
      'e',
      0.25,
    ),
  ).toEqual({ status: 'blocked', reason: 'influence-limit' })
})

test('tiny positive values stay Double; scaling underflow is refused while an explicit full target may zero others', () => {
  const tiny = [
    { jointId: 'a', weight: 1 },
    { jointId: 'b', weight: 1e-100 },
  ]
  expect(paintSceneSkinWeight(tiny, 'a', 1)).toEqual({ status: 'unchanged' })
  expect(paintSceneSkinWeight(tiny, 'a', 0.5)).toEqual({
    status: 'changed',
    influences: [
      { jointId: 'a', weight: 0.5 },
      { jointId: 'b', weight: 0.5 },
    ],
  })
  const extreme = [
    { jointId: 'a', weight: 0 },
    { jointId: 'b', weight: 1 },
    { jointId: 'c', weight: Number.MIN_VALUE },
  ]
  expect(paintSceneSkinWeight(extreme, 'a', 0.5)).toEqual({
    status: 'blocked',
    reason: 'precision',
  })
  expect(paintSceneSkinWeight(extreme, 'a', 1)).toEqual({
    status: 'changed',
    influences: [
      { jointId: 'a', weight: 1 },
      { jointId: 'b', weight: 0 },
      { jointId: 'c', weight: 0 },
    ],
  })
  for (const target of [NaN, Infinity, -0.1, 1.1])
    expect(() => paintSceneSkinWeight(tiny, 'a', target)).toThrow()
  expect(() => paintSceneSkinWeight([{ jointId: 'a', weight: 0 }], 'b', 0.5)).toThrow()
})
