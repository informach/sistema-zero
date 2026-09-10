import { expect, test } from 'bun:test'
import { animatedScene } from '../testing/sceneAnimation'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { prepareSceneBounds, sceneBounds } from './bounds'
import { addSceneMirror, convertSceneNodesToMesh } from './commands'
import { indexSceneDocument } from './documentIndex'
import { identityMatrix } from './matrix'
import { prepareSceneAnimation } from './sampleAnimation'

test('cached local bounds equal fresh bounds for every pose/selection/visibility option and reject another geometry owner', () => {
  const source = addSceneMirror(convertSceneNodesToMesh(animatedScene(), ['body']), 'body', {
    axis: 'x',
    offset: 2,
    nextId: () => 'mirror',
  })
  source.nodes.push({
    id: 'locator',
    name: 'Ponto',
    parentId: 'body',
    kind: 'locator',
    hidden: false,
    locked: false,
    transform: { kind: 'affine', matrix: identityMatrix() },
  })
  const index = indexSceneDocument(source)
  const prepared = prepareSceneBounds(index)
  const sampler = prepareSceneAnimation(source, 'clip')
  for (const time of [0, 0.5, 1, 1.5, 2]) {
    const posed = {
      ...index,
      scene: { ...index.scene, worldMatrices: sampler.sample(time, false).worldMatrices },
    }
    for (const nodeIds of [undefined, new Set(['body']), new Set(['locator']), new Set<string>()])
      for (const includeMirrors of [false, true])
        for (const includeHidden of [false, true]) {
          const options = { nodeIds, includeMirrors, includeHidden, includeLocators: true }
          expect(sceneBounds(posed, options, prepared)).toEqual(sceneBounds(posed, options))
        }
  }
  const other = indexSceneDocument({ ...source, geometries: [...source.geometries] })
  expect(() => sceneBounds(other, {}, prepared)).toThrow('outra revisão')
})

test('group origins participate only when explicitly requested and obey selection and inherited visibility', () => {
  const { document } = makeSceneSkinFixture(),
    index = indexSceneDocument(document),
    options = { nodeIds: new Set(['upper']), includeLocators: true, includeHidden: false }
  expect(sceneBounds(index, options)).toBeNull()
  const world = index.scene.worldMatrices.get('upper')!,
    point: [number, number, number] = [world[12], world[13], world[14]]
  expect(sceneBounds(index, { ...options, includeGroupOrigins: true })).toEqual({
    min: point,
    max: point,
  })
  const hidden = indexSceneDocument({
    ...document,
    nodes: document.nodes.map((node) => (node.id === 'rig' ? { ...node, hidden: true } : node)),
  })
  expect(sceneBounds(hidden, { ...options, includeGroupOrigins: true })).toBeNull()
  expect(
    sceneBounds(hidden, { ...options, includeGroupOrigins: true, includeHidden: true }),
  ).toEqual({ min: point, max: point })
})
