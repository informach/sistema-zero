import { and, eq, inArray } from 'drizzle-orm'
import type { Database } from './db'
import { creatorJourneyCourseGrants } from './schema'

type Owner = { userId: string; accountId: string; audience: 'kids' | 'adult' }
export async function listCreatorCourseGrants(
  db: Pick<Database, 'select'>,
  owners: readonly Owner[],
): Promise<Map<string, string[]>> {
  if (!owners.length) return new Map()
  const audience = owners[0]!.audience
  if (owners.some((owner) => owner.audience !== audience))
    throw new Error('Read one audience per snapshot.')
  const rows = await db
    .select()
    .from(creatorJourneyCourseGrants)
    .where(
      and(
        inArray(
          creatorJourneyCourseGrants.userId,
          owners.map((owner) => owner.userId),
        ),
        eq(creatorJourneyCourseGrants.audience, audience),
      ),
    )
  const expected = new Map(owners.map((owner) => [owner.userId, owner.accountId]))
  const byUser = new Map<string, string[]>()
  for (const row of rows) {
    if (expected.get(row.userId) !== row.accountId)
      throw new Error('Course grant belongs to another account.')
    const ids = byUser.get(row.userId) ?? []
    ids.push(row.courseId)
    byUser.set(row.userId, ids)
  }
  return byUser
}

/** Caller holds owner/deletion and the exact source policy fence in the same transaction. */
export async function saveCreatorCourseGrants(
  tx: Pick<Database, 'insert'>,
  owner: Owner,
  policyVersion: number,
  courseIds: readonly string[],
): Promise<void> {
  if (!courseIds.length) return
  await tx
    .insert(creatorJourneyCourseGrants)
    .values(
      [...new Set(courseIds)].map((courseId) => ({
        ...owner,
        courseId,
        policyVersion,
        grantedAt: new Date(),
      })),
    )
    .onConflictDoNothing()
}
