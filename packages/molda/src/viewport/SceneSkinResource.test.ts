import { expect, test } from 'bun:test'
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
} from 'three'
import type { SceneMeshGeometry } from '../scene/document'
import { buildSceneGeometry } from '../scene/geometry'
import { indexSceneNodes } from '../scene/graph'
import { type AffineMatrix, identityMatrix } from '../scene/matrix'
import { bindSceneSkin } from '../scene/skinBinding'
import { deformSceneSkin, prepareSceneSkin } from '../scene/skinPose'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { SceneSkinResource } from './SceneSkinResource'

function fixture() {
  const { document, input } = makeSceneSkinFixture(),
    source = document.geometries[0] as SceneMeshGeometry,
    prepared = prepareSceneSkin(document, bindSceneSkin(document, input)),
    buffers = buildSceneGeometry(source),
    base = new BufferGeometry()
  base.setAttribute('position', new BufferAttribute(buffers.positions, 3))
  base.setAttribute('normal', new BufferAttribute(buffers.normals, 3))
  base.setAttribute('uv', new BufferAttribute(buffers.uvs, 2))
  base.addGroup(0, buffers.positions.length / 3, 0)
  const material = new MeshBasicMaterial({ side: DoubleSide }),
    rest = indexSceneNodes(document.nodes).worldMatrices
  return { document, source, prepared, buffers, base, material, rest }
}

test('real skinned instances share only their binding resources, keep animated picking bounds and do not rebuild attributes over 120 poses', () => {
  const f = fixture(),
    first = new SceneSkinResource(f.prepared, f.source, f.buffers, f.base),
    second = new SceneSkinResource(f.prepared, f.source, f.buffers, f.base),
    root = new Group(),
    before = structuredClone(f.document)
  try {
    expect(() => first.createMesh(f.material)).toThrow('Prepare a pose')
    first.setPose(f.rest)
    second.setPose(f.rest)
    expect(first.setPose(f.rest)).toBe(false)
    const a = first.createMesh(f.material),
      mirror = first.createMesh(f.material),
      b = second.createMesh(f.material)
    root.add(a, mirror, b)
    mirror.matrix.makeScale(-1, 1, 1)
    mirror.matrix.setPosition(3, 0, 0)
    root.updateMatrixWorld(true)
    expect(a.geometry === mirror.geometry && a.skeleton === mirror.skeleton).toBe(true)
    expect(a.geometry === b.geometry || a.skeleton === b.skeleton).toBe(false)
    expect(a.material === f.material && b.material === f.material).toBe(true)
    for (const name of ['position', 'normal', 'uv']) {
      expect(a.geometry.getAttribute(name).array === f.base.getAttribute(name).array).toBe(false)
      expect(a.geometry.getAttribute(name).array).toEqual(f.base.getAttribute(name).array)
    }
    const attributes = Object.entries(a.geometry.attributes).map(([name, attribute]) => {
        if (!(attribute instanceof BufferAttribute))
          throw new Error('Expected owned buffer attribute')
        return { name, attribute, array: attribute.array, version: attribute.version }
      }),
      geometry = a.geometry,
      skeleton = a.skeleton,
      boneMatrices = a.skeleton.boneMatrices,
      originalB = b.getVertexPosition(0, new Vector3()).toArray(),
      box = a.boundingBox,
      sphere = a.boundingSphere
    for (let frame = 0; frame <= 120; frame++) {
      const pose = new Map(f.rest),
        transform = identityMatrix()
      transform[12] = frame / 30
      transform[13] = 1
      pose.set('lower', transform)
      first.setPose(pose)
      const expected = deformSceneSkin(f.prepared, pose)
      for (let drawVertex = 0; drawVertex < f.buffers.cornerIndices.length; drawVertex++) {
        const face = f.source.faces[f.buffers.faceIds[Math.floor(drawVertex / 3)]!]!,
          id = face.corners[f.buffers.cornerIndices[drawVertex]!]!.vertexId,
          vertex = f.prepared.vertexIds.indexOf(id),
          value = a.getVertexPosition(drawVertex, new Vector3())
        for (const [axis, component] of value.toArray().entries())
          expect(component).toBeCloseTo(expected[vertex * 3 + axis]!, 5)
        expect(a.boundingBox!.containsPoint(value)).toBe(true)
        expect(a.boundingSphere!.containsPoint(value)).toBe(true)
        expect(mirror.getVertexPosition(drawVertex, new Vector3()).toArray()).toEqual(
          value.toArray(),
        )
      }
      expect(b.getVertexPosition(0, new Vector3()).toArray()).toEqual(originalB)
    }
    expect(
      a.geometry === geometry &&
        a.skeleton === skeleton &&
        a.skeleton.boneMatrices === boneMatrices,
    ).toBe(true)
    expect(a.boundingBox === box && a.boundingSphere === sphere).toBe(true)
    for (const { name, attribute, array, version } of attributes) {
      expect(
        a.geometry.getAttribute(name) === attribute &&
          attribute.array === array &&
          attribute.version === version,
      ).toBe(true)
    }
    const p0 = a.getVertexPosition(0, new Vector3()),
      p1 = a.getVertexPosition(1, new Vector3()),
      p2 = a.getVertexPosition(2, new Vector3()),
      center = p0
        .clone()
        .add(p1)
        .add(p2)
        .multiplyScalar(1 / 3),
      normal = p1.clone().sub(p0).cross(p2.clone().sub(p0)).normalize(),
      hits = new Raycaster(center.clone().add(normal), normal.clone().negate()).intersectObject(
        a,
        false,
      )
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0]!.uv !== undefined).toBe(true)
    first.releaseMesh(mirror)
    expect(mirror.parent === null && a.parent === root && b.parent === root).toBe(true)
    expect(f.document).toEqual(before)
  } finally {
    first.dispose()
    second.dispose()
    f.base.dispose()
    f.material.dispose()
  }
})

test('failed poses leave every live bone/bound untouched and disposal releases only owned geometry/bone texture once', () => {
  const f = fixture(),
    resource = new SceneSkinResource(f.prepared, f.source, f.buffers, f.base),
    root = new Group()
  let geometryDisposals = 0,
    textureDisposals = 0,
    baseDisposals = 0,
    materialDisposals = 0
  resource.geometry.addEventListener('dispose', () => {
    geometryDisposals++
  })
  f.base.addEventListener('dispose', () => {
    baseDisposals++
  })
  f.material.addEventListener('dispose', () => {
    materialDisposals++
  })
  try {
    resource.setPose(f.rest)
    const mesh = resource.createMesh(f.material)
    root.add(mesh)
    resource.skeleton.computeBoneTexture()
    resource.skeleton.boneTexture!.addEventListener('dispose', () => {
      textureDisposals++
    })
    const bones = resource.skeleton.bones.map((bone) => bone.matrixWorld.toArray()),
      box = mesh.boundingBox!.clone(),
      sphere = mesh.boundingSphere!.clone(),
      matrices = resource.skeleton.boneMatrices!.slice()
    const bad = new Map(f.rest),
      huge = identityMatrix()
    huge[0] = 1e100
    bad.set('lower', huge)
    expect(() => resource.setPose(bad)).toThrow('precisão')
    expect(resource.skeleton.bones.map((bone) => bone.matrixWorld.toArray())).toEqual(bones)
    expect(resource.skeleton.boneMatrices).toEqual(matrices)
    expect(mesh.boundingBox!.equals(box) && mesh.boundingSphere!.equals(sphere)).toBe(true)
    const missing = new Map(f.rest)
    missing.delete('upper')
    expect(() => resource.setPose(missing)).toThrow('não contém')
    const moved = new Map(f.rest),
      move = [...f.rest.get('lower')!] as AffineMatrix
    move[12] += 1
    moved.set('lower', move)
    const version = resource.skeleton.boneTexture!.version
    resource.setPose(moved)
    expect(resource.skeleton.boneTexture!.version).toBeGreaterThan(version)
    resource.dispose()
    resource.dispose()
    expect([geometryDisposals, textureDisposals, baseDisposals, materialDisposals]).toEqual([
      1, 1, 0, 0,
    ])
    expect(root.children.length).toBe(0)
    expect(() => resource.createMesh(f.material)).toThrow()
    expect(() => resource.setPose(f.rest)).toThrow('descartado')
  } finally {
    resource.dispose()
    f.base.dispose()
    f.material.dispose()
  }
})

test('a foreign or indexed base cannot silently supply different positions to the prepared skin', () => {
  const f = fixture(),
    foreign = f.base.clone()
  try {
    expect(() => new SceneSkinResource(f.prepared, f.source, f.buffers, foreign)).toThrow(
      'outra malha',
    )
    f.base.setIndex([0, 1, 2])
    expect(() => new SceneSkinResource(f.prepared, f.source, f.buffers, f.base)).toThrow(
      'expandidos',
    )
  } finally {
    foreign.dispose()
    f.base.dispose()
    f.material.dispose()
  }
})

test('prepared poses do not mutate live state and cannot cross an intervening pose or disposal', () => {
  const f = fixture(),
    resource = new SceneSkinResource(f.prepared, f.source, f.buffers, f.base)
  try {
    resource.setPose(f.rest)
    const before = resource.skeleton.boneMatrices!.slice(),
      world = new Map(f.rest),
      matrix = [...world.get('lower')!] as AffineMatrix
    matrix[12] += 0.5
    world.set('lower', matrix)
    const prepared = resource.preparePose(world)
    expect(resource.skeleton.boneMatrices).toEqual(before)
    expect(prepared()).toBe(true)
    expect(prepared()).toBe(false)
    expect(resource.skeleton.boneMatrices).not.toEqual(before)
    const stale = resource.preparePose(f.rest)
    const newer = new Map(world),
      shifted = [...matrix] as AffineMatrix
    shifted[12] += 0.25
    newer.set('lower', shifted)
    resource.setPose(newer)
    const current = resource.skeleton.boneMatrices!.slice()
    expect(() => stale()).toThrow('outro instante')
    expect(resource.skeleton.boneMatrices).toEqual(current)
    const disposed = resource.preparePose(f.rest)
    resource.dispose()
    expect(() => disposed()).toThrow('descartado')
  } finally {
    resource.dispose()
    f.base.dispose()
    f.material.dispose()
  }
})

test('draw instance ownership is bounded, released slots are reusable and foreign releases do nothing', () => {
  const f = fixture(),
    resource = new SceneSkinResource(f.prepared, f.source, f.buffers, f.base),
    other = new SceneSkinResource(f.prepared, f.source, f.buffers, f.base)
  try {
    resource.setPose(f.rest)
    other.setPose(f.rest)
    const copies = Array.from({ length: 128 }, () => resource.createMesh(f.material)),
      foreign = other.createMesh(f.material),
      root = new Group()
    root.add(foreign)
    expect(() => resource.createMesh(f.material)).toThrow('cópias demais')
    resource.releaseMesh(foreign)
    expect(foreign.parent === root).toBe(true)
    expect(() => resource.createMesh(f.material)).toThrow('cópias demais')
    resource.releaseMesh(copies[0]!)
    resource.releaseMesh(copies[0]!)
    expect(resource.createMesh(f.material).skeleton === resource.skeleton).toBe(true)
    expect(() => resource.createMesh(f.material)).toThrow('cópias demais')
  } finally {
    resource.dispose()
    other.dispose()
    f.base.dispose()
    f.material.dispose()
  }
})
