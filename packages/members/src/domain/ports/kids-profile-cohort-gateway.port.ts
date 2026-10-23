import type { KidsJourneyOwner } from './kids-journey-repository.port'

export type KidsProfileCohortQuery =
  | { kind: 'start'; limit: number }
  | { kind: 'continue'; upperBound: string; cursor: string | null; limit: number }

export interface KidsProfileCohortPage {
  upperBound: string | null
  cursor: string | null
  done: boolean
  owners: readonly KidsJourneyOwner[]
}

export interface KidsProfileCohortGateway {
  /** Auth-authoritative ALL profiles. Absence/failure must throw, never return an empty cohort. */
  readPage(query: KidsProfileCohortQuery): Promise<KidsProfileCohortPage>
}
