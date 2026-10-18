import { expect, test } from 'bun:test'
import { awaitWithSignal } from './await-with-signal'

test('already aborted work is not dispatched', async () => {
  const controller = new AbortController()
  controller.abort(new Error('retired'))
  let called = false
  await expect(
    awaitWithSignal(async () => {
      called = true
    }, controller.signal),
  ).rejects.toThrow('retired')
  expect(called).toBe(false)
})

test('a hanging operation settles on abort and disposes a late value exactly once', async () => {
  const controller = new AbortController()
  let entered!: () => void, release!: (value: number) => void
  const started = new Promise<void>((yes) => {
    entered = yes
  })
  const retired: number[] = []
  const pending = awaitWithSignal(
    () => {
      entered()
      return new Promise<number>((yes) => {
        release = yes
      })
    },
    controller.signal,
    (value) => {
      retired.push(value)
    },
  )
  await started
  controller.abort(new Error('context changed'))
  await expect(pending).rejects.toThrow('context changed')
  release(42)
  await Promise.resolve()
  await Promise.resolve()
  expect(retired).toEqual([42])
})

test('completion and producer errors retain their original result without retiring current values', async () => {
  let retired = 0
  const signal = new AbortController().signal
  expect(
    await awaitWithSignal(
      async () => 42,
      signal,
      () => {
        retired++
      },
    ),
  ).toBe(42)
  const original = new Error('upstream unavailable')
  await expect(
    awaitWithSignal(async () => {
      throw original
    }, signal),
  ).rejects.toBe(original)
  expect(retired).toBe(0)
})
