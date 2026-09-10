import { expect, test } from 'bun:test'
import { SCENE_LIMITS } from '../scene/limits'
import { primitiveMesh } from '../scene/primitiveMesh'
import { readSceneGeometry } from '../scene/readGeometry'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import {
  packSceneMesh,
  readSceneMeshPacket,
  type SceneMeshPacket,
  sceneMeshPacketTransfers,
} from './sceneMeshPacket'

function fixture() {
  const mesh = primitiveMesh({
    id: 'mesh',
    kind: 'box',
    from: [0.123456789012345, -2.123456789012345, 0],
    to: [4.98765432109876, 2, 2],
    surfaces: {},
  }).mesh
  mesh.vertices = Object.fromEntries([
    ...Object.entries(mesh.vertices),
    ['__proto__', [Number.MIN_VALUE, 0, Number.MAX_VALUE]],
    ['constructor', [1, 2, 3]],
  ])
  mesh.looseEdges = [['__proto__', 'constructor']]
  mesh.faces.px!.materialId = 'paint'
  mesh.faces.px!.corners[0]!.uv = [-0.12345678901234, 5.98765432109876]
  mesh.faces = Object.fromEntries(
    Object.entries(mesh.faces).map(([id, face]) => [id === 'px' ? '__proto__' : id, face]),
  )
  return mesh
}

test('compact transfer preserves all doubles, ordered IDs, corner UV, materials and loose edges without detaching authorial data', () => {
  const mesh = fixture()
  const original = structuredClone(mesh)
  const packet = packSceneMesh(mesh)
  const buffers = sceneMeshPacketTransfers(packet)
  expect(new Set(buffers).size).toBe(5)
  const transported = structuredClone(packet, { transfer: buffers })
  expect(buffers.every((buffer) => buffer.byteLength === 0)).toBe(true)
  const result = readSceneMeshPacket(transported)
  expect(result).toEqual(mesh)
  expect(readSceneGeometry(result)).toEqual(readSceneGeometry(mesh))
  expect(Object.keys(result.vertices)).toEqual(Object.keys(mesh.vertices))
  expect(Object.keys(result.faces)).toEqual(Object.keys(mesh.faces))
  expect(Object.hasOwn(result.vertices, '__proto__')).toBe(true)
  expect(Object.getPrototypeOf(result.vertices)).toBe(Object.prototype)
  expect(Object.hasOwn(result.faces, '__proto__')).toBe(true)
  expect(Object.getPrototypeOf(result.faces)).toBe(Object.prototype)
  expect(mesh).toEqual(original)
  transported.positions.fill(0)
  expect(result).toEqual(original)
})

const corruptions: [string, (packet: SceneMeshPacket) => unknown][] = [
  ['unknown field', (p) => ({ ...p, surprise: true })],
  ['future version', (p) => ({ ...p, version: 2 })],
  [
    'duplicate vertex ID',
    (p) => {
      p.vertexIds[1] = p.vertexIds[0]!
      return p
    },
  ],
  [
    'duplicate face ID',
    (p) => {
      p.faceIds[1] = p.faceIds[0]!
      return p
    },
  ],
  [
    'invalid face ID',
    (p) => {
      p.faceIds[0] = 'has space'
      return p
    },
  ],
  [
    'invalid material',
    (p) => {
      p.materialIds[0] = ''
      return p
    },
  ],
  ['missing material', (p) => ({ ...p, materialIds: [] })],
  ['Float32 positions', (p) => ({ ...p, positions: new Float32Array(p.positions) })],
  ['missing positions', (p) => ({ ...p, positions: new Float64Array(0) })],
  [
    'non-finite coordinate',
    (p) => {
      p.positions[0] = Infinity
      return p
    },
  ],
  [
    'NaN UV',
    (p) => {
      p.uv[0] = NaN
      return p
    },
  ],
  ['missing UV', (p) => ({ ...p, uv: new Float64Array(0) })],
  [
    'short face',
    (p) => {
      p.sizes[0] = 2
      return p
    },
  ],
  [
    'oversized face',
    (p) => {
      p.sizes[0] = 65
      return p
    },
  ],
  ['missing sizes', (p) => ({ ...p, sizes: new Uint16Array(0) })],
  ['missing corners', (p) => ({ ...p, corners: new Uint32Array(0) })],
  [
    'missing vertex',
    (p) => {
      p.corners[0] = p.vertexIds.length
      return p
    },
  ],
  [
    'repeated corner',
    (p) => {
      p.corners[1] = p.corners[0]!
      return p
    },
  ],
  ['unpaired edge', (p) => ({ ...p, edges: new Uint32Array(1) })],
  [
    'self edge',
    (p) => {
      p.edges[1] = p.edges[0]!
      return p
    },
  ],
  [
    'absent edge vertex',
    (p) => {
      p.edges[0] = p.vertexIds.length
      return p
    },
  ],
  [
    'shared memory',
    (p) => ({ ...p, positions: new Float64Array(new SharedArrayBuffer(p.positions.byteLength)) }),
  ],
]
test.each(corruptions)('rejects %s before accepting worker geometry', (_name, corrupt) => {
  const packet = packSceneMesh(fixture())
  expect(() => {
    readSceneMeshPacket(corrupt(packet))
  }).toThrow()
})

test('empty geometry is valid; canonical zero and exact resource limits agree with the document reader', () => {
  const empty = { id: 'empty', kind: 'mesh' as const, vertices: {}, faces: {}, looseEdges: [] }
  const restored = readSceneGeometry(empty)
  if (restored.kind !== 'mesh') throw new Error('Expected mesh')
  expect(readSceneMeshPacket(packSceneMesh(empty))).toEqual(restored)
  const packet = packSceneMesh(fixture())
  packet.positions[0] = -0
  packet.uv[0] = -0
  const read = readSceneMeshPacket(packet)
  expect(Object.is(read.vertices[packet.vertexIds[0]!]![0], -0)).toBe(false)
  expect(Object.is(read.faces[packet.faceIds[0]!]!.corners[0]!.uv[0], -0)).toBe(false)
  const grid = makeSceneGridGeometry(100)
  expect(Object.keys(readSceneMeshPacket(packSceneMesh(grid)).faces).length * 2).toBe(
    SCENE_LIMITS.triangles,
  )
  const tooMany = {
    ...packet,
    vertexIds: Array.from({ length: SCENE_LIMITS.vertices + 1 }, (_, i) => `v_${i}`),
  }
  expect(() => {
    readSceneMeshPacket(tooMany)
  }).toThrow('orçamento')
})
