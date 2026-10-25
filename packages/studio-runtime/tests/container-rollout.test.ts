import { expect, test } from 'bun:test'
import { containerImageState, waitForContainerImage } from '../scripts/container-rollout'

const target = `registry.test/runtime@sha256:${'a'.repeat(64)}`
const state = (patch: Record<string, unknown> = {}) => ({
  version: 3,
  configuration: { image: target },
  active_rollout_id: null,
  health: { errors: [], instances: { healthy: 1, failed: 0 } },
  ...patch,
})

test('deploy completion cannot approve an old image, an active rollout or an unhealthy pool', () => {
  for (const value of [
    state({ configuration: { image: 'old-image' } }),
    state({ active_rollout_id: 'pending' }),
    state({ health: { errors: [], instances: { healthy: 0, failed: 0 } } }),
    state({ health: { errors: [], instances: { healthy: 1, failed: 1 } } }),
    state({ health: { errors: ['provider failure'], instances: { healthy: 1, failed: 0 } } }),
  ])
    expect(containerImageState(value, target).ready).toBe(false)
  expect(containerImageState(state(), target).ready).toBe(true)
  const finished: Record<string, unknown> = state()
  delete finished.active_rollout_id
  expect(containerImageState(finished, target).ready).toBe(true)
  expect(() => containerImageState({}, target)).toThrow()
})

test('a target image must be healthy and stable in two independent observations', async () => {
  const rows = [
    state({ configuration: { image: 'old' } }),
    state({ active_rollout_id: 'moving' }),
    state(),
    state({ version: 4 }),
    state({ version: 4 }),
  ]
  let reads = 0,
    pauses = 0
  const result = await waitForContainerImage({
    expectedImage: target,
    signal: new AbortController().signal,
    read: async () => rows[reads++],
    pause: async () => {
      pauses++
    },
  })
  expect(result.version).toBe(4)
  expect([reads, pauses]).toEqual([5, 4])
})

test('a retired verification never accepts a late healthy response', async () => {
  const controller = new AbortController()
  let pauses = 0
  await expect(
    waitForContainerImage({
      expectedImage: target,
      signal: controller.signal,
      read: async () => {
        controller.abort()
        return state()
      },
      pause: async () => {
        pauses++
      },
    }),
  ).rejects.toThrow()
  expect(pauses).toBe(0)
})
