import { expect, test } from 'bun:test'
import { Matrix4, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three'
import type { MoldaSceneDocument } from '../scene/document'
import { quaternionFromEulerXYZ } from '../scene/matrix'
import { meshEdgeKey } from '../scene/meshTopology'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { makeModel } from '../testing/fixtures'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import { SceneCutPicker } from './sceneCutPicking'
import { SceneRenderResource } from './sceneRenderResource'

test('cut picking uses authorial edges, CSS pixels, perspective-correct parameters and locked occluders', () => {
  const mesh = makeSceneGridGeometry(1)
  mesh.vertices = { v_0_0: [-1, -1, 0], v_1_0: [1, -1, 0], v_1_1: [1, 1, 0], v_0_1: [-1, 1, 0] }
  const base = migrateLegacyModel(makeModel()).document
  const node = base.nodes.find((node) => node.id === 'body')!
  if (node.kind !== 'mesh') throw new Error('Missing body')
  const source: MoldaSceneDocument = {
    ...base,
    geometries: [mesh],
    mirrors: [],
    nodes: [
      {
        ...node,
        parentId: null,
        geometryId: mesh.id,
        transform: {
          kind: 'trs',
          translation: [0, 0, 0],
          rotation: [0, 0, 0, 1],
          scale: [1, 1, 1],
        },
      },
    ],
  }
  const resource = new SceneRenderResource(),
    picker = new SceneCutPicker()
  const camera = new OrthographicCamera(-2, 2, 2, -2, 0.1, 100)
  camera.position.z = 5
  camera.updateMatrixWorld(true)
  const pick = (x: number, y: number) =>
    picker.pick(resource, mesh, 'body', camera, { x, y, width: 400, height: 400 }, false)
  try {
    resource.update(source)
    expect(pick(310, 200)?.edgeId).toBe(meshEdgeKey('v_1_0', 'v_1_1'))
    expect(picker.visible(resource, mesh, 'body', camera, new Vector3(1, 0, 0))).toBe(true)
    expect(pick(313, 200)).toBeNull()
    expect(pick(200, 200)).toBeNull() // Rendering triangles do not introduce a selectable diagonal.
    const tilted: MoldaSceneDocument = {
      ...source,
      nodes: [
        {
          ...source.nodes[0]!,
          transform: {
            kind: 'trs',
            translation: [0, 0, 0],
            rotation: quaternionFromEulerXYZ([0, 40, 0]),
            scale: [1, 1, 1],
          },
        },
      ],
    }
    picker.dispose()
    resource.update(tilted)
    const perspective = new PerspectiveCamera(60, 1, 0.1, 100)
    perspective.position.z = 5
    perspective.updateMatrixWorld(true)
    const point = new Vector3(-0.5, 1, 0)
      .applyMatrix4(new Matrix4().copy(resource.root.children[0]!.matrixWorld))
      .project(perspective)
    const pointer = { x: (point.x + 1) * 200, y: (1 - point.y) * 200, width: 400, height: 400 }
    expect(picker.pick(resource, mesh, 'body', perspective, pointer, false)?.t).toBeCloseTo(
      0.25,
      10,
    )
    expect(picker.pick(resource, mesh, 'body', perspective, pointer, true)?.t).toBe(0.5)
    const blocked: MoldaSceneDocument = {
      ...source,
      nodes: [
        ...source.nodes,
        {
          ...source.nodes[0]!,
          id: 'blocker',
          locked: true,
          transform: {
            kind: 'trs',
            translation: [0, 0, 1],
            rotation: [0, 0, 0, 1],
            scale: [2, 2, 1],
          },
        },
      ],
    }
    picker.dispose()
    resource.update(blocked)
    expect(pick(300, 200)).toBeNull()
    expect(picker.visible(resource, mesh, 'body', camera, new Vector3(1, 0, 0))).toBe(false)
    const blocker = resource.root.children.find(
      (object) => resource.instanceFor(object)?.sourceNodeId === 'blocker',
    )!
    blocker.visible = false
    picker.dispose()
    expect(pick(300, 200)?.edgeId).toBe(meshEdgeKey('v_1_0', 'v_1_1'))
    expect(picker.visible(resource, mesh, 'body', camera, new Vector3(1, 0, 0))).toBe(true)
  } finally {
    picker.dispose()
    resource.dispose()
  }
})
