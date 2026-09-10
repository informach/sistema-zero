import { expect, test } from 'bun:test'
import { type Intersection, Mesh, Raycaster, SkinnedMesh, Vector3 } from 'three'
import type { Vec3 } from '../core/model'
import { addSceneMirror, deleteSceneNodes } from '../scene/commands'
import { mapMeshUv } from '../scene/meshUv'
import { prepareSceneAnimation } from '../scene/sampleAnimation'
import { createSceneSkin } from '../scene/skinCommands'
import { sceneAnimationClip } from '../testing/sceneAnimation'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { SceneRenderResource } from './sceneRenderResource'

function fields(hits: Intersection[]) {
  return hits.map(({ object, ...hit }) => ({ ...hit, objectId: object.uuid }))
}

function drawn(resource: SceneRenderResource, id = 'part-0') {
  const object = resource.root.children.find((object) => resource.instanceFor(object)?.id === id)
  if (!(object instanceof Mesh)) throw new Error(`Missing draw mesh ${id}`)
  return object
}

function check(resource: SceneRenderResource, object = drawn(resource)) {
  const points = [0, 1, 2].map((i) =>
    object.getVertexPosition(i, new Vector3()).applyMatrix4(object.matrixWorld),
  )
  const center = points[0]!
    .clone()
    .add(points[1]!)
    .add(points[2]!)
    .multiplyScalar(1 / 3)
  const normal = points[1]!
    .clone()
    .sub(points[0]!)
    .cross(points[2]!.clone().sub(points[0]!))
    .normalize()
  // Native front-face testing is local; mirrored world winding has the opposite sign.
  if (object.matrixWorld.determinant() < 0) normal.negate()
  const ray = new Raycaster(center.addScaledVector(normal, 5), normal.negate())
  const expected = ray.intersectObjects(resource.root.children, false)
  const actual = resource.surfaceIntersections(ray)
  expect(fields(actual)).toEqual(fields(expected))
  expect(actual.length).toBeGreaterThan(0)
  return { hits: actual, ray }
}

test('UV-only reuse, geometry replacement, undo, shared mirrors, removal and independent sessions', () => {
  const fixture = makeSceneSkinFixture()
  const source = addSceneMirror(fixture.document, 'part-0', {
    axis: 'x',
    offset: 3,
    nextId: () => 'mirror',
  })
  const original = structuredClone(source)
  const mesh = source.geometries[0]!
  if (mesh.kind !== 'mesh') throw new Error('Expected mesh')
  const resource = new SceneRenderResource()
  const independent = new SceneRenderResource()
  try {
    resource.update(source)
    independent.update(source)
    const object = drawn(resource)
    const geometry = object.geometry
    const before = check(resource).hits[0]!.uv!.clone()
    check(resource, drawn(resource, 'mirror'))
    const uv = mapMeshUv(mesh, Object.keys(mesh.faces), ([u, v]) => [u + 0.25, v - 0.5])
    resource.update({ ...source, geometries: [uv] })
    expect(drawn(resource).geometry).toBe(geometry)
    expect(check(resource).hits[0]!.uv).not.toEqual(before)
    expect(check(independent).hits[0]!.uv).toEqual(before)
    const moved = {
      ...mesh,
      vertices: Object.fromEntries(
        Object.entries(mesh.vertices).map(([id, [x, y, z]]) => [
          id,
          [x + 5, y, z + 2] satisfies Vec3,
        ]),
      ),
    }
    resource.update({ ...source, geometries: [moved] })
    expect(drawn(resource).geometry).not.toBe(geometry)
    check(resource)
    check(resource, drawn(resource, 'mirror'))
    resource.update(source)
    expect(check(resource).hits[0]!.uv).toEqual(before)
    const { ray } = check(resource)
    resource.update(deleteSceneNodes(source, ['part-0']))
    expect(resource.surfaceIntersections(ray)).toEqual([])
    resource.dispose()
    resource.dispose()
    expect(resource.surfaceIntersections(ray)).toEqual([])
    expect(source).toEqual(original)
  } finally {
    resource.dispose()
    independent.dispose()
  }
})

test.each([
  false,
  true,
])('animated and form-base surfaces match native picking, skin=%s', (skin) => {
  const {
    document,
    input: { id, ...input },
  } = makeSceneSkinFixture()
  const source = addSceneMirror(
    skin ? createSceneSkin(document, input, () => id) : document,
    'part-0',
    {
      axis: 'x',
      offset: 3,
      nextId: () => 'mirror',
    },
  )
  source.animations = [sceneAnimationClip(skin ? 'lower' : 'rig')]
  const original = structuredClone(source)
  const resource = new SceneRenderResource()
  try {
    resource.update(source)
    expect(drawn(resource) instanceof SkinnedMesh).toBe(skin)
    check(resource)
    resource.setFormBase('part-0')
    expect(drawn(resource) instanceof SkinnedMesh).toBe(false)
    check(resource)
    check(resource, drawn(resource, 'mirror'))
    resource.setFormBase(null)
    const clip = prepareSceneAnimation(source, 'clip')
    for (const time of [0, 0.1, 0.73, 1.123456789123, 1.5, 2]) {
      resource.setPose(clip.sample(time, false))
      check(resource)
      check(resource, drawn(resource, 'mirror'))
    }
    resource.setPose(null)
    resource.setFormBase('part-0')
    check(resource)
    expect(source).toEqual(original)
  } finally {
    resource.dispose()
  }
})

test('coincident surfaces retain root order, native unowned meshes and invisible occluders', () => {
  const { document } = makeSceneSkinFixture()
  const node = document.nodes[0]!
  document.nodes.push({ ...node, id: 'coincident' })
  const resource = new SceneRenderResource()
  try {
    resource.update(document)
    const first = drawn(resource)
    const second = drawn(resource, 'coincident')
    expect(
      check(resource)
        .hits.slice(0, 2)
        .map((hit) => hit.object.uuid),
    ).toEqual([first.uuid, second.uuid])
    resource.root.remove(first)
    resource.root.add(first)
    expect(
      check(resource)
        .hits.slice(0, 2)
        .map((hit) => hit.object.uuid),
    ).toEqual([second.uuid, first.uuid])
    const foreign = new Mesh(first.geometry, first.material)
    foreign.matrixAutoUpdate = false
    foreign.matrix.copy(first.matrix)
    resource.root.add(foreign)
    resource.root.updateMatrixWorld(true)
    const visible = check(resource).hits
    expect(visible.some((hit) => hit.object === foreign)).toBe(true)
    second.visible = false
    const hidden = check(resource).hits
    expect(hidden[0]!.object).toBe(second)
    expect(hidden.find((hit) => hit.object.visible)!.object).toBe(first)
  } finally {
    resource.dispose()
  }
})
