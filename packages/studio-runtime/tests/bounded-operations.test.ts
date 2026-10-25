import { expect, test } from 'bun:test'
import { runBoundedOperations } from '../src/bounded-operations'

function deferred() {
  let resolve!: () => void, reject!: (reason?: unknown) => void
  const promise = new Promise<void>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

test('native work is bounded, visits each item once and finishes with no pending operation', async () => {
  const gate = deferred(),
    first = deferred(),
    seen: number[] = []
  let active = 0,
    peak = 0
  const work = runBoundedOperations([0, 1, 2, 3, 4, 5], 2, async (item) => {
    active++
    peak = Math.max(peak, active)
    seen.push(item)
    first.resolve()
    await gate.promise
    active--
  })
  await first.promise
  expect(seen).toEqual([0, 1])
  gate.resolve()
  await work
  expect(peak).toBe(2)
  expect(active).toBe(0)
  expect(seen).toEqual([0, 1, 2, 3, 4, 5])
})

test('a falsy failure stops admission and drains the already admitted operation before rejecting', async () => {
  const fail = deferred(),
    held = deferred(),
    caught = deferred()
  const seen: number[] = []
  let settled = false
  const work = runBoundedOperations([0, 1, 2], 2, async (item) => {
    seen.push(item)
    if (item === 0) {
      try {
        await fail.promise
      } catch (error) {
        caught.resolve()
        throw error
      }
    } else await held.promise
  })
  let rejection: unknown = 'not-rejected'
  const outcome = work.then(
    () => {
      settled = true
    },
    (error: unknown) => {
      settled = true
      rejection = error
    },
  )
  fail.reject(undefined)
  await caught.promise
  await new Promise<void>((resolve) => setImmediate(resolve))
  expect(settled).toBe(false)
  expect(seen).toEqual([0, 1])
  held.resolve()
  await outcome
  expect(settled).toBe(true)
  expect(rejection).toBeUndefined()
})

test('invalid budgets never start native work; an empty selection has no side effects', async () => {
  let calls = 0
  for (const count of [0, -1, 1.5, 5, NaN])
    await expect(
      runBoundedOperations([1], count, async () => {
        calls++
      }),
    ).rejects.toThrow()
  await runBoundedOperations([], 4, async () => {
    calls++
  })
  expect(calls).toBe(0)
})
