import { expect, test } from 'bun:test'
import { makeModel } from '../testing/fixtures'
import { isPartVisible } from './viewVisibility'

test('solo mode includes the selected part and its twin without mutating saved flags', () => {
  const model = makeModel()
  const part = model.parts[0]!
  const twin = { ...part, id: 'twin', mirrorOf: part.id }
  const hidden = { ...part, hidden: true as const }
  const ids = new Set([part.id])
  expect(isPartVisible(part, ids)).toBe(true)
  expect(isPartVisible(twin, ids)).toBe(true)
  expect(isPartVisible(model.parts[1]!, ids)).toBe(false)
  expect(isPartVisible(hidden, ids)).toBe(false)
  expect(isPartVisible(model.parts[1]!, null)).toBe(true)
  expect(isPartVisible(hidden, null)).toBe(false)
  expect(part.hidden).toBeUndefined()
  expect(hidden.hidden).toBe(true)
})
