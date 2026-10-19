import { randomUUID } from 'node:crypto'
import { and, asc, eq, isNull, lte, or, type SQL, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import type {
  ProfileAdmissionFailure,
  ProfileAdmissionJob,
  ProfileAdmissionRepository,
} from '../../../domain/ports/profile-admission-repository.port'
import type { Database } from './db'
import { profileAdmissions, profiles, users } from './schema'

// PostgreSQL FOR UPDATE OF accepts a relation alias, never a schema-qualified name.
const claimAdmissions = alias(profileAdmissions, 'admission_claim')

const JobSchema = z.strictObject({
  profileId: z.uuid(),
  accountUserId: z.uuid(),
  leaseId: z.uuid(),
  attempts: z.number().int().positive(),
})
const OwnerSchema = z.strictObject({ profileId: z.uuid(), accountUserId: z.uuid() })
const FailureSchema = z.enum(['MEMBERS_UNAVAILABLE', 'JOURNEY_NOT_READY'])
const DateSchema = z.date()

function capturedDate(input: Date): Date {
  return new Date(DateSchema.parse(input).getTime())
}

function claimDates(nowInput: Date, leaseInput: Date) {
  const now = capturedDate(nowInput)
  const leaseUntil = capturedDate(leaseInput)
  if (leaseUntil <= now) throw new Error('Admission lease must end after its claim')
  return { now, leaseUntil }
}

/** Only local Auth locks. No Members RPC or cross-database coordination occurs in this adapter. */
export class DrizzleProfileAdmissionRepository implements ProfileAdmissionRepository {
  constructor(private readonly db: Database) {}

  claimPending(nowInput: Date, leaseInput: Date, limitInput: number) {
    const { now, leaseUntil } = claimDates(nowInput, leaseInput)
    const limit = z.number().int().min(1).max(50).parse(limitInput)
    return this.claim(now, leaseUntil, limit)
  }

  async claimProfile(
    profileId: string,
    accountUserId: string,
    nowInput: Date,
    leaseInput: Date,
  ): Promise<ProfileAdmissionJob | null> {
    const owner = OwnerSchema.parse({ profileId, accountUserId })
    const { now, leaseUntil } = claimDates(nowInput, leaseInput)
    const [job] = await this.claim(
      now,
      leaseUntil,
      1,
      and(
        eq(claimAdmissions.profileId, owner.profileId),
        eq(claimAdmissions.accountUserId, owner.accountUserId),
      ),
    )
    return job ?? null
  }

  private claim(now: Date, leaseUntil: Date, limit: number, ownerFilter?: SQL) {
    return this.db.transaction(async (tx) => {
      const candidates = await tx
        .select({ profileId: claimAdmissions.profileId })
        .from(claimAdmissions)
        .innerJoin(profiles, eq(profiles.id, claimAdmissions.profileId))
        .innerJoin(users, eq(users.id, profiles.accountUserId))
        .where(
          and(
            eq(claimAdmissions.status, 'pending'),
            eq(profiles.status, 'active'),
            eq(profiles.admissionState, 'pending'),
            eq(users.status, 'active'),
            eq(claimAdmissions.accountUserId, profiles.accountUserId),
            lte(claimAdmissions.nextAttemptAt, now),
            or(isNull(claimAdmissions.leaseUntil), lte(claimAdmissions.leaseUntil, now)),
            ownerFilter,
          ),
        )
        .orderBy(asc(claimAdmissions.nextAttemptAt), asc(claimAdmissions.profileId))
        .limit(limit)
        .for('update', { of: claimAdmissions, skipLocked: true })
      const jobs: ProfileAdmissionJob[] = []
      for (const candidate of candidates) {
        const [claimed] = await tx
          .update(profileAdmissions)
          .set({
            leaseId: randomUUID(),
            leaseUntil,
            attempts: sql`${profileAdmissions.attempts} + 1`,
            updatedAt: now,
          })
          .where(eq(profileAdmissions.profileId, candidate.profileId))
          .returning({
            profileId: profileAdmissions.profileId,
            accountUserId: profileAdmissions.accountUserId,
            leaseId: profileAdmissions.leaseId,
            attempts: profileAdmissions.attempts,
          })
        jobs.push(JobSchema.parse(claimed))
      }
      return jobs
    })
  }

  async complete(jobInput: ProfileAdmissionJob, nowInput: Date) {
    const job = JobSchema.parse(jobInput)
    const now = capturedDate(nowInput)
    return this.db.transaction(async (tx): Promise<'ready' | 'cancelled' | 'lost'> => {
      // Same local order as create/prepareDeletion; the user row also excludes physical deletion.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`profile:${job.accountUserId}`}, 0))`,
      )
      const [account] = await tx
        .select({ status: users.status })
        .from(users)
        .where(eq(users.id, job.accountUserId))
        .for('update')
      const [profile] = await tx
        .select()
        .from(profiles)
        .where(eq(profiles.id, job.profileId))
        .for('update')
      const [current] = await tx
        .select()
        .from(profileAdmissions)
        .where(eq(profileAdmissions.profileId, job.profileId))
        .for('update')
      if (
        !profile ||
        !current ||
        profile.accountUserId !== job.accountUserId ||
        profile.admissionState !== 'pending' ||
        current.accountUserId !== job.accountUserId ||
        current.status !== 'pending' ||
        current.leaseId !== job.leaseId
      )
        return 'lost'
      const ready = account?.status === 'active' && profile.status === 'active'
      if (ready) {
        await tx
          .update(profiles)
          .set({ admissionState: 'ready', updatedAt: now })
          .where(eq(profiles.id, job.profileId))
      }
      await tx
        .update(profileAdmissions)
        .set({
          status: ready ? 'completed' : 'cancelled',
          completedAt: now,
          leaseId: null,
          leaseUntil: null,
          lastErrorCode: null,
          updatedAt: now,
        })
        .where(eq(profileAdmissions.profileId, job.profileId))
      return ready ? 'ready' : 'cancelled'
    })
  }

  async retry(
    jobInput: ProfileAdmissionJob,
    nowInput: Date,
    nextInput: Date,
    failureInput: ProfileAdmissionFailure,
  ): Promise<boolean> {
    const job = JobSchema.parse(jobInput)
    const now = capturedDate(nowInput)
    const nextAttemptAt = capturedDate(nextInput)
    const lastErrorCode = FailureSchema.parse(failureInput)
    if (nextAttemptAt < now) throw new Error('Admission retry cannot precede its failure')
    const rows = await this.db
      .update(profileAdmissions)
      .set({ nextAttemptAt, lastErrorCode, leaseId: null, leaseUntil: null, updatedAt: now })
      .where(
        and(
          eq(profileAdmissions.profileId, job.profileId),
          eq(profileAdmissions.accountUserId, job.accountUserId),
          eq(profileAdmissions.status, 'pending'),
          eq(profileAdmissions.leaseId, job.leaseId),
        ),
      )
      .returning({ id: profileAdmissions.profileId })
    return rows.length === 1
  }
}
