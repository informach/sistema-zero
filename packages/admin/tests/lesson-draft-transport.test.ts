import { expect, test } from 'bun:test'
import { runLessonDraftRequest } from '../src/lib/lesson-draft-transport'

test.each([
  'resolve',
  'reject',
] as const)('local abort settles before late transport %s', async (reply) => {
  const controller = new AbortController()
  const remote = Promise.withResolvers<string>()
  const reason = new DOMException('retired owner', 'AbortError')
  const local = runLessonDraftRequest(controller.signal, () => remote.promise).catch(
    (error: unknown) => error,
  )
  controller.abort(reason)
  expect(await local).toBe(reason)
  if (reply === 'resolve') remote.resolve('late ACK')
  else remote.reject(new Error('late transport failure'))
  await remote.promise.catch(() => {})
  expect(await local).toBe(reason)
})

test('an already aborted attempt never starts the real transport', async () => {
  const controller = new AbortController()
  controller.abort(new DOMException('obsolete', 'AbortError'))
  let started = false
  const rejected = await runLessonDraftRequest(controller.signal, async () => {
    started = true
    return 'must not send'
  }).catch((error: unknown) => error)
  expect(started).toBe(false)
  expect(rejected).toBe(controller.signal.reason)
})

test('normal reply and synchronous transport failure keep their actual outcome', async () => {
  const controller = new AbortController()
  expect(await runLessonDraftRequest(controller.signal, async () => 'actual ACK')).toBe(
    'actual ACK',
  )
  const failure = new Error('failed before fetch')
  const rejected = await runLessonDraftRequest(controller.signal, () => {
    throw failure
  }).catch((error: unknown) => error)
  expect(rejected).toBe(failure)
})
