import { and, eq, isNull, or } from 'drizzle-orm'
import type { LiveBenefitsPort } from '../../../domain/ports/live-benefits.port'
import type { Database } from './db'
import { courses, liveAccessGrants, liveCohorts, liveEnrollments } from './schema'

export class DrizzleLiveBenefitsRepository implements LiveBenefitsPort {
  constructor(private readonly db: Database) {}
  private async seats(accountId: string, learnerId?: string) {
    return this.db
      .select({
        id: liveEnrollments.id,
        learnerId: liveEnrollments.learnerId,
        startsAt: liveAccessGrants.startsAt,
        endsAt: liveAccessGrants.endsAt,
      })
      .from(liveEnrollments)
      .innerJoin(liveCohorts, eq(liveCohorts.id, liveEnrollments.cohortId))
      .leftJoin(courses, eq(courses.id, liveCohorts.courseId))
      .innerJoin(liveAccessGrants, eq(liveAccessGrants.enrollmentId, liveEnrollments.id))
      .where(
        and(
          eq(liveEnrollments.accountId, accountId),
          eq(liveEnrollments.status, 'active'),
          or(isNull(liveCohorts.courseId), eq(courses.audience, 'kids')),
          isNull(liveAccessGrants.revokedAt),
          learnerId ? eq(liveEnrollments.learnerId, learnerId) : undefined,
        ),
      )
  }
  async maxProfiles(accountId: string, now: Date) {
    const rows = (await this.seats(accountId)).filter((row) => row.endsAt > now)
    // Assigned siblings count once across workshops; each unassigned paid/manual seat
    // can onboard a child. Consuming that seat replaces, rather than adds, its allowance.
    return new Set(rows.map((row) => row.learnerId ?? `pending:${row.id}`)).size
  }
  async hasMural(accountId: string, learnerId: string, now: Date) {
    const enrollments = new Map<string, { start: number; end: number }>()
    for (const row of await this.seats(accountId, learnerId)) {
      const previous = enrollments.get(row.id)
      enrollments.set(row.id, {
        start: Math.min(previous?.start ?? Infinity, row.startsAt.getTime()),
        end: Math.max(previous?.end ?? -Infinity, row.endsAt.getTime()),
      })
    }
    return [...enrollments.values()].some(
      (interval) => now.getTime() >= interval.start && now.getTime() < interval.end,
    )
  }
}
