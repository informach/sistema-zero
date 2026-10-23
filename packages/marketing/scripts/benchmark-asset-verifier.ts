import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import type { VerificationJob } from '../src/domain/ports/workspace-assets-repository.port'
import { WorkspaceAssetVerifier } from '../src/infrastructure/workers/workspace-asset-verifier'

// The production idle poll is 5 s. This deterministic adapter uses a 20 ms poll
// to measure scheduler overhead independently of R2/network/SQL variability.
const pollMs = 20
const count = 30
const bytes = Buffer.alloc(256 * 1024, 42)
const digest = createHash('sha256').update(bytes).digest('hex')
const results = []
for (let run = 0; run < 13; run++) {
  const jobs: VerificationJob[] = Array.from({ length: count }, (_, index) => ({
    id: String(index),
    token: String(index),
    storageKey: String(index),
    attempt: 1,
    manifest: {
      schemaVersion: 1,
      id: String(index),
      projectId: 'benchmark',
      name: String(index),
      sha256: index === 5 ? '0'.repeat(64) : digest,
      size: bytes.length,
      mime: 'text/plain',
      role: 'original',
      sourceAssetId: null,
      width: null,
      height: null,
      durationMs: null,
      codec: null,
      rotation: null,
    },
  }))
  const completed: Array<{ id: string; valid: boolean; error: string | null; retryable: boolean }> =
    []
  let busyMs = 0
  let firstWork = 0
  let workStarted = 0
  const { promise: done, resolve: finished } = Promise.withResolvers<void>()
  const worker = new WorkspaceAssetVerifier(
    {
      async claimVerification() {
        workStarted = performance.now()
        return jobs.shift() ?? null
      },
      async renewVerification() {
        return true
      },
      async finishVerification(job, result) {
        busyMs += performance.now() - workStarted
        completed.push({ id: job.id, ...result })
        if (completed.length === count) finished()
      },
    },
    {
      async head() {
        return { exists: true, sizeBytes: bytes.length, contentType: 'text/plain' }
      },
      async getStream() {
        const start = performance.now()
        firstWork ||= start
        return new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(bytes)
            controller.close()
          },
        })
      },
    },
    {
      debug() {},
      info() {},
      warn() {},
      error(_message, fields) {
        throw new Error(JSON.stringify(fields))
      },
    },
  )
  const start = performance.now()
  const timer = setInterval(() => {
    void worker.tick()
  }, pollMs)
  try {
    await done
  } finally {
    clearInterval(timer)
    await worker.stop()
  }
  const elapsedMs = performance.now() - start
  const golden = createHash('sha256')
    .update(JSON.stringify(completed.sort((a, b) => Number(a.id) - Number(b.id))))
    .digest('hex')
  if (run >= 3)
    results.push({
      elapsedMs,
      busyMs,
      initialWaitMs: firstWork - start,
      golden,
      rss: process.memoryUsage().rss,
    })
}
const sorted = results.map((r) => r.elapsedMs).sort((a, b) => a - b)
const result = {
  pollMs,
  productionPollMs: 5000,
  count,
  warmups: 3,
  runs: 10,
  results,
  p50: sorted[4],
  p95: sorted[9],
  throughputPerSecond: (count * 1000) / (sorted[4] ?? 1),
  maxRss: Math.max(...results.map((r) => r.rss)),
  golden: [...new Set(results.map((r) => r.golden))],
}
const output = process.argv[2]
if (!output) throw new Error('Informe o arquivo de evidência')
await mkdir(new URL('../../../.cache/', import.meta.url), { recursive: true })
await writeFile(output, JSON.stringify(result, null, 2))
console.log(JSON.stringify(result))
