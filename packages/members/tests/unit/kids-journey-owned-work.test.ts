import { expect, test } from 'bun:test'
import { OwnedKidsJourneyTestWork } from '../db/kids-journey-database'

test('a next reset drains owned work even after its original caller stopped waiting', async () => {
  const owned = new OwnedKidsJourneyTestWork()
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let committed = false
  const previous = owned.track(async () => {
    await gate
    committed = true
  })
  let reset = false
  const nextReset = owned.drain().then(() => {
    expect(committed).toBe(true)
    reset = true
  })
  await Promise.resolve()
  expect(reset).toBe(false)
  release()
  await Promise.all([previous, nextReset])
  expect(reset).toBe(true)
})

test('failed owned work still rejects its caller and is drained before subsequent work', async () => {
  const owned = new OwnedKidsJourneyTestWork()
  const failed = owned.track(async () => {
    throw new Error('owned transaction rolled back')
  })
  await expect(failed).rejects.toThrow('rolled back')
  await owned.drain()
  let started = false
  await owned.track(async () => {
    started = true
  })
  expect(started).toBe(true)
})

test('queued hooks remain serial when earlier callers stop waiting during a drain', async () => {
  const owned = new OwnedKidsJourneyTestWork()
  let releasePrevious!: () => void
  const previousGate = new Promise<void>((resolve) => {
    releasePrevious = resolve
  })
  let releaseFirstReset!: () => void
  const resetGate = new Promise<void>((resolve) => {
    releaseFirstReset = resolve
  })
  const order: string[] = []
  const previous = owned.track(async () => {
    await previousGate
    order.push('previous-complete')
  })
  const firstReset = owned.track(async () => {
    order.push('first-start')
    await resetGate
    order.push('first-complete')
  })
  const secondReset = owned.track(async () => {
    order.push('second-start')
  })
  await Promise.resolve()
  expect(order).toEqual([])
  releasePrevious()
  await previous
  await Promise.resolve()
  expect(order).toEqual(['previous-complete', 'first-start'])
  releaseFirstReset()
  await Promise.all([firstReset, secondReset, owned.drain()])
  expect(order).toEqual(['previous-complete', 'first-start', 'first-complete', 'second-start'])
})
