import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { awaitWithSignal } from '@sistemazero/core/http'
import { buildApp } from '../helpers'

test.each([
  false,
  true,
])('gallery commit owns initial authorization (pre-aborted=%s)', async (preAborted) => {
  const env = buildApp()
  const controller = new AbortController()
  const entered = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  let reads = 0
  env.courses.findLessonWithContent = async () => {
    reads++
    entered.resolve()
    await release.promise
    return null
  }
  if (preAborted) controller.abort(new DOMException('Leaving the lesson', 'AbortError'))
  const pending = env.gallery
    .commit(
      { userId: randomUUID(), accountId: randomUUID(), privileged: false },
      randomUUID(),
      randomUUID(),
      {
        requestId: randomUUID(),
        revision: 'a'.repeat(32),
        items: [{ itemId: 'project', revision: 1 }],
      },
      {},
      { signal: controller.signal, copyGeneration: randomUUID() },
    )
    .then(
      () => 'accepted',
      (error: Error) => error.name,
    )
  try {
    if (!preAborted) {
      await awaitWithSignal(() => entered.promise, AbortSignal.timeout(1500))
      controller.abort(new DOMException('Leaving the lesson', 'AbortError'))
    }
    expect(await awaitWithSignal(() => pending, AbortSignal.timeout(1500))).toBe('AbortError')
    expect(reads).toBe(preAborted ? 0 : 1)
    expect(env.studioSubmissions.submissions).toHaveLength(0)
    release.resolve()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(env.studioSubmissions.submissions).toHaveLength(0)
  } finally {
    release.resolve()
    controller.abort()
    await pending
  }
})
