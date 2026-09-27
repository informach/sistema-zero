import { encodeSceneGlb } from '../src/export/sceneGlb'
import { readSceneDocument } from '../src/scene/readDocument'
import { makeSceneGlbFixture } from '../src/testing/sceneGlbFixture'

function stats(values: number[]) {
  values.sort((a, b) => a - b)
  const at = (p: number) => +values[Math.ceil(values.length * p) - 1]!.toFixed(3)
  return { p50: at(0.5), p95: at(0.95), max: at(1) }
}
// Baseline of the complete new encoder, not a before/after optimization claim.
for (const [parts, grid, keys, textureSide] of [
  [1, 1, 3, 0],
  [1, 96, 64, 0],
  [128, 1, 512, 512],
] as const) {
  const source = makeSceneGlbFixture(parts, grid, keys, textureSide)
  const read = readSceneDocument(source)
  if (read.status !== 'valid') throw new Error(`Invalid fixture: ${read.status}`)
  const golden = encodeSceneGlb(source),
    samples: number[] = []
  for (let i = 0; i < 40; i++) {
    const start = performance.now(),
      result = encodeSceneGlb(source),
      elapsed = performance.now() - start
    if (i >= 10) samples.push(elapsed)
    if (!Buffer.from(result.bytes).equals(Buffer.from(golden.bytes))) throw new Error('GLB changed')
  }
  console.log(
    JSON.stringify({
      parts,
      faces: grid * grid,
      sourceKeys: parts * keys,
      textureSide,
      bytes: golden.bytes.length,
      ...golden.stats,
      encode: stats(samples),
      deterministic: true,
      sha256: new Bun.CryptoHasher('sha256').update(golden.bytes).digest('hex'),
    }),
  )
}
