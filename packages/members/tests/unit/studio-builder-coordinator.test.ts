import { describe, expect, test } from 'bun:test'
import type { StudioProBuilderJob } from '@sistemazero/core/studio'
import {
  createStudioBuilderCoordinator,
  type StudioBuilderExecution,
} from '../../src/application/studio-pro/studio-builder-coordinator'

const execution = (id = crypto.randomUUID()): StudioBuilderExecution => ({
  id,
  projectId: 'game',
  parentOrigin: 'https://kids.test',
  actor: { accountId: crypto.randomUUID(), userId: crypto.randomUUID(), privileged: false },
})
const state = (phase: StudioProBuilderJob['phase'], modelCalls = 0) =>
  ({ phase, modelCalls }) as StudioProBuilderJob
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('durable builder delivery coordinator', () => {
  test('a failed delivery stays in the database and a fresh process delivers the same identity', async () => {
    const job = execution(),
      received: string[] = [],
      errors: unknown[] = []
    const dependencies = {
      pending: async () => [job],
      reconcile: async () => state('queued'),
      finish: async () => {},
      report: (error: unknown) => {
        errors.push(error)
      },
    }
    const first = createStudioBuilderCoordinator({
      ...dependencies,
      deliver: async (item) => {
        received.push(item.id)
        throw new Error('network')
      },
    })
    await first.tick()
    await first.idle()
    await first.stop()
    const restarted = createStudioBuilderCoordinator({
      ...dependencies,
      deliver: async (item) => {
        received.push(item.id)
      },
    })
    await restarted.tick()
    await restarted.idle()
    await restarted.stop()
    expect(received).toEqual([job.id, job.id])
    expect(errors).toHaveLength(1)
  })
  test('caps concurrency, avoids overlapping reads and does not redeliver an in-flight job', async () => {
    const jobs = [execution(), execution(), execution()],
      delivery = deferred<void>(),
      read = deferred<StudioBuilderExecution[]>()
    const received: string[] = []
    let reads = 0
    const coordinator = createStudioBuilderCoordinator({
      pending: async () => {
        reads++
        return read.promise
      },
      reconcile: async () => state('queued'),
      deliver: async (job) => {
        received.push(job.id)
        await delivery.promise
      },
      finish: async () => {},
      report: () => {},
    })
    const first = coordinator.tick(),
      second = coordinator.tick()
    expect(reads).toBe(1)
    read.resolve(jobs)
    await Promise.all([first, second])
    await coordinator.tick()
    expect(received).toEqual(jobs.slice(0, 2).map((job) => job.id))
    expect(reads).toBe(1)
    delivery.resolve()
    await coordinator.stop()
  })
  test('reconciles expired/cancelled jobs and retries settlement without calling the executor', async () => {
    const job = execution()
    let attempts = 0,
      deliveries = 0
    const coordinator = createStudioBuilderCoordinator({
      pending: async () => (attempts < 2 ? [job] : []),
      reconcile: async () => state('failed', 1),
      deliver: async () => {
        deliveries++
      },
      finish: async () => {
        attempts++
        if (attempts === 1) throw new Error('ledger unavailable')
      },
      report: () => {},
    })
    await coordinator.tick()
    await coordinator.idle()
    await coordinator.tick()
    await coordinator.idle()
    await coordinator.stop()
    expect(attempts).toBe(2)
    expect(deliveries).toBe(0)
  })
  test('shutdown awaits a pending database read and prevents dispatch after it completes', async () => {
    const read = deferred<StudioBuilderExecution[]>()
    let deliveries = 0,
      stopped = false
    const coordinator = createStudioBuilderCoordinator({
      pending: () => read.promise,
      reconcile: async () => state('queued'),
      deliver: async () => {
        deliveries++
      },
      finish: async () => {},
      report: () => {},
    })
    const tick = coordinator.tick()
    const stopping = coordinator.stop().then(() => {
      stopped = true
    })
    await Promise.resolve()
    expect(stopped).toBe(false)
    read.resolve([execution()])
    await Promise.all([tick, stopping])
    await coordinator.tick()
    expect(stopped).toBe(true)
    expect(deliveries).toBe(0)
  })
  test('shutdown aborts delivery and waits for its cleanup', async () => {
    const started = deferred<void>()
    let aborted = false
    const coordinator = createStudioBuilderCoordinator({
      pending: async () => [execution()],
      reconcile: async () => state('validating', 1),
      deliver: async (_job, signal) => {
        started.resolve()
        await new Promise<void>((resolve) =>
          signal.addEventListener(
            'abort',
            () => {
              aborted = true
              resolve()
            },
            { once: true },
          ),
        )
      },
      finish: async () => {},
      report: () => {},
    })
    await coordinator.tick()
    await started.promise
    await coordinator.stop()
    expect(aborted).toBe(true)
  })
})
