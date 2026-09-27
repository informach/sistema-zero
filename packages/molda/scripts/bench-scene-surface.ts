// Native surface-tool CPU benchmark. No GPU, browser frame or physical-input claims.
import { strict as assert } from 'node:assert'
import { createHash } from 'node:crypto'
import { cpus, platform, release } from 'node:os'
import { createModelAsset } from '../src/core/model'
import { editSceneMesh } from '../src/scene/commands'
import type { SceneMeshGeometry } from '../src/scene/document'
import { sceneToJson } from '../src/scene/documentJson'
import { extrudeMeshFaces, prepareMeshExtrusion } from '../src/scene/meshExtrude'
import { migrateLegacyModel } from '../src/scene/migrateLegacy'
import { readSceneDocument } from '../src/scene/readDocument'
import { makeSceneGridGeometry } from '../src/testing/sceneFixtures'

const size = process.argv.includes('--stress') ? 96 : 30
const migrated = migrateLegacyModel(createModelAsset({ name: 'Superfície', now: 1 })).document
const node = migrated.nodes[0]!
assert(node.kind === 'mesh')
node.id = 'surface-node'
node.geometryId = 'surface'
const mesh = makeSceneGridGeometry(size, node.geometryId)
const source = { ...migrated, geometries: [mesh] }
const read = readSceneDocument(sceneToJson(source))
assert(read.status === 'valid')
assert.deepEqual(read.document, source)
const chosen = Object.keys(mesh.faces)
const prepared = process.argv.includes('--prepared') ? prepareMeshExtrusion(mesh, chosen) : null
const operation = () => {
  let id = 0
  return editSceneMesh(source, node.id, (mesh) =>
    prepared
      ? prepared.apply(1.25, () => `new_${++id}`)
      : extrudeMeshFaces(mesh, chosen, 1.25, () => `new_${++id}`),
  )
}
const firstStart = performance.now()
const golden = operation()
const firstMs = performance.now() - firstStart
const restored = readSceneDocument(sceneToJson(golden))
assert(restored.status === 'valid')
assert.deepEqual(restored.document, golden)
const result = golden.geometries[0]!
assert(result.kind === 'mesh')
assert.equal(Object.keys(result.faces).length, size * size + size * 4)
const digest = (value: SceneMeshGeometry) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex')
const checksum = digest(result)
assert.equal(
  checksum,
  size === 96
    ? '9eb3adc6060e422bbcbc5653fd47455afc88c4771dc146a8b7b1b5aca2706bdd'
    : 'bedd7d1412018fd2dd0d4a7eed2139d03abe4492c3b03199da5b6d453eb4fb80',
  'pre-optimization geometry including ordered IDs, coordinates, corner UV and materials',
)
for (let i = 0; i < 8; i++) operation()
const runs = process.argv.includes('--profile') ? 100 : 40
const times: number[] = []
const before = process.memoryUsage().heapUsed
for (let i = 0; i < runs; i++) {
  const start = performance.now()
  operation()
  times.push(performance.now() - start)
}
const heapDelta = process.memoryUsage().heapUsed - before
assert.equal(digest(operation().geometries[0] as SceneMeshGeometry), checksum)
times.sort((a, b) => a - b)
const percentile = (p: number) => times[Math.ceil(runs * p) - 1]!.toFixed(3)
console.log(
  `${platform()} ${release()}; ${cpus()[0]?.model}; Bun ${Bun.version}; warmup=8 samples=${runs}`,
)
console.log(
  `${size * size} quads; command extrusion p50=${percentile(0.5)}ms p95=${percentile(0.95)}ms p99=${percentile(0.99)}ms; heap delta=${heapDelta}B (GC-dependent, not peak)`,
)
console.log(`geometry SHA256=${checksum}`)
console.log(
  `prepared=${prepared !== null}; first=${firstMs.toFixed(3)}ms; retained payload=${prepared?.retainedBytes ?? 0}B`,
)
prepared?.dispose()
