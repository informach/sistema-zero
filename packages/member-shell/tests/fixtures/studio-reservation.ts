import {
  type StudioReservationRetirement,
  StudioReservationRetirementSchema,
} from '@sistemazero/core/studio/publication-reservation'

export function reservationFixture(overrides: Partial<StudioReservationRetirement> = {}) {
  const reservationId = overrides.reservationId ?? crypto.randomUUID()
  const audience = overrides.audience ?? 'kids'
  const authorId = overrides.authorId ?? crypto.randomUUID()
  return StudioReservationRetirementSchema.parse({
    version: 1,
    deliveryId: `studio-reservation-cleanup:${reservationId}`,
    reservationId,
    playId: crypto.randomUUID(),
    authorId,
    accountId: audience === 'adult' ? authorId : crypto.randomUUID(),
    audience,
    snapshotHash: 'a'.repeat(64),
    context: { kind: 'free', audience },
    ...overrides,
  })
}
