import type { Thread } from '../thread/thread'

export interface StudioReservationInput {
  id: string
  scopeKey: string
  idempotencyKey: string
  authorId: string
  accountId: string
  audience: 'kids' | 'adult'
  context: string
  semanticHash: string
  snapshotHash: string
  /** Only the Members-signed live snapshot supplies an ID. Other IDs are server allocated. */
  livePlayId?: string
  now: Date
}

export type StudioReservationOutcome =
  | { state: 'reserved'; reservationId: string; playId: string; snapshotHash: string }
  | { state: 'finalized'; thread: Thread; deduped: true }
  | { state: 'retired'; playId: string; thread: Thread | null }
