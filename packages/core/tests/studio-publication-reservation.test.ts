import { expect, test } from 'bun:test'
import { StudioReservationRetirementSchema } from '../src/studio/publication-reservation'

function retirement() {
  const reservationId = crypto.randomUUID()
  return {
    version: 1 as const,
    deliveryId: `studio-reservation-cleanup:${reservationId}`,
    reservationId,
    playId: crypto.randomUUID(),
    authorId: crypto.randomUUID(),
    accountId: crypto.randomUUID(),
    audience: 'kids' as const,
    snapshotHash: 'a'.repeat(64),
    context: { kind: 'free' as const, audience: 'kids' as const },
  }
}

test('retirement attests one exact reservation and audience, never a legacy post or URL', () => {
  const value = retirement()
  expect(StudioReservationRetirementSchema.parse(value)).toEqual(value)
  for (const invalid of [
    { ...value, deliveryId: `studio-reservation-cleanup:${crypto.randomUUID()}` },
    { ...value, snapshotHash: null },
    { ...value, accountId: null },
    { ...value, audience: 'adult' },
    { ...value, context: { kind: 'free', audience: 'adult' } },
    { ...value, coverUrl: 'https://unrelated.test/file.png' },
    {
      ...value,
      context: { kind: 'lesson', lessonId: 'untrusted-path', blockId: crypto.randomUUID() },
    },
  ])
    expect(StudioReservationRetirementSchema.safeParse(invalid).success).toBe(false)
})
