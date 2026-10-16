import { expect, test } from 'bun:test'
import { EngagementWorker } from '../../src/infrastructure/workers/engagement-worker'

test('manutenção funciona sem credenciais ou adaptador Meta', async () => {
  const calls: Date[] = []
  const worker = new EngagementWorker(
    async (now) => {
      calls.push(now)
    },
    null,
    {
      info() {},
      debug() {},
      warn() {},
      error() {},
    },
  )
  await worker.tick()
  await worker.tick()
  await worker.stop()
  expect(calls).toHaveLength(1)
  expect(Number.isFinite(calls[0]?.getTime())).toBe(true)
})
