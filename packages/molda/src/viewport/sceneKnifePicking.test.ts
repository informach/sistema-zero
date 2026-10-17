import { expect, test } from 'bun:test'
import { OrthographicCamera } from 'three'
import { addSceneMirror } from '../scene/commands'
import type { MoldaSceneDocument } from '../scene/document'
import { meshEdgeKey } from '../scene/meshTopology'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { makeModel } from '../testing/fixtures'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import { SceneComponentPicker } from './sceneComponentPicking'
import { SceneCutPicker } from './sceneCutPicking'
import { pickSceneKnifePoint } from './sceneKnifePicking'
import { SceneRenderResource } from './sceneRenderResource'

test('knife picks local surface positions, snaps visible vertices and edges, and closes an interior contour', () => {
  const mesh = makeSceneGridGeometry(1)
  mesh.vertices = { v_0_0: [-1, -1, 0], v_1_0: [1, -1, 0], v_1_1: [1, 1, 0], v_0_1: [-1, 1, 0] }
  const base = migrateLegacyModel(makeModel()).document
  const body = base.nodes.find((node) => node.id === 'body')!
  if (body.kind !== 'mesh') throw new Error('Missing body')
  const source: MoldaSceneDocument = {
    ...base,
    geometries: [mesh],
    mirrors: [],
    nodes: [
      {
        ...body,
        parentId: null,
        geometryId: mesh.id,
        transform: {
          kind: 'trs',
          translation: [0, 0, 1],
          rotation: [0, 0, 0, 1],
          scale: [1, 1, 1],
        },
      },
    ],
  }
  const resource = new SceneRenderResource(),
    edges = new SceneCutPicker(),
    vertices = new SceneComponentPicker()
  const camera = new OrthographicCamera(-2, 2, 2, -2, 0.1, 100)
  camera.position.z = 5
  camera.updateMatrixWorld(true)
  const canvas = document.createElement('canvas')
  canvas.getBoundingClientRect = () => ({
    left: 20,
    top: 30,
    right: 420,
    bottom: 430,
    width: 400,
    height: 400,
    x: 20,
    y: 30,
    toJSON() {},
  })
  function pick(x: number, y: number, midpoint = false, close = false) {
    return pickSceneKnifePoint({
      canvas,
      camera,
      resource,
      mesh,
      nodeId: 'body',
      pointer: { clientX: x + 20, clientY: y + 30 },
      midpoint,
      edges,
      vertices,
      closePoint: close
        ? { point: { kind: 'face', faceId: 'f_0_0', point: [0, 0, 0] }, position: [0, 0, 0] }
        : null,
    })
  }
  try {
    resource.update(source)
    expect(pick(200, 200)).toEqual({ kind: 'face', faceId: 'f_0_0', point: [0, 0, 0] })
    expect(pick(305, 200)).toEqual({ kind: 'edge', edgeId: meshEdgeKey('v_1_0', 'v_1_1'), t: 0.5 })
    expect(pick(300, 250, true)).toEqual({
      kind: 'edge',
      edgeId: meshEdgeKey('v_1_0', 'v_1_1'),
      t: 0.5,
    })
    expect(pick(300, 300)).toEqual({ kind: 'vertex', vertexId: 'v_1_0' })
    expect(pick(205, 202, false, true)).toEqual({ kind: 'face', faceId: 'f_0_0', point: [0, 0, 0] })
    expect(pick(-1, 200)).toBeNull()
    expect(pick(320, 200)).toBeNull()
    resource.update(
      addSceneMirror(source, 'body', { axis: 'x', offset: 0.25, nextId: () => 'mirror' }),
    )
    edges.dispose()
    expect(pick(355, 300)).toBeNull()
    resource.update({
      ...source,
      nodes: [
        ...source.nodes,
        {
          ...source.nodes[0]!,
          id: 'blocker',
          locked: true,
          transform: {
            kind: 'trs',
            translation: [0, 0, 2],
            rotation: [0, 0, 0, 1],
            scale: [2, 2, 1],
          },
        },
      ],
    })
    edges.dispose()
    expect(pick(200, 200)).toBeNull()
    expect(pick(305, 200)).toBeNull()
    expect(pick(300, 300)).toBeNull()
  } finally {
    edges.dispose()
    vertices.dispose()
    resource.dispose()
  }
})
