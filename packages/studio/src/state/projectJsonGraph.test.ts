import { expect, test } from 'bun:test'
import { STUDIO_PROJECT_JSON_LIMITS } from '@sistemazero/core/studio/project-json'
import { EXIT_JOURNAL_MAX_CHARS, encodeExitJournal } from './exitJournalCodec'
import { decodeProjectJsonGraph, encodeProjectJsonGraph } from './projectJsonGraph'

test('the existing exit journal wire stays byte-identical after sharing the graph codec', () => {
  const value = { x: undefined, z: -0, nested: [[], [0], [-1]] }
  const golden =
    '{"version":1,"root":[0],"nodes":[{"object":[["x",[]],["z",[-1]],["nested",[1]]]},{"array":[[2],[3],[4]]},{"array":[]},{"array":[0]},{"array":[-1]}]}'
  expect(encodeExitJournal(value)).toBe(golden)
  expect(encodeProjectJsonGraph(value)).toBe(golden)
  expect(decodeProjectJsonGraph(golden)).toEqual(value)
})

test('storage may use the established project JSON budget without expanding the exit-copy budget', () => {
  const value = { source: 'x'.repeat(EXIT_JOURNAL_MAX_CHARS + 1) }
  expect(() => encodeExitJournal(value)).toThrow()
  const encoded = encodeProjectJsonGraph(value)
  expect(decodeProjectJsonGraph(encoded)).toEqual(value)
})

test('graph callers may tighten structural limits but cannot expand project limits', () => {
  for (const key of ['nodes', 'textChars', 'depth'] as const) {
    for (const invalid of [0, -1, Infinity, NaN, STUDIO_PROJECT_JSON_LIMITS[key] + 1]) {
      const limits = { ...STUDIO_PROJECT_JSON_LIMITS, [key]: invalid }
      expect(() => encodeProjectJsonGraph({}, limits)).toThrow()
      expect(() => decodeProjectJsonGraph('{}', limits)).toThrow()
    }
  }
  const strict = { nodes: 10, textChars: 1000, depth: 1 }
  expect(() => encodeProjectJsonGraph({ nested: { deeper: { value: 1 } } }, strict)).toThrow()
})
