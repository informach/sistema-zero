// CPU evidence only. This does not measure a browser, input latency or GPU frames.
import { strict as assert } from 'node:assert'
import { createHash } from 'node:crypto'
import { cpus, platform, release } from 'node:os'
import { createSkyAsset } from '../src/core/model'
import { exportSkyHdr } from '../src/export/skyHdr'
import { renderSky, SKY_PREVIEW_SIZE } from '../src/sky/render'

const asset = createSkyAsset({ name: 'benchmark', preset: 'entardecer' })
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
console.log(`${platform()} ${release()}; ${cpus()[0]?.model}; Bun ${Bun.version}`)
console.log('warmup=3 samples=20 nearest-rank; fresh HDR and preview outputs on every run')
for (const [label, run] of [
  [
    'preview 256x128',
    () => {
      const image = renderSky(asset.params, SKY_PREVIEW_SIZE.width, SKY_PREVIEW_SIZE.height)
      return new Uint8Array(image.rgb.buffer)
    },
  ],
  [
    'HDR 1024x512',
    () => {
      const result = exportSkyHdr(asset)
      assert(result.ok)
      return result.bytes
    },
  ],
] satisfies [string, () => Uint8Array][]) {
  const golden = digest(run())
  for (let i = 0; i < 3; i += 1) run()
  const samples: number[] = []
  const beforeHeap = process.memoryUsage().heapUsed
  for (let i = 0; i < 20; i += 1) {
    const start = performance.now()
    const result = run()
    samples.push(performance.now() - start)
    assert.equal(digest(result), golden, 'deterministic output changed')
  }
  samples.sort((a, b) => a - b)
  const percentile = (p: number) => samples[Math.ceil(samples.length * p) - 1]?.toFixed(2)
  console.log(
    `${label}: p50=${percentile(0.5)}ms p95=${percentile(0.95)}ms p99=${percentile(0.99)}ms; SHA256=${golden}; heap delta=${process.memoryUsage().heapUsed - beforeHeap}B (GC-dependent, not peak)`,
  )
}
