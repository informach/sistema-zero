import { expect, test } from 'bun:test'
import { STUDIO_PROJECT_JSON_LIMITS } from './project-json'
import { encodeProjectJsonGraph } from './project-json-graph'
import { decodeProjectJsonGraph } from './project-json-graph-decode'

test('graph preserves deep project metadata within the existing structural budget', () => {
  let value: unknown = { leaf: 'complete', zero: -0, optional: undefined }
  for (let depth = 0; depth < 40_000; depth++) value = { child: value }
  let restored = decodeProjectJsonGraph(encodeProjectJsonGraph(value)) as Record<string, unknown>
  for (let depth = 0; depth < 40_000; depth++) restored = restored.child as Record<string, unknown>
  expect(restored.leaf).toBe('complete')
  expect(Object.is(restored.zero, -0)).toBe(true)
  expect(Object.hasOwn(restored, 'optional')).toBe(true)
})

test('graph identity distinguishes signed zero and absent fields without changing publication JSON', () => {
  expect(encodeProjectJsonGraph({ value: -0 })).not.toBe(encodeProjectJsonGraph({ value: 0 }))
  expect(encodeProjectJsonGraph({ value: undefined })).not.toBe(encodeProjectJsonGraph({}))
  expect(encodeProjectJsonGraph({ a: [] })).not.toBe(encodeProjectJsonGraph({ a: {} }))
})

for (const invalid of [0, -1, Infinity, 1.5, STUDIO_PROJECT_JSON_LIMITS.nodes + 1])
  test(`callers cannot bypass the document budget with nodes=${invalid}`, () => {
    const limits = { ...STUDIO_PROJECT_JSON_LIMITS, nodes: invalid }
    expect(() => encodeProjectJsonGraph({}, limits)).toThrow()
    expect(() => decodeProjectJsonGraph('{"version":1,"root":null,"nodes":[]}', limits)).toThrow()
  })

test('a narrower context still rejects accepted document content above its own budget', () => {
  const limits = { ...STUDIO_PROJECT_JSON_LIMITS, textChars: 32 }
  const encoded = encodeProjectJsonGraph({ text: 'x'.repeat(100) })
  expect(() => encodeProjectJsonGraph({ text: 'x'.repeat(100) }, limits)).toThrow()
  expect(() => decodeProjectJsonGraph(encoded, limits)).toThrow()
})
