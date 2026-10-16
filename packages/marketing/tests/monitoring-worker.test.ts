import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { FeedError, type FeedResult } from '../src/domain/intelligence/feed'
import type {
  MonitoringJob,
  MonitoringRepository,
} from '../src/domain/ports/monitoring-repository.port'
import { MonitoringWorker } from '../src/infrastructure/workers/monitoring-worker'

const logger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} }
const result: FeedResult = {
  entries: [],
  etag: null,
  notModified: false,
  observedEntries: 0,
  truncated: false,
}
function fixture() {
  const job: MonitoringJob = {
    projectId: randomUUID(),
    watchlistId: randomUUID(),
    ownerId: randomUUID(),
    leaseToken: randomUUID(),
    version: 1,
    attempt: 1,
    etag: null,
    config: {
      mode: 'feed',
      feedUrl: 'https://example.com/feed.xml',
      intervalHours: 24,
      timeZone: 'America/Sao_Paulo',
      dailyCallBudget: 24,
      enabled: true,
    },
  }
  const queue = [job],
    outcomes: Parameters<MonitoringRepository['finish']>[1][] = []
  return {
    job,
    outcomes,
    repo: {
      claim: async () => queue.shift() ?? null,
      finish: async (
        _job: MonitoringJob,
        outcome: Parameters<MonitoringRepository['finish']>[1],
      ) => {
        outcomes.push(outcome)
        return true
      },
    },
  }
}
test('conta desativada antes ou depois da consulta não registra observação', async () => {
  for (const inactiveBefore of [true, false]) {
    const f = fixture()
    let reads = 0,
      calls = 0
    const worker = new MonitoringWorker(
      f.repo,
      {
        collect: async () => {
          calls++
          return result
        },
      },
      {
        lookup: async () => [
          { id: f.job.ownerId, name: 'Responsável', active: !inactiveBefore && ++reads === 1 },
        ],
      },
      logger,
    )
    await worker.tick()
    expect(calls).toBe(inactiveBefore ? 0 : 1)
    expect(f.outcomes).toHaveLength(1)
    expect(f.outcomes[0]).toMatchObject({ retryable: false })
  }
})
test('tick concorrente não duplica fonte e shutdown aborta sem confirmar resultado', async () => {
  const f = fixture()
  let entered: () => void = () => {},
    calls = 0
  const started = new Promise<void>((resolve) => {
    entered = resolve
  })
  const worker = new MonitoringWorker(
    f.repo,
    {
      collect: async (_input, signal) => {
        calls++
        entered()
        return new Promise<FeedResult>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new FeedError('Interrompida', true)), {
            once: true,
          })
        })
      },
    },
    { lookup: async () => [{ id: f.job.ownerId, name: 'Responsável', active: true }] },
    logger,
  )
  const first = worker.tick(),
    second = worker.tick()
  await started
  await worker.stop()
  await Promise.all([first, second])
  expect(calls).toBe(1)
  expect(f.outcomes).toHaveLength(1)
  expect(f.outcomes[0]).toMatchObject({ retryable: true })
  await worker.tick()
  expect(calls).toBe(1)
})
test('retry-after é preservado e coleta bem sucedida conserva cobertura', async () => {
  const f = fixture(),
    worker = new MonitoringWorker(
      f.repo,
      {
        collect: async () => {
          throw new FeedError('HTTP 429', true, 90000)
        },
      },
      { lookup: async () => [{ id: f.job.ownerId, name: 'Responsável', active: true }] },
      logger,
    )
  await worker.tick()
  expect(f.outcomes[0]).toMatchObject({ retryAfterMs: 90000, retryable: true })
  const g = fixture(),
    success = new MonitoringWorker(
      g.repo,
      { collect: async () => ({ ...result, observedEntries: 99, truncated: true }) },
      { lookup: async () => [{ id: g.job.ownerId, name: 'Responsável', active: true }] },
      logger,
    )
  await success.tick()
  expect(g.outcomes[0]).toMatchObject({ result: { observedEntries: 99, truncated: true } })
})
