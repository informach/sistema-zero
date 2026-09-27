import { expect, test } from 'bun:test'
import { resumeExistingCreation } from '../src/lib/resume-creation'

test('opening an existing creation keeps local edits and does not pull over them', async () => {
  const local = { id: 'same-id', name: 'Meus ajustes' }
  let restored = false
  expect(
    await resumeExistingCreation(
      'same-id',
      async () => local,
      async () => {
        restored = true
        return true
      },
    ),
  ).toBe(local)
  expect(restored).toBe(false)
})
test('a missing creation is restored under the same ID and never fabricated', async () => {
  let local: { id: string } | null = null
  expect(
    await resumeExistingCreation(
      'same-id',
      async () => local,
      async (id) => {
        local = { id }
        return true
      },
    ),
  ).toEqual({ id: 'same-id' })
  expect(
    await resumeExistingCreation(
      'missing',
      async () => null,
      async () => false,
    ),
  ).toBeNull()
})
test('a local save racing with restore is retained; network errors propagate', async () => {
  let local: { id: string } | null = null
  expect(
    await resumeExistingCreation(
      'same-id',
      async () => local,
      async (id) => {
        local = { id }
        return false
      },
    ),
  ).toEqual({ id: 'same-id' })
  const results = await Promise.allSettled([
    resumeExistingCreation(
      'other',
      async () => null,
      async () => {
        throw new Error('offline')
      },
    ),
  ])
  expect(results[0]?.status).toBe('rejected')
})
