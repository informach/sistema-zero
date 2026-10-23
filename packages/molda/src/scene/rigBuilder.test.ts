import { expect, test } from 'bun:test'
import type { Vec3 } from '../core/model'
import { createSceneColorImage } from './appearanceCommands'
import {
  addScenePrimitive,
  convertSceneNodesToMesh,
  groupSceneNodes,
  setSceneNodeFlag,
} from './commands'
import { createSceneProject } from './createProject'
import { indexSceneDocument } from './documentIndex'
import { paintSceneImage } from './imagePaint'
import { transformPoint } from './matrix'
import { meshFaceFrame, meshFaceSurfaceUv } from './meshFaceFrame'
import { scenePivotTargets } from './modelGuides'
import { setScenePieceCoordinates } from './pieceCoordinates'
import { prepareSceneRig, previewSceneRig } from './rigBuilder'
import { createSceneSkin } from './skinCommands'
import { deformSceneSkin, prepareSceneSkin } from './skinPose'
import { prepareSceneSkinSuggestion, suggestSceneSkinWeights } from './skinSuggestion'

function rigFixture() {
  let document = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Braço' }),
    'box',
    'braço',
  )
  const nodeId = document.nodes[0]!.id
  document = setScenePieceCoordinates(document, nodeId, 'dimensions', [2, 6, 2])
  const t = scenePivotTargets(document, nodeId)
  const points: Vec3[] = [
    [t.center[0], t.bottom[1], t.center[2]],
    t.center,
    [t.center[0], 2 * t.center[1] - t.bottom[1], t.center[2]],
  ]
  return { document, nodeId, points }
}

test('guided bones preserve rest shape, original nodes and paint and add an actual bend in a primitive', () => {
  const { document: source, nodeId, points } = rigFixture()
  const rig = prepareSceneRig(source, nodeId, points, 'front')
  expect(rig.document.nodes.slice(0, source.nodes.length)).toEqual(source.nodes)
  expect(rig.document.materials).toBe(source.materials)
  expect(rig.document.images).toBe(source.images)
  const shape = rig.document.geometries[0]!
  if (shape.kind !== 'mesh') throw new Error('Expected prepared mesh')
  expect(Object.keys(shape.vertices).length).toBeGreaterThan(8)
  const weights = suggestSceneSkinWeights(
    prepareSceneSkinSuggestion(rig.document, {
      nodeId,
      jointIds: rig.jointIds,
      method: 'segments',
    }),
  ).weights
  const bound = createSceneSkin(rig.document, {
    nodeId,
    jointIds: rig.jointIds,
    name: 'Braço',
    weights,
  })
  const prepared = prepareSceneSkin(bound, bound.skins![0]!)
  const rest = deformSceneSkin(prepared, indexSceneDocument(bound).scene.worldMatrices)
  rest.forEach((n, i) => {
    expect(n).toBeCloseTo(prepared.positions[i]!, 10)
  })
  const tested = previewSceneRig(bound, rig, rig.jointIds[1]!, 45)
  const bent = deformSceneSkin(prepared, indexSceneDocument(tested).scene.worldMatrices)
  expect(bent.some((n, i) => Math.abs(n - rest[i]!) > 0.1)).toBe(true)
  expect(tested.skins).toBe(bound.skins)
  expect(tested.animations).toBe(source.animations)
  expect(previewSceneRig(bound, rig, rig.jointIds[1]!, 0)).toBe(bound)
  expect(source.skins).toBeUndefined()
  expect(source.nodes).toHaveLength(1)
})

test('chain origins use world positions under a reflected, rotated and unevenly scaled parent', () => {
  let { document, nodeId } = rigFixture()
  document = groupSceneNodes(document, [nodeId], { name: 'Corpo' })
  const parent = document.nodes.find((n) => n.kind === 'group')!
  document = {
    ...document,
    nodes: document.nodes.map((node) =>
      node.id !== parent.id
        ? node
        : {
            ...node,
            transform: {
              kind: 'affine',
              matrix: [-2, 0, 0, 0, 0.2, 1.5, 0, 0, 0.1, 0, 1, 0, 3, 2, -1, 1],
            },
          },
    ),
  }
  const index = indexSceneDocument(document)
  const points = [
    [0, 0, 0],
    [0, 3, 0],
    [0, 6, 0],
  ].map((p) => transformPoint(index.scene.worldMatrices.get(nodeId)!, p as Vec3))
  const rig = prepareSceneRig(document, nodeId, points, 'front')
  const after = indexSceneDocument(rig.document)
  rig.jointIds.forEach((id, i) => {
    after.scene.worldMatrices
      .get(id)!
      .slice(12, 15)
      .forEach((n, axis) => {
        expect(n).toBeCloseTo(points[i]![axis]!, 10)
      })
  })
  expect(rig.document.nodes.slice(0, document.nodes.length)).toEqual(document.nodes)
})

test('invalid and locked preparations do not modify the source', () => {
  const { document, nodeId, points } = rigFixture()
  const before = structuredClone(document)
  expect(() => prepareSceneRig(document, nodeId, points.slice(0, 1), 'front')).toThrow()
  expect(() => prepareSceneRig(document, nodeId, [points[0]!, points[0]!], 'front')).toThrow()
  const locked = setSceneNodeFlag(document, [nodeId], 'locked', true)
  expect(() => prepareSceneRig(locked, nodeId, points, 'front')).toThrow('destrave')
  expect(document).toEqual(before)
})

test('preparing a painted shared mesh isolates geometry and preserves every sampled UV and image layer', () => {
  const fixture = rigFixture()
  let source = convertSceneNodesToMesh(fixture.document, [fixture.nodeId])
  const node = source.nodes[0]!
  if (node.kind !== 'mesh') throw new Error('Missing piece')
  source = createSceneColorImage(source, node.materialId, {
    name: 'Detalhes',
    width: 8,
    height: 8,
    encoding: 'indexed',
  })
  const image = source.images.at(-1)!
  source = paintSceneImage(
    source,
    {
      nodeId: node.id,
      materialId: node.materialId,
      imageId: image.id,
      layerId: image.layers[0]!.id,
    },
    { from: [0, 0], to: [7, 7], color: 2, brush: 1 },
  )
  source = {
    ...source,
    nodes: [...source.nodes, { ...node, id: 'outra-peca', name: 'Outra peça' }],
  }
  const before = structuredClone(source)
  const original = source.geometries.find((g) => g.id === node.geometryId)!
  if (original.kind !== 'mesh') throw new Error('Missing original mesh')
  const rig = prepareSceneRig(source, node.id, fixture.points, 'front')
  const afterNode = rig.document.nodes.find((n) => n.id === node.id)!
  if (afterNode.kind !== 'mesh') throw new Error('Missing prepared piece')
  expect(afterNode.geometryId).not.toBe(node.geometryId)
  expect(rig.document.geometries.find((g) => g.id === node.geometryId)).toBe(original)
  expect(rig.document.nodes.find((n) => n.id === 'outra-peca')).toBe(source.nodes[1])
  expect(rig.document.images).toBe(source.images)
  expect(rig.document.materials).toBe(source.materials)
  const mesh = rig.document.geometries.find((g) => g.id === afterNode.geometryId)!
  if (mesh.kind !== 'mesh') throw new Error('Missing prepared mesh')
  const frames = Object.keys(original.faces).map((id) => meshFaceFrame(original, id))
  for (const face of Object.values(mesh.faces)) {
    const preserved = frames.some((frame) => {
      try {
        return face.corners.every((corner) => {
          const uv = meshFaceSurfaceUv(frame, mesh.vertices[corner.vertexId]!)
          return uv.every((value, axis) => Math.abs(value - corner.uv[axis]!) < 1e-10)
        })
      } catch {
        return false
      }
    })
    expect(preserved).toBe(true)
  }
  expect(source).toEqual(before)
})
