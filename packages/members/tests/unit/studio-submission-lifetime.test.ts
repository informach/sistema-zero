import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { buildApp } from '../helpers'

const USER = '22222222-2222-2222-2222-222222222222'
const tick = () => new Promise((resolve) => setTimeout(resolve, 30))

test('submission settles when withdrawn while initial context read ignores signal', async () => {
  const env = buildApp()
  const lifetime = new AbortController()
  let entered = false,
    settled = false
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  env.courses.findLessonWithContent = async () => {
    entered = true
    await gate
    return null
  }
  const outcome = env.submitStudio
    .execute(
      USER,
      randomUUID(),
      randomUUID(),
      { formatVersion: 3, programmingLanguage: 'python' },
      { signal: lifetime.signal },
    )
    .then(
      () => {
        settled = true
        return 'accepted'
      },
      (error: Error) => {
        settled = true
        return error.name
      },
    )
  try {
    await tick()
    expect(entered).toBe(true)
    lifetime.abort(new DOMException('Profile withdrawn', 'AbortError'))
    await tick()
    expect(settled).toBe(true)
    expect(await outcome).toBe('AbortError')
  } finally {
    release()
    await outcome
  }
})

test('already withdrawn submission does not dispatch initial context read', async () => {
  const env = buildApp()
  const lifetime = new AbortController()
  lifetime.abort(new DOMException('Profile withdrawn', 'AbortError'))
  let reads = 0
  env.courses.findLessonWithContent = async () => {
    reads++
    return null
  }
  const reason = await env.submitStudio
    .execute(
      USER,
      randomUUID(),
      randomUUID(),
      { formatVersion: 3, programmingLanguage: 'python' },
      { signal: lifetime.signal },
    )
    .then(
      () => 'accepted',
      (error: Error) => error.name,
    )
  expect(reads).toBe(0)
  expect(reason).toBe('AbortError')
})
