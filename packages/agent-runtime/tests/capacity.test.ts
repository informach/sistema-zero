import { expect, test } from 'bun:test'
import { Capacity } from '../src/execution/capacity'

test('admission is bounded and cancellation removes a queued waiter without stealing a slot', async () => {
  const gate = new Capacity(1, 2)
  const signal = new AbortController().signal
  const release = await gate.acquire(signal)
  const controller = new AbortController()
  const canceled = gate.acquire(controller.signal).catch((error) => String(error))
  let admitted = false
  const next = gate.acquire(signal).then((release) => {
    admitted = true
    return release
  })
  await expect(gate.acquire(signal)).rejects.toThrow('full')
  controller.abort(new Error('queue canceled'))
  expect(await canceled).toContain('queue canceled')
  expect(admitted).toBe(false)
  release()
  release()
  const done = await next
  expect(admitted).toBe(true)
  done()
  const final = await gate.acquire(signal)
  final()
})
