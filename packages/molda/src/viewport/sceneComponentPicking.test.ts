import { expect, test } from 'bun:test'
import { type Camera, OrthographicCamera, PerspectiveCamera } from 'three'
import { addSceneMirror, setSceneNodeFlag } from '../scene/commands'
import type { SceneComponentMode } from '../scene/meshComponents'
import { meshEdgeKey } from '../scene/meshTopology'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import type { SceneSelectionRegion } from '../scene/regionSelection'
import { makeModel } from '../testing/fixtures'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import { SceneComponentPicker } from './sceneComponentPicking'
import { SceneRenderResource } from './sceneRenderResource'

function setup() {
  const mesh = makeSceneGridGeometry(1)
  mesh.vertices = {
    v_0_0: [-1, -1, 0],
    v_1_0: [1, -1, 0],
    v_1_1: [1, 1, 0],
    v_0_1: [-1, 1, 0],
    behind: [0, 0, -1],
  }
  const source = migrateLegacyModel(makeModel()).document
  const node = source.nodes.find((n) => n.id === 'body')!
  if (node.kind !== 'mesh') throw new Error('Missing mesh node')
  const document = {
    ...source,
    geometries: [mesh],
    mirrors: [],
    nodes: [
      {
        ...node,
        parentId: null,
        geometryId: mesh.id,
        transform: {
          kind: 'trs' as const,
          translation: [0, 0, 0] as [number, number, number],
          rotation: [0, 0, 0, 1] as [number, number, number, number],
          scale: [1, 1, 1] as [number, number, number],
        },
      },
    ],
  }
  const resource = new SceneRenderResource()
  const picker = new SceneComponentPicker()
  resource.update(document)
  const pick = (
    camera: Camera,
    mode: SceneComponentMode,
    x: number,
    y: number,
    radius = 8,
    through = false,
  ) =>
    picker.pick(
      resource,
      mesh,
      { nodeId: 'body', mode, ids: [] },
      camera,
      { x, y, width: 400, height: 400, radius },
      through,
    )
  return {
    mesh,
    document,
    resource,
    picker,
    pick,
    dispose: () => {
      picker.dispose()
      resource.dispose()
    },
  }
}
function camera(perspective = false) {
  const camera = perspective
    ? new PerspectiveCamera(90, 1, 0.1, 100)
    : new OrthographicCamera(-2, 2, 2, -2, 0.1, 100)
  camera.position.z = 5
  camera.updateMatrixWorld(true)
  return camera
}

test.each([
  false,
  true,
])('box/lasso component regions require all corners in the same visible instance (perspective=%s)', (perspective) => {
  const f = setup()
  try {
    const c = camera(perspective)
    const region = (mode: SceneComponentMode, area: SceneSelectionRegion, through = false) =>
      f.picker.region(f.resource, f.mesh, { nodeId: 'body', mode, ids: [] }, c, area, through)
    const whole: SceneSelectionRegion = { kind: 'box', from: [1, 1], to: [0, 0] }
    const upper: SceneSelectionRegion = { kind: 'box', from: [0, 0], to: [1, 0.49] }
    expect(new Set(region('vertex', whole))).toEqual(new Set(['v_0_0', 'v_1_0', 'v_1_1', 'v_0_1']))
    expect(region('vertex', whole, true)).toHaveLength(5)
    expect(region('edge', whole)).toHaveLength(4)
    expect(region('face', whole)).toEqual(['f_0_0'])
    expect(region('edge', upper)).toEqual([meshEdgeKey('v_0_1', 'v_1_1')])
    expect(region('face', upper)).toEqual([])
    const concave: SceneSelectionRegion = {
      kind: 'lasso',
      points: [
        [0, 0],
        [1, 0],
        [1, 0.49],
        [0.49, 0.49],
        [0.49, 1],
        [0, 1],
      ],
    }
    expect(new Set(region('vertex', concave))).toEqual(new Set(['v_0_0', 'v_1_1', 'v_0_1']))
    expect(region('face', concave)).toEqual([])
    const node = f.document.nodes[0]!
    f.resource.update({
      ...f.document,
      nodes: [
        ...f.document.nodes,
        {
          ...node,
          id: 'locked',
          locked: true,
          transform: {
            kind: 'trs',
            translation: [0, 0, 1],
            rotation: [0, 0, 0, 1],
            scale: [2, 2, 1],
          },
        },
      ],
    })
    expect(region('vertex', whole)).toEqual([])
    expect(region('face', whole, true)).toEqual(['f_0_0'])
    f.resource.update(setSceneNodeFlag(f.document, ['body'], 'locked', true))
    expect(region('face', whole, true)).toEqual([])
    f.picker.dispose()
    expect(region('vertex', whole, true)).toEqual([])
  } finally {
    f.dispose()
  }
})

test('region selection deduplicates mirrors without combining partial corners from different instances', () => {
  const f = setup()
  try {
    f.resource.update(
      addSceneMirror(f.document, 'body', { axis: 'x', offset: 0.25, nextId: () => 'mirror' }),
    )
    const region = (area: SceneSelectionRegion) =>
      f.picker.region(
        f.resource,
        f.mesh,
        { nodeId: 'body', mode: 'face', ids: [] },
        camera(),
        area,
        true,
      )
    expect(region({ kind: 'box', from: [0, 0], to: [1, 1] })).toEqual(['f_0_0'])
    // The middle strip contains one endpoint from each instance, never a whole authorial face.
    expect(region({ kind: 'box', from: [0.3, 0], to: [0.8, 1] })).toEqual([])
    for (const object of f.resource.root.children) object.visible = false
    expect(region({ kind: 'box', from: [0, 0], to: [1, 1] })).toEqual([])
  } finally {
    f.dispose()
  }
})

test.each([
  false,
  true,
])('point/edge picking keeps CSS-pixel tolerance in both projections (perspective=%s)', (perspective) => {
  const f = setup()
  try {
    const c = camera(perspective)
    const corner = perspective ? 160 : 100
    expect(f.pick(c, 'vertex', corner + 7, corner)).toBe('v_0_1')
    expect(f.pick(c, 'vertex', corner + 9, corner)).toBeNull()
    expect(f.pick(c, 'vertex', corner + 13, corner, 14)).toBe('v_0_1')
    expect(f.pick(c, 'edge', 200, corner + 7)).toBe(meshEdgeKey('v_0_1', 'v_1_1'))
    expect(f.pick(c, 'edge', 200, corner + 9)).toBeNull()
    expect(f.pick(c, 'vertex', 200, 200)).toBeNull()
    expect(f.pick(c, 'vertex', 200, 200, 8, true)).toBe('behind')
    f.resource.update(setSceneNodeFlag(f.document, ['body'], 'locked', true))
    expect(f.pick(c, 'vertex', corner, corner, 8, true)).toBeNull()
  } finally {
    f.dispose()
  }
})

test('mirrors select source point IDs and locked foreground geometry still occludes', () => {
  const f = setup()
  try {
    const c = camera()
    f.resource.update(
      addSceneMirror(f.document, 'body', { axis: 'x', offset: 0.25, nextId: () => 'mirror' }),
    )
    expect(f.pick(c, 'vertex', 350, 100)).toBe('v_0_1')
    const node = f.document.nodes[0]!
    f.resource.update({
      ...f.document,
      nodes: [
        ...f.document.nodes,
        {
          ...node,
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
    })
    expect(f.pick(c, 'vertex', 100, 100)).toBeNull()
    expect(f.pick(c, 'vertex', 100, 100, 8, true)).toBe('v_0_1')
    f.picker.dispose()
    f.picker.dispose()
    expect(f.pick(c, 'vertex', 100, 100, 8, true)).toBeNull()
  } finally {
    f.dispose()
  }
})

test('surfaces clipped by the camera near plane do not occlude visible points', () => {
  const f = setup()
  try {
    const node = f.document.nodes[0]!
    f.resource.update({
      ...f.document,
      nodes: [
        ...f.document.nodes,
        {
          ...node,
          id: 'clipped',
          locked: true,
          transform: {
            kind: 'trs',
            translation: [0, 0, 4.95],
            rotation: [0, 0, 0, 1],
            scale: [1, 1, 1],
          },
        },
      ],
    })
    expect(f.pick(camera(true), 'vertex', 160, 160)).toBe('v_0_1')
  } finally {
    f.dispose()
  }
})

test('loose edges clip against the near plane before perspective projection and never select behind-camera points', () => {
  const f = setup()
  try {
    f.mesh.vertices = { near: [0, 0, 4.95], far: [1, 0, 0], behindCamera: [0, 0, 6] }
    f.mesh.faces = {}
    f.mesh.looseEdges = [['near', 'far']]
    f.resource.update({ ...f.document, geometries: [{ ...f.mesh }] })
    const c = camera(true)
    expect(f.pick(c, 'edge', 230, 200)).toBe(meshEdgeKey('near', 'far'))
    expect(f.pick(c, 'vertex', 200, 200, 8, true)).toBeNull()
    f.mesh.looseEdges = [['near', 'behindCamera']]
    expect(f.pick(c, 'edge', 200, 200)).toBeNull()
  } finally {
    f.dispose()
  }
})
