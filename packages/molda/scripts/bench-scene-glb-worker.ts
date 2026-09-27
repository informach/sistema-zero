import { strict as assert } from 'node:assert'
import { cpus, platform } from 'node:os'
import { encodeSceneGlb } from '../src/export/sceneGlb'
import { readSceneDocument } from '../src/scene/readDocument'
import { makeSceneGlbFixture } from '../src/testing/sceneGlbFixture'
import { prepareSceneGlbInWorker } from '../src/workers/sceneGlb'
import { readSceneGlbReply, sceneGlbReply } from '../src/workers/sceneGlbProtocol'

function stats(values: number[]) {
  values.sort((a, b) => a - b)
  const at = (p: number) => +values[Math.ceil(values.length * p) - 1]!.toFixed(3)
  return { p50: at(0.5), p95: at(0.95), max: at(1) }
}
console.info(`${platform()}; ${cpus()[0]?.model}; Bun ${Bun.version}; warmup=3 samples=20`)
// Runtime probe, not browser/GPU/hardware certification. A fresh worker is used for every request.
for (const [parts, grid, keys, textureSide, layers] of [
  [1, 1, 3, 0, 1],
  [1, 96, 64, 0, 1],
  [128, 1, 512, 512, 1],
  [128, 1, 512, 1024, 8],
] as const) {
  const source = makeSceneGlbFixture(parts, grid, keys, textureSide, layers)
  assert.equal(readSceneDocument(source).status, 'valid')
  const before = structuredClone(source),
    golden = encodeSceneGlb(source)
  const total: number[] = [],
    prepareCall: number[] = [],
    send: number[] = [],
    gaps: number[] = [],
    replyRead: number[] = [],
    construct: number[] = []
  let ticks = 0
  for (let sample = 0; sample < 23; sample++) {
    let last = performance.now(),
      maxGap = 0,
      count = 0,
      sendMs = 0,
      prepareCallMs = 0,
      constructMs = 0
    const timer = setInterval(() => {
      const now = performance.now()
      maxGap = Math.max(maxGap, now - last)
      last = now
      count++
    }, 1)
    const request = {
      document: source,
      documentId: source.id,
      revision: sample,
      animatedPaint: false,
    }
    let result: ReturnType<typeof encodeSceneGlb>, elapsed: number
    try {
      const start = performance.now()
      const pending = prepareSceneGlbInWorker(request, {
        createWorker: () => {
          const started = performance.now()
          const worker = new Worker(new URL('../src/workers/sceneGlb.worker.ts', import.meta.url), {
            type: 'module',
          })
          constructMs = performance.now() - started
          return {
            addEventListener: worker.addEventListener.bind(worker),
            removeEventListener: worker.removeEventListener.bind(worker),
            terminate: worker.terminate.bind(worker),
            postMessage: (message: unknown) => {
              const start = performance.now()
              worker.postMessage(message)
              sendMs = performance.now() - start
            },
          }
        },
      })
      prepareCallMs = performance.now() - start
      result = await pending
      elapsed = performance.now() - start
      // Include the final response-processing gap before stopping the timer.
      await new Promise((resolve) => setTimeout(resolve, 1))
    } finally {
      clearInterval(timer)
    }
    assert.deepEqual(result, golden)
    const reply = sceneGlbReply(request, result),
      readStart = performance.now()
    readSceneGlbReply(reply, request)
    const readMs = performance.now() - readStart
    if (sample >= 3) {
      total.push(elapsed)
      prepareCall.push(prepareCallMs)
      send.push(sendMs)
      gaps.push(maxGap)
      replyRead.push(readMs)
      construct.push(constructMs)
      ticks += count
    }
  }
  assert.deepEqual(source, before)
  console.info(
    JSON.stringify({
      parts,
      faces: grid * grid,
      sourceKeys: parts * keys,
      textureSide,
      layers,
      sourcePixelBytes: textureSide * textureSide * 4 * layers,
      resultBytes: golden.bytes.length,
      totalMs: stats(total),
      prepareCallSyncMs: stats(prepareCall),
      postMessageSyncMs: stats(send),
      constructWorkerSyncMs: stats(construct),
      maxTimerGapMs: stats(gaps),
      replyReadOnlyMs: stats(replyRead),
      ticks,
      exact: true,
      sourceUnchanged: true,
      sha256: new Bun.CryptoHasher('sha256').update(golden.bytes).digest('hex'),
    }),
  )
}
