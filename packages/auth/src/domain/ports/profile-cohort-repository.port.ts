export const MAX_PROFILE_COHORT_PAGE = 200

/** A UUID work bound, not an MVCC snapshot or an admission/ownership authorization. */
export type ProfileCohortQuery =
  | { kind: 'start'; limit: number }
  | { kind: 'continue'; upperBound: string; cursor: string | null; limit: number }

export interface ProfileCohortOwner {
  profileId: string
  accountUserId: string
}

export interface ProfileCohortPage {
  upperBound: string | null
  cursor: string | null
  done: boolean
  owners: readonly ProfileCohortOwner[]
}

export interface ProfileCohortRepository {
  /** Includes archived/pending profiles and inactive accounts; never filter by XP or ready. */
  readPage(query: ProfileCohortQuery): Promise<ProfileCohortPage>
}
