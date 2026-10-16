import { expect, test } from 'bun:test'
import { createHash, randomUUID } from 'node:crypto'
import type { VerificationJob } from '../src/domain/ports/workspace-assets-repository.port'
import { WorkspaceAssetVerifier } from '../src/infrastructure/workers/workspace-asset-verifier'

const bytes = Buffer.from('Original preservado')
function fixture(count: number) {
  const jobs: VerificationJob[] = Array.from({ length: count }, () => {
    const id = randomUUID()
    return {
      id,
      token: randomUUID(),
      storageKey: id,
      attempt: 1,
      manifest: {
        schemaVersion: 1,
        id,
        projectId: randomUUID(),
        name: 'origem.txt',
        sha256: createHash('sha256').update(bytes).digest('hex'),
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
    }
  })
  const queue = [...jobs]
  const results: Array<{ id: string; valid: boolean; error: string | null; retryable: boolean }> =
    []
  const errors: string[] = []
  const repo: ConstructorParameters<typeof WorkspaceAssetVerifier>[0] = {
    async claimVerification() {
      return queue.shift() ?? null
    },
    async renewVerification() {
      return true
    },
    async finishVerification(job, result) {
      results.push({ id: job.id, ...result })
    },
  }
  const store: ConstructorParameters<typeof WorkspaceAssetVerifier>[1] = {
    async head() {
      return { exists: true, sizeBytes: bytes.length, contentType: 'text/plain' }
    },
    async getStream() {
      return new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(bytes)
          c.close()
        },
      })
    },
  }
  const logger = {
    debug() {},
    info() {},
    warn() {},
    error(message: string) {
      errors.push(message)
    },
  }
  return { jobs, queue, results, errors, repo, store, logger }
}

test('drena até 20 arquivos por ciclo, preserva ordem, hash e uma única execução concorrente', async () => {
  const f = fixture(41)
  const bad = f.jobs[5]
  if (!bad) throw new Error('Fixture ausente')
  bad.manifest.sha256 = '0'.repeat(64)
  const worker = new WorkspaceAssetVerifier(f.repo, f.store, f.logger)
  const first = worker.tick()
  expect(worker.tick()).toBe(first)
  await first
  expect(f.results).toHaveLength(20)
  expect(f.results.map((r) => r.id)).toEqual(f.jobs.slice(0, 20).map((j) => j.id))
  expect(f.results[5]).toMatchObject({ valid: false, retryable: false })
  expect(f.results.filter((r) => r.valid)).toHaveLength(19)
  await worker.tick()
  expect(f.results).toHaveLength(40)
  await worker.tick()
  expect(f.results).toHaveLength(41)
  expect(f.errors).toEqual([])
  await worker.stop()
})

test('falha transitória conserva retomada e não bloqueia os próximos arquivos', async () => {
  const f = fixture(3)
  const worker = new WorkspaceAssetVerifier(
    f.repo,
    {
      ...f.store,
      async getStream(key, signal) {
        if (key === f.jobs[0]?.storageKey) throw new Error('Conexão interrompida')
        return f.store.getStream(key, signal)
      },
    },
    f.logger,
  )
  await worker.tick()
  expect(f.results.map((r) => [r.valid, r.retryable])).toEqual([
    [false, true],
    [true, false],
    [true, false],
  ])
  await worker.stop()
})

test('encerramento cancela leitura, espera o resultado e não adquire outro arquivo', async () => {
  const f = fixture(3)
  const reading = Promise.withResolvers<void>()
  const cancelled = Promise.withResolvers<void>()
  const worker = new WorkspaceAssetVerifier(
    f.repo,
    {
      ...f.store,
      async getStream() {
        return new ReadableStream<Uint8Array>({
          pull() {
            reading.resolve()
          },
          cancel() {
            cancelled.resolve()
          },
        })
      },
    },
    f.logger,
  )
  const flight = worker.tick()
  await reading.promise
  await worker.stop()
  await cancelled.promise
  await flight
  expect(f.results).toHaveLength(1)
  expect(f.results[0]).toMatchObject({
    valid: false,
    retryable: true,
    error: 'Servidor reiniciando',
  })
  expect(f.queue).toHaveLength(2)
  await worker.tick()
  expect(f.queue).toHaveLength(2)
})

test('encerramento durante aquisição devolve a concessão sem abrir a mídia', async () => {
  const f = fixture(2)
  const claimed = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  let opened = false
  const worker = new WorkspaceAssetVerifier(
    {
      ...f.repo,
      async claimVerification() {
        const job = await f.repo.claimVerification()
        claimed.resolve()
        await release.promise
        return job
      },
    },
    {
      ...f.store,
      async head(key) {
        opened = true
        return f.store.head(key)
      },
    },
    f.logger,
  )
  const flight = worker.tick()
  await claimed.promise
  const stopped = worker.stop()
  release.resolve()
  await stopped
  await flight
  expect(opened).toBe(false)
  expect(f.results).toHaveLength(1)
  expect(f.results[0]).toMatchObject({ valid: false, retryable: true })
  expect(f.queue).toHaveLength(1)
})

test('falha do repositório é registrada, não libera voo prematuro e permite outro ciclo', async () => {
  const f = fixture(2)
  let fail = true
  const worker = new WorkspaceAssetVerifier(
    {
      ...f.repo,
      async claimVerification() {
        if (fail) {
          fail = false
          throw new Error('Banco indisponível')
        }
        return f.repo.claimVerification()
      },
    },
    f.store,
    f.logger,
  )
  await worker.tick()
  expect(f.errors).toHaveLength(1)
  expect(f.results).toHaveLength(0)
  await worker.tick()
  expect(f.results).toHaveLength(2)
  await worker.stop()
})
