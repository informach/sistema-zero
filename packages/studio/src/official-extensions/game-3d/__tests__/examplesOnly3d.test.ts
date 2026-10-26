import { expect, test } from 'bun:test'
import { gameThreeDExamples } from '../exampleCatalog'

const pageOperations = new Set([
  'event',
  'eventProp',
  'getProperty',
  'setProperty',
  'setStyle',
  'classOp',
  'querySelector',
  'querySelectorAll',
  'raw',
  'rawExpr',
  'rawJS',
  'memberCall',
  'memberCallExpr',
])

function pageNodes(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.flatMap(pageNodes)
  const own =
    'type' in value &&
    typeof value.type === 'string' &&
    (pageOperations.has(value.type) || 'canvasId' in value)
      ? [value.type]
      : []
  return [...own, ...Object.values(value).flatMap(pageNodes)]
}

for (const example of gameThreeDExamples) {
  test(`${example.name}: the complete example uses the 3D engine without page blocks`, () => {
    expect(example.ir.html).toEqual([])
    expect(example.ir.css).toEqual([])
    expect(pageNodes(example.ir.behavior)).toEqual([])
  })
}
