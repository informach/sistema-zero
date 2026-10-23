import { expect, mock, test } from 'bun:test'
import type { KidsCreatorCapability } from '@sistemazero/core/journey'
import { pensaKidsJourney } from './pensa-fixtures'

mock.module('server-only', () => ({}))
const { readKidsCapabilities } = await import('../src/server/creative-apps-access')

function members(result: { status: number; body?: unknown }) {
  return { getGamification: async () => result } as unknown as Parameters<
    typeof readKidsCapabilities
  >[0]
}

test('creative handlers use custom persisted capabilities independently of learner rank', async () => {
  expect(
    await readKidsCapabilities(
      members({
        status: 200,
        body: {
          level: { slug: 'noob' },
          kidsJourney: pensaKidsJourney('noob', ['ai', 'pensa']),
        },
      }),
      ['ai', 'pensa'],
    ),
  ).toBe('allowed')
  expect(
    await readKidsCapabilities(
      members({
        status: 200,
        body: {
          level: { slug: 'god' },
          kidsJourney: pensaKidsJourney('god', []),
        },
      }),
      ['ai'],
    ),
  ).toBe('locked')
  expect(
    await readKidsCapabilities(
      members({
        status: 200,
        body: {
          kidsJourney: pensaKidsJourney('hacker', ['ai']),
        },
      }),
      ['ai', 'pensa'],
    ),
  ).toBe('locked')
})

test('policy failure or missing metadata is unavailable, never an empty earned rank or role bypass', async () => {
  for (const response of [
    { status: 503 },
    { status: 200, body: { level: { slug: 'god' }, role: 'staff' } },
    { status: 200, body: { kidsJourney: { ...pensaKidsJourney(), policyVersion: 0 } } },
  ]) {
    expect(await readKidsCapabilities(members(response), ['ai'])).toBe('unavailable')
  }
  expect(
    await readKidsCapabilities(
      {
        getGamification: async () => {
          throw new Error('offline')
        },
      },
      ['ai'],
    ),
  ).toBe('unavailable')
})

test('required capabilities are captured before waiting for Members', async () => {
  const required: KidsCreatorCapability[] = ['ai', 'pensa']
  let release!: () => void
  const barrier = new Promise<void>((resolve) => {
    release = resolve
  })
  const source = members({ status: 200, body: { kidsJourney: pensaKidsJourney('god', []) } })
  const result = readKidsCapabilities(
    {
      getGamification: async () => {
        await barrier
        return source.getGamification()
      },
    },
    required,
  )
  required.splice(0)
  release()
  expect(await result).toBe('locked')
})
