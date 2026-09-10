import { expect, test } from 'bun:test'
import {
  BackSide,
  BoxGeometry,
  BufferAttribute,
  DoubleSide,
  FrontSide,
  type Intersection,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
} from 'three'
import { SceneSurfaceQuery } from './SceneSurfaceQuery'

function fields(hits: Intersection[]) {
  return hits.map(({ object, ...hit }) => ({ ...hit, objectId: object.uuid }))
}

function check(query: SceneSurfaceQuery, object: Mesh, ray: Raycaster) {
  const expected = ray.intersectObject(object, false)
  const actual = query.intersect(object, ray)
  expect(fields(actual)).toEqual(fields(expected))
  for (const hit of actual) expect(hit.object).toBe(object)
  return expected
}

test('native oracle: indexed/nonindexed, affine mirrors, every material side, groups, edges and world near/far', () => {
  const matrices = [
    new Matrix4(),
    new Matrix4().set(-2, 0.3, 0.1, 3, 0.2, 1.5, 0.25, -2, 0.1, -0.2, 0.7, 4, 0, 0, 0, 1),
    new Matrix4().makeScale(0.0001, 100, -0.7),
  ]
  let comparisons = 0
  for (const indexed of [true, false]) {
    const box = new BoxGeometry(3, 2, 1, 6, 4, 3)
    const geometry = indexed ? box : box.toNonIndexed()
    const materials = Array.from({ length: 6 }, () => new MeshBasicMaterial())
    const object = new Mesh(geometry, materials)
    const query = new SceneSurfaceQuery()
    const position = geometry.getAttribute('position')
    const before = position.array.slice()
    const indices = geometry.index?.array.slice()
    const groups = structuredClone(geometry.groups)
    query.setSources([geometry])
    try {
      for (const matrix of matrices) {
        object.matrixWorld.copy(matrix)
        for (const side of [FrontSide, BackSide, DoubleSide]) {
          for (let i = 0; i < materials.length; i++) materials[i]!.side = i % 2 ? DoubleSide : side
          // Includes exact box edges/corners and deterministic interior/miss rays.
          for (let i = 0; i < 36; i++) {
            const local =
              i < 18
                ? new Vector3().fromBufferAttribute(position, i)
                : new Vector3(((i * 73) % 37) / 10 - 1.8, ((i * 19) % 31) / 10 - 1.5, 0)
            const axis = i % 3
            const start = local
              .clone()
              .setComponent(axis, i % 2 ? 5 : -5)
              .applyMatrix4(matrix)
            const end = local.clone().applyMatrix4(matrix)
            const ray = new Raycaster(start, end.sub(start).normalize())
            const expected = check(query, object, ray)
            comparisons++
            const distance = expected[0]?.distance
            if (distance !== undefined) {
              for (const offset of [-1e-10, 0, 1e-10]) {
                ray.near = Math.max(0, distance + offset)
                check(query, object, ray)
                ray.near = 0
                ray.far = distance + offset
                check(query, object, ray)
                ray.far = Infinity
              }
            }
          }
        }
      }
      expect(position.array).toEqual(before)
      expect(geometry.index?.array).toEqual(indices)
      expect(geometry.groups).toEqual(groups)
      expect(object.raycast).toBe(Mesh.prototype.raycast)
    } finally {
      query.dispose()
      geometry.dispose()
      if (!indexed) box.dispose()
      for (const material of materials) material.dispose()
    }
  }
  expect(comparisons).toBe(648)
})

test('live UV/uv1/normal/material/layers, shared matrices, source retirement and idempotent disposal', () => {
  const geometry = new BoxGeometry(2, 2, 2)
  const material = new MeshBasicMaterial({ side: DoubleSide })
  const object = new Mesh(geometry, material)
  const shared = new Mesh(geometry, material)
  const query = new SceneSurfaceQuery()
  const ray = new Raycaster(new Vector3(0.13, 0.27, 5), new Vector3(0, 0, -1))
  let geometryDisposals = 0
  let materialDisposals = 0
  geometry.addEventListener('dispose', () => geometryDisposals++)
  material.addEventListener('dispose', () => materialDisposals++)
  query.setSources([geometry])
  try {
    const initial = check(query, object, ray)
    expect(initial.length).toBeGreaterThan(0)
    const uv = geometry.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + 0.137, uv.getY(i) - 0.293)
    geometry.setAttribute('uv1', uv.clone())
    geometry.setAttribute(
      'normal',
      new BufferAttribute(new Float32Array(geometry.getAttribute('normal').array).fill(0.31), 3),
    )
    const updated = check(query, object, ray)
    expect(updated[0]!.uv).not.toEqual(initial[0]!.uv)
    expect(updated[0]!.uv1).toBeDefined()
    shared.matrixWorld.makeTranslation(0, 0, 2)
    expect(check(query, shared, ray)[0]!.distance).toBe(initial[0]!.distance - 2)
    // A second instance must not leave its transform on the first one's proxy.
    check(query, object, ray)
    geometry.deleteAttribute('uv1')
    geometry.deleteAttribute('normal')
    material.side = BackSide
    check(query, object, ray)
    object.layers.set(1)
    expect(check(query, object, ray)).toEqual([])
    ray.layers.set(1)
    check(query, object, ray)
    object.layers.set(0)
    ray.layers.set(0)
    query.setSources([])
    // Retired positions are no longer cached; re-registration builds a fresh index.
    geometry.translate(20, 0, 0)
    query.setSources([geometry])
    expect(check(query, object, ray)).toEqual([])
    ray.ray.origin.x += 20
    expect(check(query, object, ray).length).toBeGreaterThan(0)
    query.dispose()
    query.dispose()
    expect(query.intersect(object, ray)).toEqual([])
    expect(() => query.setSources([geometry])).toThrow('descartada')
    expect(geometryDisposals).toBe(0)
    expect(materialDisposals).toBe(0)
  } finally {
    query.dispose()
    geometry.dispose()
    material.dispose()
  }
})

test('unknown geometry, empty ranges and singular matrices retain native behavior', () => {
  const geometry = new BoxGeometry(2, 2, 2)
  const material = new MeshBasicMaterial({ side: DoubleSide })
  const object = new Mesh(geometry, material)
  const query = new SceneSurfaceQuery()
  const ray = new Raycaster(new Vector3(0.1, 0.2, 5), new Vector3(0, 0, -1))
  try {
    expect(check(query, object, ray).length).toBeGreaterThan(0)
    geometry.setDrawRange(3, 9)
    query.setSources([geometry])
    check(query, object, ray)
    query.setSources([])
    geometry.setDrawRange(0, 0)
    query.setSources([geometry])
    expect(check(query, object, ray)).toEqual([])
    object.matrixWorld.makeScale(0, 1, 1)
    check(query, object, ray)
  } finally {
    query.dispose()
    geometry.dispose()
    material.dispose()
  }
})
