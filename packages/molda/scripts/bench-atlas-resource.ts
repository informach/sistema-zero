// CPU-only atlas updates. No WebGL uploads or frame-rate claims.
import { strict as assert } from 'node:assert'
import { createHash } from 'node:crypto'
import { cpus, platform, release } from 'node:os'
import { isDeepStrictEqual } from 'node:util'
import { createModelAsset, createPart, createSkin } from '../src/core/model'
import { assetFromJson, assetToJson } from '../src/export/assetJson'
import { faceSkinSize } from '../src/model/shapes'
import { ModelAtlasResource } from '../src/viewport/modelAtlasResource'

const model = createModelAsset({ name: 'perf', starter: false, now: 1 })
model.id = 'perf'
for (let index = 0; index < 128; index++) {
  const part = createPart({
    id: `p${index}`,
    name: `p${index}`,
    shape: 'sphere',
    color: 2,
    from: [(index % 16) - 8, 0, Math.floor(index / 16) - 4],
    to: [(index % 16) - 2, 6, Math.floor(index / 16) + 2],
  })
  const size = faceSkinSize(part, 'around', model.texelsPerUnit)
  assert(size)
  assert.equal(size.width, 32)
  assert.equal(size.height, 32)
  part.faces.around = createSkin(size.width, size.height)
  for (let pixel = 0; pixel < part.faces.around.data.length; pixel++)
    part.faces.around.data[pixel] = pixel % 16
  model.parts.push(part)
}
assert(
  isDeepStrictEqual(assetFromJson(assetToJson(model)), model),
  'fixture must roundtrip without loss',
)
const resource = new ModelAtlasResource()
const first = resource.update(model)
assert.equal(first.layout.size, 512)
const digest = (pixels: Uint8Array) => createHash('sha256').update(pixels).digest('hex')
const golden = digest(first.atlas.pixels)
assert.equal(
  golden,
  '4040964971c1669e5e1b9af3356ea4a288f14fac03d5b9894111b1090e1be31d',
  'pre-optimization atlas bytes',
)
let revision = 0
let latest = first
function paletteUpdate() {
  revision++
  latest = resource.update({ ...model, paletteId: revision % 2 ? 'pastel' : model.paletteId })
}
for (let run = 0; run < 8; run++) paletteUpdate()
const runs = process.argv.includes('--profile') ? 2000 : 40
const times: number[] = []
const before = process.memoryUsage().heapUsed
for (let run = 0; run < runs; run++) {
  const start = performance.now()
  paletteUpdate()
  times.push(performance.now() - start)
}
const heapDelta = process.memoryUsage().heapUsed - before
assert.equal(digest(latest.atlas.pixels), golden)
times.sort((a, b) => a - b)
const percentile = (p: number) => times[Math.ceil(runs * p) - 1]!.toFixed(3)
console.log(
  `${platform()} ${release()}; ${cpus()[0]?.model}; Bun ${Bun.version}; warmup=8 samples=${runs}`,
)
console.log(
  `128 skins / atlas512; palette sync p50=${percentile(0.5)}ms p95=${percentile(0.95)}ms p99=${percentile(0.99)}ms; heap delta=${heapDelta}B (GC-dependent, not peak)`,
)
console.log(`atlas SHA256=${golden}`)
resource.dispose()
