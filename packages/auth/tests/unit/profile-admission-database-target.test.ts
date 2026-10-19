import { expect, test } from 'bun:test'
import {
  OwnedProfileAdmissionTestWork,
  profileAdmissionTestTarget,
} from '../db/profile-admission-database'

test('Auth admission SQL target requires explicit loopback, PostgreSQL and its owned prefix', () => {
  expect(
    profileAdmissionTestTarget('postgres://test@127.0.0.1:5434/kids_journey_auth_admission_red')
      .hostname,
  ).toBe('127.0.0.1')
  for (const raw of [
    'postgres://test@db.example.test/kids_journey_auth_admission_red',
    'postgres://test@127.0.0.1/sistema_zero',
    'postgres://test@127.0.0.1/kids_journey_canonical',
    'https://127.0.0.1/kids_journey_auth_admission_red',
  ])
    expect(() => profileAdmissionTestTarget(raw)).toThrow()
})

test('owned Auth hooks enqueue before waiting, so expired callers cannot overlap resets', async () => {
  const owned = new OwnedProfileAdmissionTestWork()
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const order: string[] = []
  const earlier = owned.track(async () => {
    await gate
    order.push('earlier')
  })
  const firstReset = owned.track(async () => {
    order.push('first-reset')
  })
  const secondReset = owned.track(async () => {
    order.push('second-reset')
  })
  await Promise.resolve()
  expect(order).toEqual([])
  release()
  await Promise.all([earlier, firstReset, secondReset, owned.drain()])
  expect(order).toEqual(['earlier', 'first-reset', 'second-reset'])
})
