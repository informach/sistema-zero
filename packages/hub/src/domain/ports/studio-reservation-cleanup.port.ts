import type { StudioReservationRetirement } from '@sistemazero/core/studio/publication-reservation'

export interface StudioReservationCleanupRepository {
  claim(now: Date, audience?: 'kids' | 'adult'): Promise<StudioReservationRetirement | null>
  acknowledge(reservationId: string, now: Date): Promise<void>
}

export interface StudioReservationCleanupGateway {
  cleanupReservation(payload: StudioReservationRetirement): Promise<boolean>
}
