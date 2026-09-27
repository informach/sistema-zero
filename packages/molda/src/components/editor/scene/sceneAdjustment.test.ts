import { describe, expect, test } from 'bun:test'
import { groupSceneNodes, moveScenePivot } from '../../../scene/commands'
import { indexSceneDocument } from '../../../scene/documentIndex'
import { transformPoint } from '../../../scene/matrix'
import { migrateLegacyModel } from '../../../scene/migrateLegacy'
import { makeModel } from '../../../testing/fixtures'
import { adjustScene } from './sceneAdjustment'

describe('workshop adjustments', () => {
  test('rotation of one piece uses its relocated pivot, not its geometry centre', () => {
    const source = moveScenePivot(migrateLegacyModel(makeModel()).document, 'body', [2, 0, 0])
    const original = indexSceneDocument(source).scene.worldMatrices.get('body')
    if (!original) throw new Error('Missing body')
    const pivot = transformPoint(original, [0, 0, 0])
    const rotated = adjustScene(source, ['body'], 'rotate', [0, 0, 90])
    const matrix = indexSceneDocument(rotated).scene.worldMatrices.get('body')
    if (!matrix) throw new Error('Missing rotated body')
    const after = transformPoint(matrix, [0, 0, 0])
    for (let axis = 0; axis < 3; axis++) expect(after[axis]).toBeCloseTo(pivot[axis] ?? NaN, 9)
  })
  test('nested multi-selection applies world movement once; invalid numbers do not mutate', () => {
    const source = groupSceneNodes(migrateLegacyModel(makeModel()).document, ['body'], {
      nextId: () => 'group',
    })
    const original = structuredClone(source)
    const result = adjustScene(source, ['group', 'body'], 'move', [3, 0, 0])
    const before = indexSceneDocument(source).scene.worldMatrices.get('body')
    const after = indexSceneDocument(result).scene.worldMatrices.get('body')
    expect(after?.[12]).toBeCloseTo((before?.[12] ?? NaN) + 3, 9)
    expect(() => adjustScene(source, ['body'], 'scale', [-1, 1, 1])).toThrow()
    expect(() => adjustScene(source, ['body'], 'move', [NaN, 0, 0])).toThrow()
    expect(source).toEqual(original)
  })
})
