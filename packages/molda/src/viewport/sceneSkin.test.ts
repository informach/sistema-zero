import { expect, test } from 'bun:test'
import { BufferAttribute, Mesh, Raycaster, SkinnedMesh, Vector3 } from 'three'
import { sceneBounds } from '../scene/bounds'
import {
  addSceneMirror,
  deleteSceneNodes,
  editSceneMesh,
  removeSceneMirrors,
  transformSceneNodes,
} from '../scene/commands'
import type { MoldaSceneDocument, SceneMeshGeometry } from '../scene/document'
import { indexSceneDocument } from '../scene/documentIndex'
import { buildSceneGeometry } from '../scene/geometry'
import { identityMatrix } from '../scene/matrix'
import { mapMeshUv } from '../scene/meshUv'
import { prepareSceneAnimation } from '../scene/sampleAnimation'
import {
  addSceneSkinJoint,
  createSceneSkin,
  removeSceneSkin,
  removeSceneSkinJoint,
  renameSceneSkin,
  setSceneSkinWeights,
} from '../scene/skinCommands'
import { deformSceneSkin, prepareSceneSkin } from '../scene/skinPose'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { SceneRenderResource } from './sceneRenderResource'

function fixture() {
  const {
      document,
      input: { id, ...input },
    } = makeSceneSkinFixture(),
    painted = makeSceneGlbFixture(1, 1, 0, 2)
  document.materials = painted.materials.map((material) => ({ ...material, doubleSided: true }))
  document.images = painted.images
  document.animations = [
    {
      id: 'clip',
      name: 'Dobrar',
      space: 'local-delta',
      duration: 2,
      fps: 24,
      loop: true,
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
  return addSceneMirror(
    createSceneSkin(document, input, () => id),
    'part-0',
    { axis: 'x', offset: 0, nextId: () => 'mirror' },
  )
}

function drawn(resource: SceneRenderResource, id = 'part-0') {
  const mesh = resource.root.children.find((object) => resource.instanceFor(object)?.id === id)
  if (!(mesh instanceof SkinnedMesh)) throw new Error(`Expected skinned mesh ${id}`)
  return mesh
}
function attribute(mesh: Mesh, name: string) {
  const value = mesh.geometry.getAttribute(name)
  if (!(value instanceof BufferAttribute)) throw new Error(`Expected buffer attribute ${name}`)
  return value
}

test('joint membership revisions preserve posed corners and material resources for the original and its mirror', () => {
  const source = fixture(),
    resource = new SceneRenderResource(),
    independent = new SceneRenderResource()
  try {
    resource.update(source)
    independent.update(source)
    resource.setPose(prepareSceneAnimation(source, 'clip').sample(0.75, false))
    const first = drawn(resource),
      materials = first.material,
      before = Array.from({ length: attribute(first, 'position').count }, (_, i) =>
        first.getVertexPosition(i, new Vector3()).toArray(),
      ),
      other = drawn(independent),
      independentPoint = other.getVertexPosition(0, new Vector3()).toArray(),
      geometry = first.geometry,
      next = addSceneSkinJoint(source, 'skin', 'rig')
    let disposed = 0
    geometry.addEventListener('dispose', () => {
      disposed++
    })
    expect(resource.update(next)).toEqual([])
    expect(disposed).toBe(1)
    resource.setPose(prepareSceneAnimation(next, 'clip').sample(0.75, false))
    const added = drawn(resource)
    expect(added.material.length).toBe(materials.length)
    for (let i = 0; i < materials.length; i++) expect(added.material[i]).toBe(materials[i])
    expect(added.skeleton.bones).toHaveLength(3)
    expect(drawn(resource, 'mirror').skeleton).toBe(added.skeleton)
    expect(
      Array.from({ length: before.length }, (_, i) =>
        added.getVertexPosition(i, new Vector3()).toArray(),
      ),
    ).toEqual(before)
    const removed = removeSceneSkinJoint(next, 'skin', 'rig')
    expect(resource.update(removed)).toEqual([])
    resource.setPose(prepareSceneAnimation(removed, 'clip').sample(0.75, false))
    const final = drawn(resource)
    for (let i = 0; i < materials.length; i++) expect(final.material[i]).toBe(materials[i])
    expect(final.skeleton.bones).toHaveLength(2)
    expect(
      Array.from({ length: before.length }, (_, i) =>
        final.getVertexPosition(i, new Vector3()).toArray(),
      ),
    ).toEqual(before)
    expect(other.getVertexPosition(0, new Vector3()).toArray()).toEqual(independentPoint)
  } finally {
    resource.dispose()
    independent.dispose()
  }
})

test('native skin rendering uses the existing timeline, mirrors and picking without per-pose attribute or texture rebuilds', () => {
  const document = fixture(),
    original = structuredClone(document),
    a = new SceneRenderResource(),
    b = new SceneRenderResource()
  try {
    expect(a.update(document)).toEqual([])
    b.update(document)
    const mesh = drawn(a),
      mirror = drawn(a, 'mirror'),
      independent = drawn(b),
      attributes = Object.keys(mesh.geometry.attributes).map((name) => ({
        name,
        attribute: attribute(mesh, name),
        array: attribute(mesh, name).array,
        version: attribute(mesh, name).version,
      })),
      geometry = mesh.geometry,
      skeleton = mesh.skeleton,
      boneMatrices = skeleton.boneMatrices,
      material = mesh.material,
      texture = material[0]!.map!,
      pixels = texture.image.data,
      textureVersion = texture.version,
      prepared = prepareSceneSkin(document, document.skins![0]!),
      buffers = buildSceneGeometry(document.geometries[0]!),
      compiled = prepareSceneAnimation(document, 'clip'),
      still = independent.getVertexPosition(0, new Vector3()).clone()
    expect(mirror.geometry).toBe(geometry)
    expect(mirror.skeleton).toBe(skeleton)
    expect(independent.geometry === geometry || independent.skeleton === skeleton).toBe(false)
    for (let i = 0; i <= 120; i++) {
      const pose = compiled.sample(i / 60, false)
      a.setPose(pose)
      const expected = deformSceneSkin(prepared, pose.worldMatrices)
      for (let corner = 0; corner < buffers.positions.length / 3; corner++) {
        const face = (document.geometries[0] as SceneMeshGeometry).faces[
            buffers.faceIds[Math.floor(corner / 3)]!
          ]!,
          vertex = prepared.vertexIds.indexOf(
            face.corners[buffers.cornerIndices[corner]!]!.vertexId,
          ),
          point = mesh.getVertexPosition(corner, new Vector3())
        for (const axis of [0, 1, 2] as const)
          expect(point.getComponent(axis)).toBeCloseTo(expected[vertex * 3 + axis]!, 5)
        expect(mesh.boundingBox!.containsPoint(point)).toBe(true)
      }
    }
    expect(independent.getVertexPosition(0, new Vector3())).toEqual(still)
    for (const entry of attributes) {
      expect(attribute(mesh, entry.name)).toBe(entry.attribute)
      expect(entry.attribute.array).toBe(entry.array)
      expect(entry.attribute.version).toBe(entry.version)
    }
    expect(mesh.geometry).toBe(geometry)
    expect(mesh.skeleton).toBe(skeleton)
    expect(skeleton.boneMatrices).toBe(boneMatrices)
    expect(mesh.material).toBe(material)
    expect(texture.image.data).toBe(pixels)
    expect(texture.version).toBe(textureVersion)
    const points = [0, 1, 2].map((i) =>
        mesh.getVertexPosition(i, new Vector3()).applyMatrix4(mesh.matrixWorld),
      ),
      center = points[0]!
        .clone()
        .add(points[1]!)
        .add(points[2]!)
        .multiplyScalar(1 / 3),
      normal = points[1]!
        .clone()
        .sub(points[0]!)
        .cross(points[2]!.clone().sub(points[0]!))
        .normalize(),
      ray = new Raycaster(center.clone().addScaledVector(normal, 2), normal.clone().negate()),
      hit = ray.intersectObject(mesh)[0]!
    expect(hit).toBeDefined()
    expect(a.faceFor(mesh, hit.faceIndex!)).toBe(buffers.faceIds[hit.faceIndex!]!)
    expect(a.materialFor(mesh, hit.faceIndex!)).toBe('material')
    expect(hit.uv).toBeDefined()
    const worldPoint = mesh.getVertexPosition(0, new Vector3()).applyMatrix4(mesh.matrixWorld),
      reflected = mirror.getVertexPosition(0, new Vector3()).applyMatrix4(mirror.matrixWorld)
    expect(reflected.x).toBeCloseTo(-worldPoint.x, 12)
    expect(reflected.y).toBeCloseTo(worldPoint.y, 12)
    expect(a.setPose(null)).toBe(true)
    expect(a.setPose(null)).toBe(false)
    expect(document).toEqual(original)
  } finally {
    a.dispose()
    b.dispose()
  }
})

test('skin UV and paint updates retain owned attributes, including pending uploads, undo and binding rename', () => {
  const document = fixture(),
    resource = new SceneRenderResource()
  try {
    resource.update(document)
    const mesh = drawn(resource),
      geometry = mesh.geometry,
      skeleton = mesh.skeleton,
      uv = attribute(mesh, 'uv'),
      positions = attribute(mesh, 'position'),
      weights = attribute(mesh, 'skinWeight'),
      texture = mesh.material[0]!.map!,
      before = uv.array.slice(),
      image = document.images[0]!,
      layer = image.layers[0]!
    const changed = editSceneMesh(document, 'part-0', (source) =>
      mapMeshUv(source, Object.keys(source.faces), (uv) => [uv[0] + 0.25, uv[1] - 0.5]),
    )
    resource.update(changed)
    expect(drawn(resource)).toBe(mesh)
    expect(mesh.geometry).toBe(geometry)
    expect(mesh.skeleton).toBe(skeleton)
    expect(attribute(mesh, 'position')).toBe(positions)
    expect(attribute(mesh, 'skinWeight')).toBe(weights)
    expect(attribute(mesh, 'uv')).toBe(uv)
    expect(uv.array).toEqual(buildSceneGeometry(changed.geometries[0]!).uvs)
    expect(uv.version).toBe(1)
    expect(uv.updateRanges).toHaveLength(1)
    const painted: MoldaSceneDocument = {
      ...changed,
      images: [
        {
          ...image,
          layers: [
            {
              ...layer,
              pixels: Uint8Array.from(layer.pixels, (value, i) => (i === 0 ? value + 1 : value)),
            },
          ],
        },
      ],
    }
    resource.update(painted)
    expect(mesh.material[0]!.map).toBe(texture)
    expect(texture.image.data[0]).toBe(layer.pixels[0]! + 1)
    expect(mesh.geometry).toBe(geometry)
    const renamed = renameSceneSkin(painted, 'skin', 'Outro nome')
    resource.update(renamed)
    expect(drawn(resource)).toBe(mesh)
    expect(mesh.skeleton).toBe(skeleton)
    resource.update(document)
    expect(uv.array).toEqual(before)
    expect(uv.updateRanges).toHaveLength(1)
    uv.onUploadCallback()
    expect(uv.updateRanges).toEqual([])
    expect(texture.image.data).toEqual(layer.pixels)
  } finally {
    resource.dispose()
  }
})

function twoSkins() {
  const source = fixture(),
    other = { ...source.nodes[0]!, id: 'other' },
    joint = {
      ...source.nodes.find((node) => node.id === 'lower')!,
      id: 'other-joint',
      parentId: null,
      transform: { kind: 'affine' as const, matrix: identityMatrix() },
    },
    document = { ...source, nodes: [...source.nodes, other, joint] }
  return createSceneSkin(
    document,
    {
      name: 'Outra peça',
      nodeId: 'other',
      jointIds: ['other-joint'],
      weights: Object.fromEntries(
        Object.keys(source.skins![0]!.weights).map((id) => [
          id,
          [{ jointId: 'other-joint', weight: 1 }],
        ]),
      ),
    },
    () => 'other-skin',
  )
}

test('shared UV edits and simultaneous weight replacement update every owned copy without reusing stale UVs', () => {
  const document = twoSkins(),
    resource = new SceneRenderResource()
  try {
    resource.update(document)
    const first = drawn(resource),
      second = drawn(resource, 'other'),
      source = document.geometries[0] as SceneMeshGeometry,
      firstUv = attribute(first, 'uv'),
      secondUv = attribute(second, 'uv'),
      changed = {
        ...document,
        geometries: [
          mapMeshUv(source, Object.keys(source.faces), (uv) => [uv[0] - 0.25, uv[1] + 0.125]),
        ],
      }
    resource.update(changed)
    expect(drawn(resource)).toBe(first)
    expect(drawn(resource, 'other')).toBe(second)
    expect(firstUv.array === secondUv.array).toBe(false)
    expect(firstUv.array).toEqual(buildSceneGeometry(changed.geometries[0]!).uvs)
    expect(secondUv.array).toEqual(firstUv.array)
    const nextGeometry = mapMeshUv(changed.geometries[0]!, Object.keys(source.faces), (uv) => [
        uv[0] + 0.5,
        uv[1],
      ]),
      weighted = setSceneSkinWeights({ ...changed, geometries: [nextGeometry] }, 'skin', {
        v_0_0: [{ jointId: 'upper', weight: 1 }],
      })
    resource.update(weighted)
    const replaced = drawn(resource)
    expect(replaced === first).toBe(false)
    expect(drawn(resource, 'other')).toBe(second)
    expect(attribute(replaced, 'uv').array).toEqual(buildSceneGeometry(nextGeometry).uvs)
    expect(attribute(second, 'uv').array).toEqual(attribute(replaced, 'uv').array)
  } finally {
    resource.dispose()
  }
})

test('all skeletons and mesh transforms preflight together; a bad later binding cannot partially advance or replace the frame', () => {
  const document = twoSkins(),
    resource = new SceneRenderResource()
  try {
    resource.update(document)
    const first = drawn(resource),
      second = drawn(resource, 'other'),
      originalFirst = first.skeleton.boneMatrices!.slice(),
      originalSecond = second.skeleton.boneMatrices!.slice(),
      originalBox = first.boundingBox!.clone(),
      uv = attribute(first, 'uv'),
      originalUv = uv.array.slice(),
      compiled = prepareSceneAnimation(document, 'clip'),
      valid = compiled.sample(1, false),
      badWorld = new Map(valid.worldMatrices),
      huge = identityMatrix()
    huge[0] = 1e39
    badWorld.set('other-joint', huge)
    expect(() => resource.setPose({ ...valid, worldMatrices: badWorld })).toThrow('precisão')
    expect(first.skeleton.boneMatrices).toEqual(originalFirst)
    expect(second.skeleton.boneMatrices).toEqual(originalSecond)
    expect(first.boundingBox).toEqual(originalBox)
    let disposed = 0
    first.geometry.addEventListener('dispose', () => disposed++)
    const changed = editSceneMesh(document, 'part-0', (mesh) =>
        mapMeshUv(mesh, Object.keys(mesh.faces), (uv) => [uv[0] + 0.125, uv[1]]),
      ),
      invalid = setSceneSkinWeights(
        changed,
        'other-skin',
        { v_0_0: [{ jointId: 'other-joint', weight: 1e-100 }] },
        { normalize: true },
      )
    // An explicit second positive influence may not disappear during Float32 conversion.
    const badSkin = {
      ...invalid.skins![1]!,
      joints: [...invalid.skins![1]!.joints, invalid.skins![0]!.joints[0]!],
      weights: {
        ...invalid.skins![1]!.weights,
        v_0_0: [
          { jointId: 'other-joint', weight: 1 },
          { jointId: 'upper', weight: 1e-100 },
        ],
      },
    }
    expect(() => resource.update({ ...invalid, skins: [invalid.skins![0]!, badSkin] })).toThrow(
      'precisão',
    )
    expect(drawn(resource)).toBe(first)
    expect(drawn(resource, 'other')).toBe(second)
    expect(first.skeleton.boneMatrices).toEqual(originalFirst)
    expect(uv.array).toEqual(originalUv)
    expect(disposed).toBe(0)
    expect(resource.setPose(valid)).toBe(true)
    expect(first.skeleton.boneMatrices).not.toEqual(originalFirst)
    resource.update({ ...document, name: 'Outra revisão' })
    expect(resource.setPose(compiled.sample(2, false))).toBe(false)
  } finally {
    resource.dispose()
  }
})

test('weight replacement, mirror removal and unlink dispose only retired owned resources and preserve unrelated skins', () => {
  const document = twoSkins(),
    resource = new SceneRenderResource()
  try {
    resource.update(document)
    const first = drawn(resource),
      mirror = drawn(resource, 'mirror'),
      second = drawn(resource, 'other'),
      otherGeometry = second.geometry,
      material = first.material[0]!,
      geometry = first.geometry,
      texture = material.map!,
      boneTexture = first.skeleton.computeBoneTexture().boneTexture!
    let geometriesDisposed = 0,
      bonesDisposed = 0,
      materialDisposed = 0,
      paintDisposed = 0
    geometry.addEventListener('dispose', () => geometriesDisposed++)
    boneTexture.addEventListener('dispose', () => bonesDisposed++)
    material.addEventListener('dispose', () => materialDisposed++)
    texture.addEventListener('dispose', () => paintDisposed++)
    const noMirror = removeSceneMirrors(document, ['mirror'])
    resource.update(noMirror)
    expect(mirror.parent).toBeNull()
    expect(resource.instanceFor(mirror)).toBeNull()
    expect(geometriesDisposed).toBe(0)
    const weighted = setSceneSkinWeights(noMirror, 'skin', {
      v_0_0: [{ jointId: 'upper', weight: 1 }],
    })
    resource.update(weighted)
    expect(drawn(resource)).not.toBe(first)
    expect(first.parent).toBeNull()
    expect(geometriesDisposed).toBe(1)
    expect(bonesDisposed).toBe(1)
    expect(drawn(resource, 'other')).toBe(second)
    expect(second.geometry).toBe(otherGeometry)
    expect(materialDisposed + paintDisposed).toBe(0)
    const unbound = removeSceneSkin(weighted, 'skin')
    resource.update(unbound)
    const plain = resource.root.children.find(
      (object) => resource.instanceFor(object)?.id === 'part-0',
    )
    expect(plain instanceof Mesh && !(plain instanceof SkinnedMesh)).toBe(true)
    expect(drawn(resource, 'other')).toBe(second)
    resource.update(deleteSceneNodes(unbound, ['other']))
    expect(second.parent).toBeNull()
    expect(materialDisposed + paintDisposed).toBe(0)
    resource.dispose()
    resource.dispose()
    expect(geometriesDisposed).toBe(1)
    expect(bonesDisposed).toBe(1)
    expect(materialDisposed).toBe(1)
    expect(paintDisposed).toBe(1)
  } finally {
    resource.dispose()
  }
})

test('base joint moves reuse the skin while spatial mesh edits rebuild only their bound instance', () => {
  const document = twoSkins(),
    resource = new SceneRenderResource()
  try {
    resource.update(document)
    const first = drawn(resource),
      second = drawn(resource, 'other'),
      geometry = first.geometry,
      skeleton = first.skeleton,
      original = first.getVertexPosition(0, new Vector3()),
      delta = identityMatrix()
    delta[12] = 0.2
    const moved = transformSceneNodes(document, ['lower'], delta)
    resource.update(moved)
    expect(drawn(resource)).toBe(first)
    expect(first.geometry).toBe(geometry)
    expect(first.skeleton).toBe(skeleton)
    expect(first.getVertexPosition(0, new Vector3())).not.toEqual(original)
    let n = 0
    const edited = editSceneMesh(
      moved,
      'part-0',
      (mesh) => ({ ...mesh, vertices: { ...mesh.vertices, v_0_0: [0.1, 0, 0] } }),
      () => `copy-${++n}`,
    )
    resource.update(edited)
    expect(drawn(resource).geometry).not.toBe(geometry)
    expect(drawn(resource, 'other')).toBe(second)
    expect(second.geometry.getAttribute('position').array).toEqual(
      buildSceneGeometry(document.geometries[0]!).positions,
    )
    expect(indexSceneDocument(edited).skins.size).toBe(2)
  } finally {
    resource.dispose()
  }
})

test('deformed local bounds are owned by the current revision and filter meshes, mirrors and empty surfaces independently', () => {
  const document = twoSkins(),
    resource = new SceneRenderResource()
  try {
    resource.update(document)
    const pose = prepareSceneAnimation(document, 'clip').sample(2, false)
    resource.setPose(pose)
    const index = indexSceneDocument(document),
      posed = { ...index, scene: { ...index.scene, worldMatrices: pose.worldMatrices } },
      local = resource.skinLocalBounds(document)
    expect(local.get('part-0')).not.toEqual(local.get('other'))
    for (const [id, includeMirrors] of [
      ['part-0', false],
      ['part-0', true],
      ['other', false],
    ] as const) {
      const bounds = sceneBounds(posed, {
        nodeIds: new Set([id]),
        includeMirrors,
        nodeLocalBounds: local,
      })!
      for (const object of resource.root.children) {
        const instance = resource.instanceFor(object)!
        if (
          !(object instanceof SkinnedMesh) ||
          instance.sourceNodeId !== id ||
          (!includeMirrors && instance.id !== id)
        )
          continue
        for (let i = 0; i < object.geometry.getAttribute('position').count; i++) {
          const point = object.getVertexPosition(i, new Vector3()).applyMatrix4(object.matrixWorld)
          for (const axis of [0, 1, 2] as const) {
            expect(point.getComponent(axis)).toBeGreaterThanOrEqual(bounds.min[axis])
            expect(point.getComponent(axis)).toBeLessThanOrEqual(bounds.max[axis])
          }
        }
      }
    }
    const nullBounds = new Map(local)
    nullBounds.set('part-0', null)
    expect(
      sceneBounds(posed, { nodeIds: new Set(['part-0']), nodeLocalBounds: nullBounds }),
    ).toBeNull()
    expect(
      sceneBounds(posed, { nodeIds: new Set(['other']), nodeLocalBounds: nullBounds }),
    ).not.toBeNull()
    const before = resource.skinLocalBounds(document)
    local.get('part-0')!.min[0] = -10000
    expect(resource.skinLocalBounds(document)).toEqual(before)
    expect(() => resource.skinLocalBounds({ ...document })).toThrow('outra revisão')
    resource.dispose()
    expect(() => resource.skinLocalBounds(document)).toThrow('outra revisão')
  } finally {
    resource.dispose()
  }
})

test('form-base display switches only draw instances, retaining skins, buffers, visibility and independent pieces', () => {
  const document = twoSkins(),
    before = structuredClone(document),
    resource = new SceneRenderResource()
  try {
    resource.update(document)
    const first = drawn(resource),
      second = drawn(resource, 'other'),
      geometry = first.geometry,
      skeleton = first.skeleton,
      attributes = Object.values(geometry.attributes),
      material = first.material[0]
    let disposed = 0
    geometry.addEventListener('dispose', () => disposed++)
    drawn(resource, 'mirror').visible = false
    let baseGeometry: typeof geometry | undefined
    for (let i = 0; i < 20; i++) {
      expect(resource.setFormBase('part-0')).toBe(true)
      expect(resource.setFormBase('part-0')).toBe(false)
      const base = resource.root.children.find(
        (object) => resource.instanceFor(object)?.id === 'part-0',
      )
      if (!(base instanceof Mesh) || base instanceof SkinnedMesh)
        throw new Error('Expected form-base drawing')
      baseGeometry ??= base.geometry
      expect(base.geometry).toBe(baseGeometry)
      expect(base.material[0]).toBe(material)
      expect(base.geometry.getAttribute('position').array).toEqual(
        buildSceneGeometry(document.geometries[0]!).positions,
      )
      expect(drawn(resource, 'other')).toBe(second)
      expect(resource.skinLocalBounds(document).has('part-0')).toBe(false)
      expect(resource.setFormBase(null)).toBe(true)
      expect(drawn(resource).geometry).toBe(geometry)
      expect(drawn(resource).skeleton).toBe(skeleton)
      expect(Object.values(geometry.attributes)).toEqual(attributes)
      expect(drawn(resource, 'mirror').visible).toBe(false)
      expect(disposed).toBe(0)
    }
    resource.setFormBase('part-0')
    expect(resource.setFormBase('other')).toBe(true)
    expect(drawn(resource).skeleton).toBe(skeleton)
    expect(resource.skinLocalBounds(document).has('part-0')).toBe(true)
    expect(resource.skinLocalBounds(document).has('other')).toBe(false)
    resource.setFormBase(null)
    expect(drawn(resource, 'other').skeleton).toBe(second.skeleton)
    expect(document).toEqual(before)
  } finally {
    resource.dispose()
  }
})

test('valid animation exits form-base only after preflight, while stale or invalid poses preserve it', () => {
  const document = fixture(),
    resource = new SceneRenderResource()
  try {
    resource.update(document)
    const skeleton = drawn(resource).skeleton,
      compiled = prepareSceneAnimation(document, 'clip')
    resource.setFormBase('part-0')
    const base = resource.root.children.find(
        (object) => resource.instanceFor(object)?.id === 'part-0',
      ),
      pose = compiled.sample(1, false),
      invalid = new Map(pose.worldMatrices),
      huge = identityMatrix()
    huge[0] = 1e39
    invalid.set('lower', huge)
    expect(resource.setPose({ ...pose, source: { ...document } })).toBe(false)
    expect(() => resource.setPose({ ...pose, worldMatrices: invalid })).toThrow('precisão')
    expect(resource.root.children.includes(base!)).toBe(true)
    expect(resource.skinLocalBounds(document).has('part-0')).toBe(false)
    expect(resource.setPose(pose)).toBe(true)
    expect(drawn(resource).skeleton).toBe(skeleton)
    expect(drawn(resource, 'mirror').skeleton).toBe(skeleton)
    expect(resource.skinLocalBounds(document).has('part-0')).toBe(true)
    expect(() => resource.setFormBase('part-0')).toThrow('Feche a pose')
    resource.setPose(null)
    resource.setFormBase('part-0')
    const changed = {
      ...document,
      geometries: [
        mapMeshUv(
          document.geometries[0] as SceneMeshGeometry,
          Object.keys((document.geometries[0] as SceneMeshGeometry).faces),
          (uv) => [uv[0] + 0.25, uv[1]],
        ),
      ],
    }
    resource.update(changed)
    expect(
      resource.root.children.some(
        (object) => resource.instanceFor(object)?.id === 'part-0' && object instanceof SkinnedMesh,
      ),
    ).toBe(false)
    resource.setFormBase(null)
    expect(drawn(resource).skeleton).toBe(skeleton)
    expect(drawn(resource).geometry.getAttribute('uv').array).toEqual(
      buildSceneGeometry(changed.geometries[0]!).uvs,
    )
    resource.setFormBase('part-0')
    resource.update({ ...changed, id: 'different-creation' })
    expect(drawn(resource).skeleton).toBe(skeleton)
  } finally {
    resource.dispose()
  }
})
