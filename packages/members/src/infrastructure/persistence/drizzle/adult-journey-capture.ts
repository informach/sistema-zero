import {
  type AdultCourseMilestone,
  type AdultCreatorCapability,
  type AdultJourneyPolicy,
  adultJourneyPosition,
  creatorJourneyOpenCourseIds,
  projectAdultJourney,
} from '@sistemazero/core/journey'
import { and, eq, inArray, type SQL, sql } from 'drizzle-orm'
import { listCreatorCourseGrants } from './creator-journey-course-grants'
import type { Database } from './db'
import { readMasteryJourneyFacts } from './mastery-journey-facts'
import {
  accountDeletionFences,
  adultJourneyGrants,
  adultJourneyReached,
  adultProfiles,
  courses,
  creatorJourneyCourseGrants,
  entitlements,
  masteryAwards,
  masteryReviews,
  masterySubmissions,
  xpEvents,
} from './schema'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

/**
 * Publication is rare and must freeze the outgoing policy for learners who never visited their
 * progress page. The caller holds these source-table fences and the policy row for update until
 * capture and CAS commit together. Pages bound memory, not the duration of the publication lock.
 *
 * Do not acquire per-account advisory locks here: ordinary awards hold account → XP, whereas this
 * publication fences XP before the policy. Taking account locks afterwards would deadlock. The
 * deletion-fence table is locked first instead; no deletion can cross capture or resurrect a user.
 */
export async function lockAdultJourneyCaptureSources(tx: Transaction): Promise<void> {
  await tx.execute(
    sql`lock table ${accountDeletionFences}, ${xpEvents}, ${courses}, ${entitlements}, ${adultProfiles}, ${masteryAwards}, ${masterySubmissions}, ${masteryReviews} in share mode`,
  )
}

/** The pure shared projector remains the only interpreter of either old or new requirements. */
export async function captureAdultJourneyBeforeChange(
  tx: Transaction,
  source: { policy: AdultJourneyPolicy; version: number },
  now: Date,
): Promise<void> {
  const catalog = await tx
    .select({
      id: courses.id,
      title: courses.title,
      audience: courses.audience,
      modality: courses.modality,
      status: courses.status,
    })
    .from(courses)
    .where(eq(courses.audience, 'adult'))
  const legacyOpenIds = catalog
    .filter((course) => course.modality === 'recorded' && course.status !== 'draft')
    .map((course) => course.id)
  let cursor: string | null = null
  for (;;) {
    const after: SQL = cursor ? sql`and cohort.user_id > ${cursor}::uuid` : sql``
    const owners: readonly { userId: string }[] = await tx.execute<{ userId: string }>(sql`
      select cohort.user_id as "userId" from (
        select ${xpEvents.userId} as user_id from ${xpEvents} where ${xpEvents.audience} = 'adult'
        union select ${adultJourneyGrants.userId} from ${adultJourneyGrants}
        union select ${adultJourneyReached.userId} from ${adultJourneyReached}
        union select ${adultProfiles.userId} from ${adultProfiles}
        union select ${creatorJourneyCourseGrants.userId} from ${creatorJourneyCourseGrants} where ${creatorJourneyCourseGrants.audience} = 'adult'
        union select ${masteryAwards.userId} from ${masteryAwards} where ${masteryAwards.audience} = 'adult'
        union select ${masterySubmissions.userId} from ${masterySubmissions} where ${masterySubmissions.audience} = 'adult'
        union select ${entitlements.userId} from ${entitlements}
          where ${entitlements.accessType} = 'all_courses' or (
            ${entitlements.accessType} = 'course' and ${entitlements.courseRef} in (
              select ${courses.slug} from ${courses} where ${courses.audience} = 'adult'
            )
          )
      ) cohort
      where not exists (select 1 from ${accountDeletionFences} where ${accountDeletionFences.accountId} = cohort.user_id)
      ${after}
      order by cohort.user_id limit 250
    `)
    if (!owners.length) return
    const ids: string[] = owners.map((owner) => owner.userId)
    const [events, grants, reached, retained, masteryFacts] = await Promise.all([
      tx
        .select({ userId: xpEvents.userId, courseId: xpEvents.sourceId, type: xpEvents.sourceType })
        .from(xpEvents)
        .where(
          and(
            inArray(xpEvents.userId, ids),
            eq(xpEvents.audience, 'adult'),
            inArray(xpEvents.sourceType, ['course_complete', 'course_showcased']),
          ),
        ),
      tx.select().from(adultJourneyGrants).where(inArray(adultJourneyGrants.userId, ids)),
      tx.select().from(adultJourneyReached).where(inArray(adultJourneyReached.userId, ids)),
      listCreatorCourseGrants(
        tx,
        ids.map((userId) => ({ userId, accountId: userId, audience: 'adult' })),
      ),
      readMasteryJourneyFacts(
        tx,
        ids.map((userId) => ({ userId, accountId: userId, audience: 'adult' as const })),
      ),
    ])
    const byUser = new Map<string, Map<string, AdultCourseMilestone>>()
    for (const event of events) {
      const milestones = byUser.get(event.userId) ?? new Map<string, AdultCourseMilestone>()
      const milestone = milestones.get(event.courseId) ?? {
        courseId: event.courseId,
        completed: false,
        showcased: false,
      }
      if (event.type === 'course_complete') milestone.completed = true
      if (event.type === 'course_showcased') milestone.showcased = true
      milestones.set(event.courseId, milestone)
      byUser.set(event.userId, milestones)
    }
    const capabilityRows: {
      userId: string
      capability: AdultCreatorCapability
      policyVersion: number
      grantedAt: Date
    }[] = []
    const floorRows: {
      userId: string
      position: number
      policyVersion: number
      reachedAt: Date
      updatedAt: Date
    }[] = []
    const courseRows: {
      userId: string
      accountId: string
      audience: 'adult'
      courseId: string
      policyVersion: number
      grantedAt: Date
    }[] = []
    for (const userId of ids) {
      const view = projectAdultJourney(
        source.policy,
        source.version,
        [...(byUser.get(userId)?.values() ?? [])],
        grants.filter((grant) => grant.userId === userId).map((grant) => grant.capability),
        reached.find((row) => row.userId === userId)?.position ?? null,
        {
          catalog,
          retainedCourseIds: retained.get(userId) ?? [],
          ...masteryFacts.get(userId),
        },
      )
      // The legacy adult Molda exposed every band. Preserve that actual right when activating
      // the new curriculum; newly earned basic Molda under curriculum never implies the other bands.
      const capabilities: readonly AdultCreatorCapability[] =
        !source.policy.curriculum && view.capabilities.includes('molda')
          ? [
              ...new Set<AdultCreatorCapability>([
                ...view.capabilities,
                'molda-intermediate',
                'molda-professional',
              ]),
            ]
          : view.capabilities
      for (const capability of capabilities)
        capabilityRows.push({ userId, capability, policyVersion: source.version, grantedAt: now })
      const position = adultJourneyPosition(view)?.position
      if (position)
        floorRows.push({
          userId,
          position,
          policyVersion: source.version,
          reachedAt: now,
          updatedAt: now,
        })
      const courseIds =
        source.policy.curriculum && view.curriculum
          ? creatorJourneyOpenCourseIds(source.policy.curriculum, view.curriculum)
          : [...new Set([...(retained.get(userId) ?? []), ...legacyOpenIds])]
      for (const courseId of courseIds)
        courseRows.push({
          userId,
          accountId: userId,
          audience: 'adult',
          courseId,
          policyVersion: source.version,
          grantedAt: now,
        })
    }
    if (capabilityRows.length)
      await tx.insert(adultJourneyGrants).values(capabilityRows).onConflictDoNothing()
    if (floorRows.length)
      await tx
        .insert(adultJourneyReached)
        .values(floorRows)
        .onConflictDoUpdate({
          target: adultJourneyReached.userId,
          set: {
            position: sql`greatest(${adultJourneyReached.position}, excluded.position)`,
            policyVersion: sql`case when excluded.position > ${adultJourneyReached.position} then excluded.policy_version else ${adultJourneyReached.policyVersion} end`,
            reachedAt: sql`case when excluded.position > ${adultJourneyReached.position} then excluded.reached_at else ${adultJourneyReached.reachedAt} end`,
            updatedAt: now,
          },
        })
    for (let offset = 0; offset < courseRows.length; offset += 1000)
      await tx
        .insert(creatorJourneyCourseGrants)
        .values(courseRows.slice(offset, offset + 1000))
        .onConflictDoNothing()
    cursor = ids[ids.length - 1]!
  }
}
