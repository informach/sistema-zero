import type { CreatorMasteryJourneyFacts } from '@sistemazero/core/journey'
import { and, eq, inArray } from 'drizzle-orm'
import { masteryJourneyFacts } from '../../../application/creator-journey/mastery-journey-facts'
import type { MasteryOwner } from '../../../domain/ports/mastery-repository.port'
import type { Database } from './db'
import { masteryAwards, masteryReviews, masterySubmissions } from './schema'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

/** Read curriculum receipts in the caller's snapshot; never load project payloads for a gate. */
export async function readMasteryJourneyFacts(
  db: Database | Transaction,
  owners: readonly MasteryOwner[],
): Promise<Map<string, CreatorMasteryJourneyFacts>> {
  if (!owners.length) return new Map()
  const ids = owners.map((owner) => owner.userId)
  const audiences = [...new Set(owners.map((owner) => owner.audience))]
  const rows = await db
    .select({
      submission: {
        id: masterySubmissions.id,
        userId: masterySubmissions.userId,
        accountId: masterySubmissions.accountId,
        audience: masterySubmissions.audience,
        masteryId: masterySubmissions.masteryId,
        level: masterySubmissions.level,
        definition: masterySubmissions.definition,
        submittedAt: masterySubmissions.submittedAt,
      },
      review: masteryReviews,
    })
    .from(masterySubmissions)
    .leftJoin(masteryReviews, eq(masteryReviews.submissionId, masterySubmissions.id))
    .where(
      and(inArray(masterySubmissions.userId, ids), inArray(masterySubmissions.audience, audiences)),
    )
  const awards = await db
    .select()
    .from(masteryAwards)
    .where(and(inArray(masteryAwards.userId, ids), inArray(masteryAwards.audience, audiences)))
  return new Map(
    owners.map((owner) => {
      const submissions = rows.filter(
        (row) =>
          row.submission.userId === owner.userId && row.submission.audience === owner.audience,
      )
      const earned = awards.filter(
        (award) => award.userId === owner.userId && award.audience === owner.audience,
      )
      if (
        submissions.some((row) => row.submission.accountId !== owner.accountId) ||
        earned.some((award) => award.accountId !== owner.accountId)
      )
        throw new Error('Mastery receipt belongs to another account')
      return [
        owner.userId,
        masteryJourneyFacts({
          submissions: submissions.map((row) => row.submission),
          reviews: submissions.flatMap((row) => (row.review ? [row.review] : [])),
          awards: earned,
        }),
      ]
    }),
  )
}
