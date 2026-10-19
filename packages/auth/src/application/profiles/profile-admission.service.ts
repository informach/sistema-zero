import type { Logger } from '@sistemazero/core/logging'
import type {
  ProfileAdmissionFailure,
  ProfileAdmissionJob,
  ProfileAdmissionRepository,
} from '../../domain/ports/profile-admission-repository.port'
import type { ProfileJourneyGateway } from '../../domain/ports/profile-journey-gateway.port'

const LEASE_MS = 30_000
const MAX_JOBS_PER_CYCLE = 20

/** No DB transaction crosses the Members call. Every failure keeps the same durable profile/job. */
export class ProfileAdmissionService {
  constructor(
    private readonly admissions: ProfileAdmissionRepository,
    private readonly journey: ProfileJourneyGateway,
    private readonly clock: () => Date,
    private readonly logger: Logger,
  ) {}

  async tryProfile(profileId: string, accountUserId: string): Promise<void> {
    const now = this.clock()
    let job: ProfileAdmissionJob | null
    try {
      job = await this.admissions.claimProfile(
        profileId,
        accountUserId,
        now,
        new Date(now.getTime() + LEASE_MS),
      )
    } catch {
      this.logger.error('profile.admission.claim_failed', { profileId })
      return
    }
    if (job) await this.process(job)
  }

  async runCycle(shouldContinue: () => boolean = () => true): Promise<number> {
    let processed = 0
    while (processed < MAX_JOBS_PER_CYCLE && shouldContinue()) {
      const now = this.clock()
      // Claim one at a time: a slow remote call cannot let a backlog of owned leases expire.
      const [job] = await this.admissions.claimPending(now, new Date(now.getTime() + LEASE_MS), 1)
      if (!job) break
      await this.process(job)
      processed++
    }
    return processed
  }

  private async process(input: ProfileAdmissionJob): Promise<void> {
    const job = { ...input }
    try {
      const result = await this.journey.initialize({
        profileId: job.profileId,
        accountUserId: job.accountUserId,
      })
      if (result === 'not_ready') {
        await this.reschedule(job, 'JOURNEY_NOT_READY')
        return
      }
      await this.admissions.complete(job, this.clock())
    } catch {
      await this.reschedule(job, 'MEMBERS_UNAVAILABLE')
    }
  }

  private async reschedule(job: ProfileAdmissionJob, failure: ProfileAdmissionFailure) {
    const now = this.clock()
    const delay = Math.min(60_000, 1_000 * 2 ** Math.min(6, Math.max(0, job.attempts - 1)))
    try {
      await this.admissions.retry(job, now, new Date(now.getTime() + delay), failure)
    } catch {
      // The lease remains durable and expires; never delete/recreate the child after a DB failure.
      this.logger.error('profile.admission.retry_failed', { profileId: job.profileId, failure })
      return
    }
    this.logger.warn('profile.admission.pending', { profileId: job.profileId, failure })
  }
}
