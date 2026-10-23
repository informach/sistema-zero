import { expect, test } from 'bun:test'
import { SkinnedMesh, Vector3 } from 'three'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { addScenePrimitive, editSceneMesh } from '../scene/commands'
import { createSceneProject } from '../scene/createProject'
import { cutMeshWithKnife } from '../scene/meshKnife'
import { prepareSceneAnimation } from '../scene/sampleAnimation'
import { createSceneSkin } from '../scene/skinCommands'
import { makeSceneCutoutPlane } from '../testing/sceneCutoutPlane'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { SceneSelectionOutline } from './SceneSelectionOutline'
import { SceneRenderResource } from './sceneRenderResource'

test('the selected cutout plane does not draw its erased rectangular border', () => {
  const document = makeSceneCutoutPlane()
  const resource = new SceneRenderResource(),
    outline = new SceneSelectionOutline()
  try {
    resource.update(document)
    outline.update(resource, new Set([document.nodes[0]!.id]), null)
    const line = outline.root.children[0]
    if (!(line instanceof LineSegments2)) throw new Error('Missing selection contour')
    expect(line.geometry.getAttribute('instanceStart').count).toBe(0)
  } finally {
    outline.dispose()
    resource.dispose()
  }
})

test('the selected piece keeps coplanar knife edges visible without displaying render triangulation', () => {
  const source = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Corte' }),
    'box',
    'corpo',
  )
  const node = source.nodes[0]!
  const cut = editSceneMesh(
    source,
    node.id,
    (mesh) =>
      cutMeshWithKnife(mesh, [
        { kind: 'vertex', vertexId: 'v_000' },
        { kind: 'vertex', vertexId: 'v_110' },
      ]).mesh,
  )
  const resource = new SceneRenderResource()
  const outline = new SceneSelectionOutline()
  try {
    resource.update(source)
    outline.update(resource, new Set([node.id]), null)
    const count = () =>
      outline.root.children.reduce(
        (sum, line) =>
          sum +
          (line instanceof LineSegments2 ? line.geometry.getAttribute('instanceStart').count : 0),
        0,
      )
    expect(count()).toBe(12)
    resource.update(cut)
    outline.update(resource, new Set([node.id]), null)
    expect(count()).toBe(13)
    outline.update(resource, new Set(), null)
    expect(outline.root.children).toHaveLength(0)
  } finally {
    outline.dispose()
    resource.dispose()
  }
})

test('authorial outlines follow the deformed skin and dispose only their own buffers', () => {
  const {
    document,
    input: { id, ...input },
  } = makeSceneSkinFixture()
  document.animations = [
    {
      id: 'clip',
      name: 'Dobrar',
      space: 'local-delta',
      duration: 2,
      fps: 24,
      loop: false,
      tracks: [
        {
          nodeId: 'lower',
          channel: 'translation',
          keys: [
            { time: 0, value: [0, 0, 0], interpolation: 'linear' },
            { time: 2, value: [2, 0, 1], interpolation: 'linear' },
          ],
        },
      ],
    },
  ]
  const source = createSceneSkin(document, input, () => id)
  const resource = new SceneRenderResource(),
    outline = new SceneSelectionOutline()
  let sourceDisposals = 0
  try {
    resource.update(source)
    const mesh = resource.root.children.find((o) => resource.instanceFor(o)?.id === input.nodeId)
    if (!(mesh instanceof SkinnedMesh)) throw new Error('Missing posed mesh')
    mesh.geometry.addEventListener('dispose', () => sourceDisposals++)
    for (const time of [0, 1, 2]) {
      const pose = prepareSceneAnimation(source, 'clip').sample(time, false)
      resource.setPose(pose)
      outline.update(resource, new Set([input.nodeId]), pose)
      const line = outline.root.children[0]
      if (!(line instanceof LineSegments2)) throw new Error('Missing posed outline')
      expect(line.geometry.getAttribute('instanceStart').count).toBe(4)
      const start = line.geometry.getAttribute('instanceStart'),
        expected = mesh.getVertexPosition(0, new Vector3())
      expect(start.getX(0)).toBeCloseTo(expected.x, 5)
      expect(start.getY(0)).toBeCloseTo(expected.y, 5)
      expect(start.getZ(0)).toBeCloseTo(expected.z, 5)
      expect(line.matrix.elements).toEqual(mesh.matrixWorld.elements)
    }
    outline.dispose()
    expect(sourceDisposals).toBe(0)
  } finally {
    outline.dispose()
    resource.dispose()
  }
})
