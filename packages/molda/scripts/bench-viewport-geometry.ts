// CPU-only resource synchronization. No renderer, GPU, browser or input latency claims.
import { strict as assert } from 'node:assert'
import { createHash } from 'node:crypto'
import { cpus, platform, release } from 'node:os'
import { createModelAsset, createPart } from '../src/core/model'
import { assetFromJson, assetToJson } from '../src/export/assetJson'
import { packAtlas } from '../src/model/atlas'
import { PartGeometryResource } from '../src/viewport/partGeometryResource'

const model = createModelAsset({ name: 'perf', starter: false, now: 1 })
model.id = 'perf'
for (let index = 0; index < 128; index++) {
  model.parts.push(
    createPart({
      id: `p${index}`,
      name: `p${index}`,
      shape: 'sphere',
      color: 2,
      from: [(index % 16) - 8, 0, Math.floor(index / 16) - 4],
      to: [(index % 16) - 7, 1, Math.floor(index / 16) - 3],
    }),
  )
}
assert.deepEqual(assetFromJson(assetToJson(model)), model, 'fixture must roundtrip without loss')
const packed = packAtlas(model)
assert(packed.ok)
const resources = model.parts.map((part) => new PartGeometryResource(part, part, packed.layout))
assert.equal(
  resources.reduce((sum, part) => sum + part.faceOfTriangle.length, 0),
  15360,
)
function digest() {
  const hash = createHash('sha256')
  for (const part of resources) {
    for (const name of ['position', 'normal', 'uv']) {
      const data = part.geometry.getAttribute(name).array
      hash.update(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
    }
    hash.update(JSON.stringify(part.faceOfTriangle))
  }
  return hash.digest('hex')
}
const golden = digest()
assert.equal(
  golden,
  '3c20f41243c43b6a3c8334d12e117cfb901d4a4bcda1c9e19c2bddc5c9eaeaf5',
  'captured pre-optimization geometry bytes',
)
function paletteUpdate() {
  // Palette RGB changes with unchanged cardinality: existing UVs and spatial buffers must match.
  for (let index = 0; index < model.parts.length; index++) {
    const part = model.parts[index]!
    resources[index]!.update(part, part, packed.layout)
  }
}
for (let run = 0; run < 8; run++) paletteUpdate()
const runs = process.argv.includes('--profile-long')
  ? 50_000
  : process.argv.includes('--profile')
    ? 1000
    : 40
const times: number[] = []
const before = process.memoryUsage().heapUsed
for (let run = 0; run < runs; run++) {
  const start = performance.now()
  paletteUpdate()
  times.push(performance.now() - start)
}
const heapDelta = process.memoryUsage().heapUsed - before
assert.equal(digest(), golden, 'palette-only changes must preserve all geometry bytes')
times.sort((a, b) => a - b)
const percentile = (p: number) => times[Math.ceil(runs * p) - 1]!.toFixed(3)
console.log(
  `${platform()} ${release()}; ${cpus()[0]?.model}; Bun ${Bun.version}; warmup=8 samples=${runs}`,
)
console.log(
  `128 spheres / 15360 triangles; palette sync p50=${percentile(0.5)}ms p95=${percentile(0.95)}ms p99=${percentile(0.99)}ms; heap delta=${heapDelta}B (GC-dependent, not peak)`,
)
console.log(`geometry SHA256=${golden}`)
for (const resource of resources) resource.dispose()
