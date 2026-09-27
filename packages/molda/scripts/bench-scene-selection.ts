// CPU-only region picking benchmark. Real Three geometry and raycasts; no GPU/input latency claims.
import { strict as assert } from 'node:assert'
import { createHash } from 'node:crypto'
import { cpus, platform } from 'node:os'
import { OrthographicCamera } from 'three'
import { createModelAsset } from '../src/core/model'
import { sceneToJson } from '../src/scene/documentJson'
import { migrateLegacyModel } from '../src/scene/migrateLegacy'
import { readSceneDocument } from '../src/scene/readDocument'
import { makeSceneGridGeometry } from '../src/testing/sceneFixtures'
import { SceneComponentPicker } from '../src/viewport/sceneComponentPicking'
import { SceneRenderResource } from '../src/viewport/sceneRenderResource'

const size = process.argv.includes('--stress') ? 96 : 30
const source = migrateLegacyModel(createModelAsset({ name: 'Seleção', now: 1 })).document
const node = source.nodes[0]!
assert(node.kind === 'mesh')
node.geometryId = 'surface'
node.transform = { kind: 'trs', translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] }
const mesh = makeSceneGridGeometry(size)
source.geometries = [mesh]
assert.equal(readSceneDocument(sceneToJson(source)).status, 'valid')
const resource = new SceneRenderResource()
resource.update(source)
const picker = new SceneComponentPicker()
const camera = new OrthographicCamera(-1, size / 4 + 1, size / 4 + 1, -1, 0.1, 100)
camera.position.z = 10
camera.updateMatrixWorld(true)
const operation = () =>
  picker.region(
    resource,
    mesh,
    { nodeId: node.id, mode: 'face', ids: [] },
    camera,
    { kind: 'box', from: [0, 0], to: [1, 1] },
    false,
  )
const digest = (ids: readonly string[]) =>
  createHash('sha256').update(JSON.stringify(ids)).digest('hex')
const start = performance.now()
const golden = operation()
const first = performance.now() - start
assert.deepEqual(golden, Object.keys(mesh.faces))
const checksum = digest(golden)
assert.equal(
  checksum,
  size === 96
    ? '3f8d574f55de3beba8752275cf7c27b65051e38206794a677331a5979f787568'
    : 'd9327d24a30236d0cb033d5fac087355a8a76054178957bd07e93fa00fb7ea67',
)
for (let i = 0; i < 3; i++) operation()
const runs = 10
const times: number[] = []
const before = process.memoryUsage().heapUsed
let sampledRss = 0
for (let i = 0; i < runs; i++) {
  const start = performance.now()
  const result = operation()
  times.push(performance.now() - start)
  assert.equal(digest(result), checksum)
  sampledRss = Math.max(sampledRss, process.memoryUsage().rss)
}
const heapDelta = process.memoryUsage().heapUsed - before
times.sort((a, b) => a - b)
const percentile = (p: number) => times[Math.ceil(times.length * p) - 1]!.toFixed(3)
console.log(`${platform()}; ${cpus()[0]?.model}; Bun ${Bun.version}; warmup=3 samples=${runs}`)
console.log(
  `${size * size} quads; first=${first.toFixed(3)}ms; p50=${percentile(0.5)}ms p95=${percentile(0.95)}ms p99=${percentile(0.99)}ms; throughput=${((runs * 1000) / times.reduce((a, b) => a + b, 0)).toFixed(2)}/s`,
)
console.log(
  `heap delta=${heapDelta}B (GC-dependent); sampled RSS=${sampledRss}B (process total, not peak allocation)`,
)
console.log(`ordered selection SHA256=${checksum}`)
picker.dispose()
resource.dispose()
