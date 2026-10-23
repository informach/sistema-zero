import { expect, test } from 'bun:test'
import { LineSegments, Mesh, Points, Raycaster, Vector3 } from 'three'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { createModelAsset } from '../core/model'
import {
  addSceneMirror,
  addSceneShape,
  convertSceneNodesToMesh,
  setSceneNodeFlag,
} from '../scene/commands'
import { meshComponentEdges } from '../scene/meshComponents'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { addScenePaintableInterior } from '../scene/paintableInterior'
import { makeModel } from '../testing/fixtures'
import { makeSceneWheelSelection } from '../testing/sceneWheelSelection'
import { SceneComponentOverlay } from './SceneComponentOverlay'
import { SceneRenderResource } from './sceneRenderResource'

function fixture() {
  const source = migrateLegacyModel(createModelAsset({ name: 'Faces' })).document
  const nodeId = source.nodes[0]!.id
  const document = addSceneMirror(convertSceneNodesToMesh(source, [nodeId]), nodeId, {
    axis: 'x',
    offset: 3,
    nextId: () => 'mirror',
  })
  const node = document.nodes[0]!
  const mesh =
    node.kind === 'mesh' ? document.geometries.find((g) => g.id === node.geometryId) : null
  if (mesh?.kind !== 'mesh') throw new Error('Missing mesh')
  return { document, nodeId, mesh }
}

test('a real inner face no longer receives the red missing-back overlay in Modelar', () => {
  const empty = migrateLegacyModel(makeModel({ parts: [] })).document
  const plane = addSceneShape(empty, 'plane', 'roof')
  const node = plane.nodes.at(-1)!
  if (node.kind !== 'mesh') throw new Error('Missing mesh')
  const resource = new SceneRenderResource()
  const overlay = new SceneComponentOverlay()
  try {
    resource.update(plane)
    const original = plane.geometries.find((entry) => entry.id === node.geometryId)!
    if (original.kind !== 'mesh') throw new Error('Missing mesh')
    overlay.update(resource, original, { nodeId: node.id, mode: 'face', ids: [] })
    const before = overlay.root.children[0]?.children[2]
    if (!(before instanceof Mesh)) throw new Error('Missing back overlay')
    expect(before.geometry.getAttribute('position').count).toBe(6)

    const interior = addScenePaintableInterior(plane, node.id)
    resource.update(interior)
    const backed = interior.geometries.find((entry) => entry.id === node.geometryId)!
    if (backed.kind !== 'mesh') throw new Error('Missing mesh')
    overlay.update(resource, backed, { nodeId: node.id, mode: 'face', ids: [] })
    const after = overlay.root.children[0]?.children[2]
    if (!(after instanceof Mesh)) throw new Error('Missing back overlay')
    expect(after.geometry.getAttribute('position').count).toBe(0)
  } finally {
    overlay.dispose()
    resource.dispose()
  }
})

test('a selected edge has its own thick yellow highlight, shared by mirrors and released on selection changes', () => {
  const f = fixture()
  const resource = new SceneRenderResource()
  const overlay = new SceneComponentOverlay()
  try {
    resource.update(f.document)
    const ids = [...meshComponentEdges(f.mesh).keys()]
    overlay.update(resource, f.mesh, { nodeId: f.nodeId, mode: 'edge', ids: [ids[0]!] })
    const line = overlay.root.children[0]?.children[1]
    expect(line instanceof LineSegments2).toBe(true)
    if (!(line instanceof LineSegments2)) throw new Error('Missing thick edge highlight')
    expect(line.material.linewidth).toBeGreaterThanOrEqual(3)
    expect(line.material.color.getHex()).toBe(0xffc21a)
    expect(line.geometry.getAttribute('instanceStart').count).toBe(1)
    const mirror = overlay.root.children[1]?.children[1]
    if (!(mirror instanceof LineSegments2)) throw new Error('Missing mirror highlight')
    expect(mirror.geometry).toBe(line.geometry)
    let disposed = 0
    line.geometry.addEventListener('dispose', () => {
      disposed++
    })
    overlay.setThrough(true)
    expect(line.material.depthTest).toBe(false)
    overlay.update(resource, f.mesh, { nodeId: f.nodeId, mode: 'edge', ids: [ids[0]!, ids[1]!] })
    expect(line.geometry.getAttribute('instanceStart').count).toBe(2)
    expect(disposed).toBe(1)
  } finally {
    overlay.dispose()
    resource.dispose()
  }
})

test('point and edge highlights own their buffers across mode switches, mirrors and twenty open/close cycles', () => {
  const f = fixture()
  const resource = new SceneRenderResource()
  resource.update(f.document)
  let sourceDisposals = 0
  const source = resource.root.children[0]
  if (!(source instanceof Mesh)) throw new Error('Missing mesh')
  source.geometry.addEventListener('dispose', () => sourceDisposals++)
  try {
    for (let cycle = 0; cycle < 20; cycle++) {
      const overlay = new SceneComponentOverlay()
      const id = Object.keys(f.mesh.vertices)[0]!
      const selection = { nodeId: f.nodeId, mode: 'vertex' as const, ids: [id] }
      overlay.update(resource, f.mesh, selection)
      const group = overlay.root.children[0]!
      const highlight = group.children[1]
      const points = group.children[3]
      if (!(highlight instanceof Points) || !(points instanceof Points))
        throw new Error('Missing point markers')
      expect(highlight.geometry.getAttribute('position').count).toBe(1)
      expect(points.geometry.getAttribute('position').count).toBe(8)
      expect((overlay.root.children[1]!.children[1] as Points).geometry).toBe(highlight.geometry)
      const owned = [...new Set(group.children.map((object) => (object as Mesh).geometry))]
      let disposals = 0
      for (const geometry of owned) geometry.addEventListener('dispose', () => disposals++)
      overlay.update(resource, f.mesh, selection)
      expect(overlay.root.children[0]).toBe(group)
      const edge = [...meshComponentEdges(f.mesh).keys()][0]!
      overlay.update(resource, f.mesh, { nodeId: f.nodeId, mode: 'edge', ids: [edge] })
      const line = overlay.root.children[0]!.children[1]
      if (!(line instanceof LineSegments2)) throw new Error('Missing edge marker')
      expect(line.geometry.getAttribute('instanceStart').count).toBe(1)
      let lineDisposals = 0
      line.geometry.addEventListener('dispose', () => lineDisposals++)
      overlay.dispose()
      overlay.dispose()
      expect(disposals).toBe(owned.length)
      expect(lineDisposals).toBe(1)
      expect(overlay.root.children.length).toBe(0)
    }
    expect(sourceDisposals).toBe(0)
  } finally {
    resource.dispose()
  }
})

test('face overlays share their own buffers across mirrors, cache unchanged selection and dispose without touching source attributes', () => {
  const f = fixture()
  const resource = new SceneRenderResource()
  const overlay = new SceneComponentOverlay()
  try {
    resource.update(f.document)
    const source = resource.root.children[0]
    if (!(source instanceof Mesh)) throw new Error('Missing mesh')
    let sourceDisposals = 0
    source.geometry.addEventListener('dispose', () => sourceDisposals++)
    const selection = { nodeId: f.nodeId, mode: 'face' as const, ids: ['px'] }
    overlay.update(resource, f.mesh, selection)
    expect(overlay.root.children).toHaveLength(2)
    const [wire, fill, back] = overlay.root.children[0]!.children
    const [mirrorWire, mirrorFill] = overlay.root.children[1]!.children
    if (
      !(wire instanceof LineSegments) ||
      !(fill instanceof Mesh) ||
      !(back instanceof Mesh) ||
      !(mirrorWire instanceof LineSegments) ||
      !(mirrorFill instanceof Mesh)
    )
      throw new Error('Missing overlays')
    expect(wire.geometry.getAttribute('position').count).toBe(24) // 12 edges, no diagonals
    expect(fill.geometry.getAttribute('position').count).toBe(6)
    const authorial = source.material
    overlay.setThrough(true)
    expect(fill.material.depthTest).toBe(false)
    expect(source.material).toBe(authorial)
    overlay.setThrough(false)
    expect(fill.material.depthTest).toBe(true)
    expect(back.geometry.getAttribute('position')).not.toBe(
      source.geometry.getAttribute('position'),
    )
    expect(back.geometry.getAttribute('position').array).not.toBe(
      source.geometry.getAttribute('position').array,
    )
    expect(mirrorWire.geometry).toBe(wire.geometry)
    expect(mirrorFill.geometry).toBe(fill.geometry)
    expect(overlay.root.children[1]!.matrixWorld.determinant()).toBeLessThan(0)
    const initialFill = fill.geometry
    let fillDisposals = 0
    let wireDisposals = 0
    let backDisposals = 0
    initialFill.addEventListener('dispose', () => fillDisposals++)
    wire.geometry.addEventListener('dispose', () => wireDisposals++)
    back.geometry.addEventListener('dispose', () => backDisposals++)
    overlay.update(resource, f.mesh, selection)
    expect(fill.geometry).toBe(initialFill)
    overlay.update(resource, f.mesh, { ...selection, ids: ['px', 'py'] })
    expect(fill.geometry.getAttribute('position').count).toBe(12)
    expect(fillDisposals).toBe(1)
    expect(mirrorFill.geometry).toBe(fill.geometry)
    overlay.dispose()
    overlay.dispose()
    expect(wireDisposals).toBe(1)
    expect(backDisposals).toBe(1)
    expect(sourceDisposals).toBe(0)
    expect(overlay.root.children).toHaveLength(0)
  } finally {
    overlay.dispose()
    resource.dispose()
  }
})

test('real raycasting selects inside faces and mirrored faces without changing source materials; locked occluders remain solid', () => {
  const f = fixture()
  const resource = new SceneRenderResource()
  const overlay = new SceneComponentOverlay()
  try {
    resource.update(f.document)
    const source = resource.root.children[0]
    if (!(source instanceof Mesh)) throw new Error('Missing mesh')
    const center = new Vector3(0, 0, 0).applyMatrix4(source.matrixWorld)
    // The starter cube spans local [-1,1]; shoot from inside to its +X wall.
    const material = source.material
    expect(overlay.pick(new Raycaster(center, new Vector3(1, 0, 0)), resource, f.nodeId)).toBe('px')
    const mirror = resource.root.children.find((o) => resource.instanceFor(o)?.id === 'mirror')!
    const mirrorCenter = new Vector3().applyMatrix4(mirror.matrixWorld)
    expect(
      overlay.pick(new Raycaster(mirrorCenter, new Vector3(-1, 0, 0)), resource, f.nodeId),
    ).toBe('px')
    expect(source.material).toBe(material)
    const node = f.document.nodes[0]!
    const blocked = setSceneNodeFlag(
      {
        ...f.document,
        nodes: [
          ...f.document.nodes,
          {
            ...node,
            id: 'occluder',
            transform: {
              kind: 'trs',
              translation: [4, 1, 0],
              rotation: [0, 0, 0, 1],
              scale: [1, 1, 1],
            },
          },
        ],
        mirrors: [],
      },
      ['occluder'],
      'locked',
      true,
    )
    resource.update(blocked)
    expect(
      overlay.pick(new Raycaster(new Vector3(10, 1, 0), new Vector3(-1, 0, 0)), resource, f.nodeId),
    ).toBeNull()
  } finally {
    overlay.dispose()
    resource.dispose()
  }
})

test('a selected cylinder cap remains selectable when flush with another piece, while solid foreground still occludes it', () => {
  const f = makeSceneWheelSelection()
  const resource = new SceneRenderResource()
  const overlay = new SceneComponentOverlay()
  const ray = new Raycaster(new Vector3(0.25, 0.4, 5), new Vector3(0, 0, -1))
  try {
    resource.update(setSceneNodeFlag(f.document, [f.bodyId], 'hidden', true))
    const alone = overlay.pick(ray, resource, f.wheelId)
    expect(alone).toMatch(/^top:/)
    overlay.update(resource, f.mesh, { nodeId: f.wheelId, mode: 'face', ids: [alone!] })
    const highlight = overlay.root.children[0]?.children[1]
    expect(highlight instanceof Mesh).toBe(true)
    if (!(highlight instanceof Mesh)) throw new Error('Missing cylinder cap highlight')
    expect(highlight.geometry.getAttribute('position').count).toBe(3)
    resource.update(f.document)
    expect(overlay.pick(ray, resource, f.wheelId)).toBe(alone)
    const covered = {
      ...f.document,
      nodes: f.document.nodes.map((node) =>
        node.id === f.bodyId
          ? {
              ...node,
              transform: {
                kind: 'trs' as const,
                translation: [0, 1, 0.25] as [number, number, number],
                rotation: [0, 0, 0, 1] as [number, number, number, number],
                scale: [2, 1, 1] as [number, number, number],
              },
            }
          : node,
      ),
    }
    resource.update(covered)
    expect(overlay.pick(ray, resource, f.wheelId)).toBeNull()
    expect(overlay.pick(ray, resource, f.wheelId, true)).toBe(alone)
  } finally {
    overlay.dispose()
    resource.dispose()
  }
})

test('unrenderable loose-edge coordinates report precision errors, never upload Infinity or mutate authorial data', () => {
  const f = fixture()
  const mesh = {
    ...f.mesh,
    vertices: { ...f.mesh.vertices, enormous: [1e100, 0, 0] as [number, number, number] },
    looseEdges: [['enormous', Object.keys(f.mesh.vertices)[0]!] as [string, string]],
  }
  const source = {
    ...f.document,
    geometries: f.document.geometries.map((g) => (g.id === mesh.id ? mesh : g)),
  }
  const resource = new SceneRenderResource()
  const overlay = new SceneComponentOverlay()
  try {
    resource.update(source)
    expect(() =>
      overlay.update(resource, mesh, { nodeId: f.nodeId, mode: 'face' as const, ids: [] }),
    ).toThrow('precisão')
    expect(overlay.root.children).toHaveLength(0)
    expect(mesh.vertices.enormous).toEqual([1e100, 0, 0])
  } finally {
    overlay.dispose()
    resource.dispose()
  }
})
