import { expect, test } from 'bun:test'
import {
  Bone,
  BoxGeometry,
  BufferAttribute,
  DoubleSide,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Skeleton,
  SkinnedMesh,
  Vector2,
  Vector3,
} from 'three'
import { SceneOcclusionQuery } from './sceneOcclusionQuery'

test('occlusion snapshots the current deformation and never merges distinct skeletons sharing one geometry', () => {
  const geometry = new PlaneGeometry(2, 2),
    count = geometry.getAttribute('position').count,
    weights = new Float32Array(count * 4),
    material = new MeshBasicMaterial({ side: DoubleSide }),
    camera = new OrthographicCamera(-6, 6, 6, -6, 0.1, 100)
  for (let i = 0; i < count; i++) weights[i * 4] = 1
  geometry.setAttribute('skinWeight', new BufferAttribute(weights, 4))
  geometry.setAttribute('skinIndex', new BufferAttribute(new Uint16Array(count * 4), 4))
  const bones = [new Bone(), new Bone()],
    skeletons = bones.map((bone) => new Skeleton([bone], [new Matrix4()])),
    objects = skeletons.map((skeleton) => {
      const mesh = new SkinnedMesh(geometry, material)
      mesh.bind(skeleton, new Matrix4())
      return mesh
    })
  camera.position.z = 10
  camera.updateMatrixWorld(true)
  const source = geometry.getAttribute('position').array.slice()
  let disposals = 0
  geometry.addEventListener('dispose', () => disposals++)
  try {
    bones[0]!.matrixWorld.makeTranslation(3, 0, 0)
    bones[1]!.matrixWorld.makeTranslation(-3, 0, 0)
    const query = new SceneOcclusionQuery(objects, camera)
    try {
      expect(query.visible(new Vector3(3, 0, -1))).toBe(false)
      expect(query.visible(new Vector3(-3, 0, -1))).toBe(false)
      expect(query.visible(new Vector3(0, 0, -1))).toBe(true)
      // The query owns one snapshot, not a live skeleton cache.
      bones[0]!.matrixWorld.makeTranslation(0, 0, 0)
      expect(query.visible(new Vector3(3, 0, -1))).toBe(false)
    } finally {
      query.dispose()
      query.dispose()
    }
    const next = new SceneOcclusionQuery(objects, camera)
    try {
      expect(next.visible(new Vector3(3, 0, -1))).toBe(true)
      expect(next.visible(new Vector3(0, 0, -1))).toBe(false)
      expect(next.visible(new Vector3(-3, 0, -1))).toBe(false)
    } finally {
      next.dispose()
    }
    expect(geometry.getAttribute('position').array).toEqual(source)
    expect(geometry.boundsTree).toBeUndefined()
    expect(disposals).toBe(0)
  } finally {
    for (const skeleton of skeletons) skeleton.dispose()
    geometry.dispose()
    material.dispose()
  }
})

test.each([
  false,
  true,
])('spatial occlusion equals native Three raycasting with shear, mirrored scale and camera clipping (perspective=%s)', (perspective) => {
  const geometry = new BoxGeometry(2, 2, 2)
  const material = new MeshBasicMaterial({ side: DoubleSide })
  const camera = perspective
    ? new PerspectiveCamera(60, 1, 0.1, 100)
    : new OrthographicCamera(-5, 5, 5, -5, 0.1, 100)
  camera.position.set(3, 4, 8)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld(true)
  const matrices = [
    new Matrix4(),
    new Matrix4().makeScale(-1.3, 0.25, 2.5),
    new Matrix4().set(1.3, 0.6, 0, 2, 0, 0.5, -0.35, 1, 0, 0, 1.1, 0, 0, 0, 0, 1),
    new Matrix4().makeTranslation(3, 4, 7.99),
  ]
  const positions = geometry.getAttribute('position').array.slice()
  const indices = geometry.index!.array.slice()
  const originalRaycast = Mesh.prototype.raycast
  let sourceDisposals = 0
  geometry.addEventListener('dispose', () => sourceDisposals++)
  const objects = matrices.map((matrix) => {
    const mesh = new Mesh(geometry, material)
    mesh.matrixAutoUpdate = false
    mesh.matrixWorld.copy(matrix)
    return mesh
  })
  const ray = new Raycaster()
  const reference = (world: Vector3) => {
    const projected = world.clone().project(camera)
    ray.setFromCamera(new Vector2(projected.x, projected.y), camera)
    const depth = world.clone().sub(ray.ray.origin).dot(ray.ray.direction)
    if (depth < 0 || !Number.isFinite(depth)) return false
    const hit = ray.intersectObjects(objects, false).find((hit) => {
      const z = hit.point.clone().project(camera).z
      return z >= -1 && z <= 1
    })
    return !hit || hit.distance >= depth - Math.max(1, depth) * 1e-7
  }
  try {
    for (let cycle = 0; cycle < 20; cycle++) {
      const query = new SceneOcclusionQuery(objects, camera)
      for (let x = -4; x <= 4; x++)
        for (let y = -3; y <= 3; y++)
          for (const z of [-2, 0, 1, 2, 9]) {
            const point = new Vector3(x / 2, y / 2, z)
            expect(query.visible(point)).toBe(reference(point))
          }
      for (const object of objects)
        for (let i = 0; i < geometry.getAttribute('position').count; i++) {
          const point = new Vector3()
            .fromBufferAttribute(geometry.getAttribute('position'), i)
            .applyMatrix4(object.matrixWorld)
          expect(query.visible(point)).toBe(reference(point))
        }
      query.dispose()
      query.dispose()
      expect(query.visible(new Vector3(0, 0, 2))).toBe(false)
    }
    expect(geometry.getAttribute('position').array).toEqual(positions)
    expect(geometry.index!.array).toEqual(indices)
    expect(geometry.boundsTree).toBeUndefined()
    expect(sourceDisposals).toBe(0)
    expect(Mesh.prototype.raycast).toBe(originalRaycast)
  } finally {
    geometry.dispose()
    material.dispose()
  }
})
