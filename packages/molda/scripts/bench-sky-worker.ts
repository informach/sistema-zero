// Compare CPU-thread occupancy, not browser interaction/GPU latency.
import { strict as assert } from 'node:assert'
import { createHash } from 'node:crypto'
import { cpus, platform, release } from 'node:os'
import { createSkyAsset } from '../src/core/model'
import { exportSkyHdr, type SkyHdrResult } from '../src/export/skyHdr'
import { exportSkyHdrInWorker } from '../src/workers/skyExport'

const asset = createSkyAsset({ name: 'benchmark', preset: 'entardecer' })
const GOLDEN = 'c00c9074625b9f34ba521beb29c15de7e2f1bfd730d8271dfe769d8440c72941'
const percentile = (values: number[], p: number) =>
  [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1]?.toFixed(2)
console.log(`${platform()} ${release()}; ${cpus()[0]?.model}; Bun ${Bun.version}`)
console.log(
  '3 warmups + 20 samples per path; fresh owned worker per export; latency includes startup',
)
for (const [label, run] of [
  ['synchronous', () => exportSkyHdr(asset)],
  ['worker', () => exportSkyHdrInWorker(asset)],
] satisfies [string, () => SkyHdrResult | Promise<SkyHdrResult>][]) {
  const dispatch: number[] = []
  const elapsed: number[] = []
  const tickDelay: number[] = []
  for (let i = -3; i < 20; i += 1) {
    const start = performance.now()
    // A competing event-loop task makes blocked-thread time observable in this CLI runtime.
    const tick = new Promise<number>((resolve) =>
      setTimeout(() => resolve(performance.now() - start), 0),
    )
    const pending = run()
    const dispatchMs = performance.now() - start
    const result = await pending
    const elapsedMs = performance.now() - start
    const tickMs = await tick
    assert(result.ok)
    assert.equal(createHash('sha256').update(result.bytes).digest('hex'), GOLDEN)
    if (i >= 0) {
      dispatch.push(dispatchMs)
      elapsed.push(elapsedMs)
      tickDelay.push(tickMs)
    }
  }
  for (const [name, values] of [
    ['dispatch', dispatch],
    ['end-to-end', elapsed],
    ['event-loop tick', tickDelay],
  ] satisfies [string, number[]][])
    console.log(
      `${label} ${name}: p50=${percentile(values, 0.5)}ms p95=${percentile(values, 0.95)}ms p99=${percentile(values, 0.99)}ms`,
    )
  console.log(`SHA256 verified: ${GOLDEN}`)
}
