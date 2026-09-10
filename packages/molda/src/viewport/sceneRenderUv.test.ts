import { expect, test } from 'bun:test'
import { BufferAttribute, Mesh, Raycaster, Vector3 } from 'three'
import { editSceneMesh } from '../scene/commands'
import type { MoldaSceneDocument, SceneMeshGeometry } from '../scene/document'
import { buildSceneGeometry } from '../scene/geometry'
import { identityMatrix } from '../scene/matrix'
import { mapMeshUv } from '../scene/meshUv'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { makeModel } from '../testing/fixtures'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import { SceneRenderResource } from './sceneRenderResource'

function fixture() {
  const mesh = makeSceneGridGeometry(2)
  const base = migrateLegacyModel(makeModel()).document
  const node = base.nodes.find((n) => n.kind === 'mesh')!
  const material = base.materials.find((m) => m.colorImageId !== undefined)!
  const document: MoldaSceneDocument = {
    ...base,
    nodes: [
      {
        ...node,
        kind: 'mesh',
        geometryId: mesh.id,
        materialId: material.id,
        parentId: null,
        transform: { kind: 'affine', matrix: identityMatrix() },
      },
    ],
    geometries: [mesh],
    mirrors: [],
  }
  return {
    mesh,
    material,
    document,
    withMesh: (mesh: SceneMeshGeometry) => ({ ...document, geometries: [mesh] }),
  }
}
function drawn(resource: SceneRenderResource, i = 0) {
  const object = resource.root.children[i]
  if (!(object instanceof Mesh)) throw new Error('Missing draw mesh')
  return object
}
function uvAttribute(object: Mesh) {
  const uv = object.geometry.getAttribute('uv')
  if (!(uv instanceof BufferAttribute)) throw new Error('Missing UV attribute')
  return uv
}

test('UV edits retain geometry, attributes, bounds, groups and materials; real raycast sees new UV and undo', () => {
  const f = fixture(),
    resource = new SceneRenderResource()
  try {
    resource.update(f.document)
    const object = drawn(resource),
      original = object.geometry,
      material = object.material
    const position = original.getAttribute('position'),
      normal = original.getAttribute('normal'),
      uv = uvAttribute(object)
    const bounds = original.boundingBox,
      sphere = original.boundingSphere,
      groups = original.groups
    let disposed = 0
    original.addEventListener('dispose', () => disposed++)
    const ray = new Raycaster(new Vector3(0.1, 0.1, 1), new Vector3(0, 0, -1))
    const first = ray.intersectObject(object)[0]!
    expect(first.uv).toBeDefined()
    const changed = mapMeshUv(f.mesh, Object.keys(f.mesh.faces), (uv) => [
      uv[0] + 0.25,
      uv[1] - 0.5,
    ])
    resource.update(f.withMesh(changed))
    const hit = ray.intersectObject(object)[0]!
    expect(hit.uv!.x).toBeCloseTo(first.uv!.x + 0.25, 6)
    expect(hit.uv!.y).toBeCloseTo(first.uv!.y - 0.5, 6)
    expect(resource.faceFor(object, hit.faceIndex!)).toBe('f_0_0')
    expect(object.geometry).toBe(original)
    expect(original.getAttribute('position')).toBe(position)
    expect(original.getAttribute('normal')).toBe(normal)
    expect(original.getAttribute('uv')).toBe(uv)
    expect(original.boundingBox).toBe(bounds)
    expect(original.boundingSphere).toBe(sphere)
    expect(original.groups).toBe(groups)
    expect(object.material).toBe(material)
    expect(uv.array).toEqual(buildSceneGeometry(changed).uvs)
    resource.update(f.document)
    expect(uv.array).toEqual(buildSceneGeometry(f.mesh).uvs)
    expect(object.geometry).toBe(original)
    expect(disposed).toBe(0)
    resource.dispose()
    resource.dispose()
    expect(disposed).toBe(1)
  } finally {
    resource.dispose()
  }
})

test('pending uploads coalesce into one bounded envelope until upload, including pre-first-draw and hidden edits', () => {
  const f = fixture(),
    resource = new SceneRenderResource()
  try {
    resource.update(f.document)
    const uv = uvAttribute(drawn(resource))
    const changed = mapMeshUv(f.mesh, ['f_0_0'], (uv, _id, i) => (i ? uv : [0.25, 0.5]))
    resource.update(f.withMesh(changed))
    expect(uv.updateRanges).toEqual([{ start: 0, count: 8 }])
    uv.onUploadCallback()
    expect(uv.updateRanges).toEqual([])
    let next = changed
    for (let i = 1; i <= 100; i++) {
      next = mapMeshUv(next, [i % 2 ? 'f_0_0' : 'f_1_1'], (uv, _id, corner) =>
        corner ? uv : [i / 101, i / 103],
      )
      resource.update({
        ...f.withMesh(next),
        nodes: f.document.nodes.map((node) => ({ ...node, hidden: true })),
      })
      expect(uv.updateRanges).toHaveLength(1)
    }
    expect(uv.updateRanges).toEqual([{ start: 0, count: 44 }])
    expect(uv.array).toEqual(buildSceneGeometry(next).uvs)
    uv.onUploadCallback()
    const version = uv.version
    resource.update({ ...f.withMesh(next), nodes: f.document.nodes })
    expect(uv.version).toBe(version)
    expect(uv.updateRanges).toEqual([])
  } finally {
    resource.dispose()
  }
})

test('all fallible geometry and image preparation finishes before any live UV patch is applied', () => {
  const f = fixture(),
    resource = new SceneRenderResource()
  try {
    const other = { ...f.mesh, id: 'other' }
    const document: MoldaSceneDocument = {
      ...f.document,
      geometries: [f.mesh, other],
      nodes: [
        ...f.document.nodes,
        {
          ...f.document.nodes[0]!,
          id: 'otherNode',
          kind: 'mesh',
          geometryId: 'other',
          materialId: f.document.materials[0]!.id,
        },
      ],
    }
    resource.update(document)
    const object = drawn(resource),
      uv = uvAttribute(object),
      before = uv.array.slice(),
      version = uv.version
    const changed = mapMeshUv(f.mesh, ['f_0_0'], () => [0.3, 0.7])
    const broken = mapMeshUv(other, ['f_1_1'], () => [1e308, 0])
    expect(() => resource.update({ ...document, geometries: [changed, broken] })).toThrow(
      'precisão',
    )
    expect(uv.array).toEqual(before)
    expect(uv.version).toBe(version)
    expect(uv.updateRanges).toEqual([])
    const image = document.images.find((image) => image.id === f.material.colorImageId)!
    expect(image).toBeDefined()
    expect(() =>
      resource.update({
        ...document,
        geometries: [changed, other],
        images: document.images.map((i) =>
          i === image
            ? { ...i, flipbook: { frameWidth: 0, frameHeight: 1, frames: [0], fps: 8, loop: true } }
            : i,
        ),
      }),
    ).toThrow()
    expect(uv.array).toEqual(before)
    expect(uv.version).toBe(version)
    resource.update({ ...document, geometries: [changed, other] })
    expect(uv.array).toEqual(buildSceneGeometry(changed).uvs)
  } finally {
    resource.dispose()
  }
})

test('COW makes one independent resource; later UV edits reuse it and undo retires only that resource', () => {
  const f = fixture(),
    resource = new SceneRenderResource()
  try {
    const document: MoldaSceneDocument = {
      ...f.document,
      nodes: [...f.document.nodes, { ...f.document.nodes[0]!, id: 'locked', locked: true }],
    }
    resource.update(document)
    const first = drawn(resource),
      locked = drawn(resource, 1),
      shared = locked.geometry
    expect(first.geometry).toBe(shared)
    const changed = editSceneMesh(
      document,
      document.nodes[0]!.id,
      (mesh) => mapMeshUv(mesh, ['f_0_0'], () => [0.3, 0.7]),
      () => 'own',
    )
    resource.update(changed)
    const own = first.geometry
    expect(own).not.toBe(shared)
    expect(locked.geometry).toBe(shared)
    let retired = 0
    own.addEventListener('dispose', () => retired++)
    const next = editSceneMesh(changed, document.nodes[0]!.id, (mesh) =>
      mapMeshUv(mesh, ['f_1_1'], () => [0.4, 0.6]),
    )
    resource.update(next)
    expect(first.geometry).toBe(own)
    expect(locked.geometry).toBe(shared)
    expect(uvAttribute(locked).array).toEqual(buildSceneGeometry(f.mesh).uvs)
    resource.update(document)
    expect(first.geometry).toBe(shared)
    expect(retired).toBe(1)
    resource.dispose()
    expect(retired).toBe(1)
  } finally {
    resource.dispose()
  }
})

test('Float32-invisible authorial edits avoid uploads; spatial or material changes rebuild normally', () => {
  const f = fixture(),
    resource = new SceneRenderResource()
  try {
    resource.update(f.document)
    const object = drawn(resource),
      original = object.geometry,
      uv = uvAttribute(object),
      version = uv.version
    const tiny = mapMeshUv(f.mesh, ['f_0_0'], (uv) => [uv[0] + Number.MIN_VALUE, uv[1]])
    resource.update(f.withMesh(tiny))
    expect(uv.version).toBe(version)
    expect(object.geometry).toBe(original)
    const moved = {
      ...tiny,
      vertices: { ...tiny.vertices, v_0_0: [-0.1, -0.1, 0] as [number, number, number] },
    }
    resource.update(f.withMesh(moved))
    expect(object.geometry).not.toBe(original)
    expect(object.geometry.getAttribute('position').array).toEqual(
      buildSceneGeometry(moved).positions,
    )
    const spatial = object.geometry
    const material = {
      ...moved,
      faces: {
        ...moved.faces,
        f_0_0: { ...moved.faces.f_0_0!, materialId: f.document.materials[0]!.id },
      },
    }
    resource.update(f.withMesh(material))
    expect(object.geometry).not.toBe(spatial)
  } finally {
    resource.dispose()
  }
})
