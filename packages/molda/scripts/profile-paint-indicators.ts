import { migrateLegacyModel } from '../src/scene/migrateLegacy'
import { prepareScenePaintIndicators, scenePaintIndicators } from '../src/scene/paintIndicators'
import { resolveScenePaintIndicators } from '../src/state/scenePaintIndicatorsTask'
import { makeModel } from '../src/testing/fixtures'

for (const encoding of ['indexed', 'rgba'] as const) {
  const samples: number[] = []
  const foreground: number[] = []
  const worker = process.argv.includes('--worker')
  let golden = ''
  for (let run = -3; run < 10; run++) {
    const source = migrateLegacyModel(makeModel()).document
    const image = source.images[0]!
    const bytes = encoding === 'rgba' ? 4 : 1
    const pixels = new Uint8Array(1024 * 1024 * bytes)
    if (encoding === 'rgba') {
      for (let i = 0; i < pixels.length; i += 4) pixels.set([235, 40, 80, 255], i)
    } else pixels.fill(7)
    source.images[0] = {
      ...image,
      encoding,
      width: 1024,
      height: 1024,
      layers: Array.from({ length: 32 / bytes }, (_, i) => ({
        ...image.layers[0]!,
        id: `layer-${i}`,
        visible: true,
        opacity: 0.1,
        pixels: pixels.slice(),
      })),
    }
    const start = performance.now()
    const heartbeat = worker
      ? new Promise<number>((resolve) => setTimeout(() => resolve(performance.now() - start), 0))
      : null
    const output = worker
      ? await resolveScenePaintIndicators(
          source,
          prepareScenePaintIndicators(source),
          run + 3,
          new AbortController().signal,
        )
      : scenePaintIndicators(source)
    const elapsed = performance.now() - start
    const foregroundMs = heartbeat ? await heartbeat : elapsed
    const digest = new Bun.CryptoHasher('sha256').update(JSON.stringify([...output])).digest('hex')
    if (golden && golden !== digest) throw new Error('Unstable indicator output')
    golden = digest
    if (run >= 0) {
      samples.push(elapsed)
      foreground.push(foregroundMs)
    }
  }
  samples.sort((a, b) => a - b)
  foreground.sort((a, b) => a - b)
  console.log(
    JSON.stringify({
      encoding,
      mib: 32,
      runs: 10,
      p50ms: samples[5],
      p95ms: samples[9],
      golden,
      worker,
      foregroundP50ms: foreground[5],
      foregroundP95ms: foreground[9],
    }),
  )
}
