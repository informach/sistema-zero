/** A leased, durable creation job. A lease never authorizes a session by itself. */
export interface ProfileAdmissionJob {
  profileId: string
  accountUserId: string
  leaseId: string
  attempts: number
}

export type ProfileAdmissionFailure = 'MEMBERS_UNAVAILABLE' | 'JOURNEY_NOT_READY'

export interface ProfileAdmissionRepository {
  /** Bounded claim, committed before any call to Members. Expired leases may be replayed. */
  claimPending(now: Date, leaseUntil: Date, limit: number): Promise<readonly ProfileAdmissionJob[]>
  claimProfile(
    profileId: string,
    accountUserId: string,
    now: Date,
    leaseUntil: Date,
  ): Promise<ProfileAdmissionJob | null>
  /** Local account/profile locks + fresh ownership/status check; a late ACK cannot revive a profile. */
  complete(job: ProfileAdmissionJob, now: Date): Promise<'ready' | 'cancelled' | 'lost'>
  /** Only the current lease can reschedule; errors contain no request/child data. */
  retry(
    job: ProfileAdmissionJob,
    now: Date,
    nextAttemptAt: Date,
    failure: ProfileAdmissionFailure,
  ): Promise<boolean>
}
