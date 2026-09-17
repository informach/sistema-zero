import { and, asc, eq, gt, inArray, isNull, sql } from 'drizzle-orm'
import {
  CHALLENGE_BEHAVIOR_MESSAGE_KINDS,
  type ChallengeBehaviorMessageKind,
  type ChallengeLifecycleCandidate,
  type ChallengeLifecycleRepository,
} from '../../../domain/ports/challenge-lifecycle-repository.port'
import type { Database } from './db'
import {
  courses,
  entitlementLifecycleMessagesSent,
  entitlements,
  learningAttempts,
  lessonBlockProgress,
  lessonCompletions,
  lessonNavigation,
  lessonProgress,
  lessonSectionProgress,
  lessons,
  modules,
  studioSubmissions,
} from './schema'

const CHALLENGE_COURSE_REF = 'desafio-primeiro-jogo'

type OwnerRow = { userId: string; accountId: string }

/**
 * Read-model do ciclo comportamental. A relação perfil→conta é a UNIÃO apenas
 * de colunas `account_id` autoritativas do Members; `lesson_progress` e
 * `lesson_completions` só entram depois que essa posse foi provada.
 */
export class DrizzleChallengeLifecycleRepository implements ChallengeLifecycleRepository {
  constructor(private readonly db: Database) {}

  async listCandidates(now: Date, limit: number): Promise<ChallengeLifecycleCandidate[]> {
    const rows = await this.db
      .select({
        entitlementId: entitlements.id,
        accountId: entitlements.userId,
        grantedAt: entitlements.grantedAt,
        expiresAt: entitlements.expiresAt,
        courseRef: entitlements.courseRef,
      })
      .from(entitlements)
      .where(
        and(
          eq(entitlements.status, 'active'),
          eq(entitlements.sourceKind, 'payment'),
          isNull(entitlements.subscriptionId),
          eq(entitlements.accessType, 'course'),
          eq(entitlements.courseRef, CHALLENGE_COURSE_REF),
          sql`${entitlements.snapshot} -> 'accessPolicy' ->> 'mode' = 'fixed'`,
          sql`${entitlements.snapshot} -> 'accessPolicy' ->> 'durationUnit' = 'days'`,
          gt(entitlements.expiresAt, now),
          sql`not exists (
            select 1
              from members.entitlements stronger
             where stronger.id <> ${entitlements.id}
               and stronger.user_id = ${entitlements.userId}
               and stronger.status = 'active'
               and (stronger.expires_at is null or stronger.expires_at > ${now.toISOString()}::timestamptz)
               and (
                 (stronger.access_type = 'course' and stronger.course_ref = ${entitlements.courseRef})
                 or stronger.access_type = 'all_kids_courses'
               )
               and (
                 stronger.expires_at is null
                 or stronger.expires_at > ${entitlements.expiresAt}
                 or (
                   stronger.expires_at = ${entitlements.expiresAt}
                   and (
                     stronger.source_kind = 'subscription'
                     or stronger.access_type = 'all_kids_courses'
                     or stronger.id < ${entitlements.id}
                   )
                 )
               )
          )`,
        ),
      )
      .orderBy(asc(entitlements.expiresAt), asc(entitlements.id))
      .limit(limit)

    const candidates = rows.filter(
      (row): row is typeof row & { grantedAt: Date; expiresAt: Date; courseRef: string } =>
        row.grantedAt != null && row.expiresAt != null && row.courseRef != null,
    )
    if (candidates.length === 0) return []

    const [course] = await this.db
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.slug, CHALLENGE_COURSE_REF), eq(courses.audience, 'kids')))
      .limit(1)
    if (!course) return []

    const lessonRows = await this.db
      .select({ id: lessons.id })
      .from(lessons)
      .innerJoin(modules, eq(modules.id, lessons.moduleId))
      .where(and(eq(lessons.courseId, course.id), eq(lessons.isPublished, true)))
      .orderBy(asc(modules.sortOrder), asc(lessons.sortOrder), asc(lessons.id))
    const lessonIds = lessonRows.map((lesson) => lesson.id)
    if (lessonIds.length === 0) return []

    const accountIds = [...new Set(candidates.map((candidate) => candidate.accountId))]
    const [ownerRows, navigationRows, sectionRows, blockRows, attemptRows, submissionRows] =
      await Promise.all([
        loadOwnerClaims(this.db, accountIds),
        this.db
          .select({ userId: lessonNavigation.userId, accountId: lessonNavigation.accountId })
          .from(lessonNavigation)
          .where(
            and(
              inArray(lessonNavigation.accountId, accountIds),
              inArray(lessonNavigation.lessonId, lessonIds),
            ),
          ),
        this.db
          .select({
            userId: lessonSectionProgress.userId,
            accountId: lessonSectionProgress.accountId,
          })
          .from(lessonSectionProgress)
          .where(
            and(
              inArray(lessonSectionProgress.accountId, accountIds),
              inArray(lessonSectionProgress.lessonId, lessonIds),
            ),
          ),
        this.db
          .select({ userId: lessonBlockProgress.userId, accountId: lessonBlockProgress.accountId })
          .from(lessonBlockProgress)
          .where(
            and(
              inArray(lessonBlockProgress.accountId, accountIds),
              inArray(lessonBlockProgress.lessonId, lessonIds),
            ),
          ),
        this.db
          .select({ userId: learningAttempts.userId, accountId: learningAttempts.accountId })
          .from(learningAttempts)
          .where(
            and(
              inArray(learningAttempts.accountId, accountIds),
              inArray(learningAttempts.lessonId, lessonIds),
            ),
          ),
        this.db
          .select({ userId: studioSubmissions.userId, accountId: studioSubmissions.accountId })
          .from(studioSubmissions)
          .where(
            and(
              inArray(studioSubmissions.accountId, accountIds),
              eq(studioSubmissions.courseId, course.id),
            ),
          ),
      ])

    const ownerClaims = new Map<string, Set<string>>()
    const claim = (row: OwnerRow) => {
      const claims = ownerClaims.get(row.userId) ?? new Set<string>()
      claims.add(row.accountId)
      ownerClaims.set(row.userId, claims)
    }
    for (const accountId of accountIds) claim({ userId: accountId, accountId })
    for (const row of ownerRows) claim(row)

    // Uma identidade ligada a duas contas é ambígua e fica de fora. Nunca
    // escolhemos “a mais recente” nem inferimos pelo e-mail.
    const accountByProfile = new Map<string, string>()
    for (const [profileId, claims] of ownerClaims) {
      if (claims.size === 1) accountByProfile.set(profileId, [...claims][0]!)
    }
    const safeProfileIds = [...accountByProfile.keys()]

    const [progressRows, completionRows, sentRows] = await Promise.all([
      this.db
        .select({ userId: lessonProgress.userId })
        .from(lessonProgress)
        .where(
          and(
            inArray(lessonProgress.userId, safeProfileIds),
            eq(lessonProgress.courseId, course.id),
          ),
        ),
      this.db
        .select({ userId: lessonCompletions.userId, lessonId: lessonCompletions.lessonId })
        .from(lessonCompletions)
        .where(
          and(
            inArray(lessonCompletions.userId, safeProfileIds),
            inArray(lessonCompletions.lessonId, lessonIds),
          ),
        ),
      this.db
        .select({
          entitlementId: entitlementLifecycleMessagesSent.entitlementId,
          expiresOn: entitlementLifecycleMessagesSent.expiresOn,
          messageKind: entitlementLifecycleMessagesSent.messageKind,
        })
        .from(entitlementLifecycleMessagesSent)
        .where(
          inArray(
            entitlementLifecycleMessagesSent.entitlementId,
            candidates.map((candidate) => candidate.entitlementId),
          ),
        ),
    ])

    const startedAccounts = new Set<string>()
    const directActivity = [
      ...navigationRows,
      ...sectionRows,
      ...blockRows,
      ...attemptRows,
      ...submissionRows.filter((row): row is OwnerRow => row.accountId != null),
    ]
    for (const row of directActivity) {
      if (accountByProfile.get(row.userId) === row.accountId) startedAccounts.add(row.accountId)
    }
    for (const row of progressRows) {
      const accountId = accountByProfile.get(row.userId)
      if (accountId) startedAccounts.add(accountId)
    }

    const completionsByProfile = new Map<string, Set<string>>()
    for (const row of completionRows) {
      const accountId = accountByProfile.get(row.userId)
      if (!accountId) continue
      startedAccounts.add(accountId)
      const completed = completionsByProfile.get(row.userId) ?? new Set<string>()
      completed.add(row.lessonId)
      completionsByProfile.set(row.userId, completed)
    }

    const firstLessonId = lessonIds[0]!
    const dayOneAccounts = new Set<string>()
    const completedAccounts = new Set<string>()
    for (const [profileId, completedLessons] of completionsByProfile) {
      const accountId = accountByProfile.get(profileId)
      if (!accountId) continue
      if (completedLessons.has(firstLessonId)) dayOneAccounts.add(accountId)
      if (lessonIds.every((lessonId) => completedLessons.has(lessonId))) {
        completedAccounts.add(accountId)
      }
    }

    const sentByEntitlement = new Map<string, ChallengeBehaviorMessageKind[]>()
    const candidateById = new Map(
      candidates.map((candidate) => [candidate.entitlementId, candidate] as const),
    )
    for (const row of sentRows) {
      if (!isBehaviorKind(row.messageKind)) continue
      const candidate = candidateById.get(row.entitlementId)
      if (!candidate || row.expiresOn !== candidate.expiresAt.toISOString().slice(0, 10)) continue
      const kinds = sentByEntitlement.get(row.entitlementId) ?? []
      kinds.push(row.messageKind)
      sentByEntitlement.set(row.entitlementId, kinds)
    }

    return candidates.map((candidate) => ({
      ...candidate,
      started: startedAccounts.has(candidate.accountId),
      dayOneComplete: dayOneAccounts.has(candidate.accountId),
      completed: completedAccounts.has(candidate.accountId),
      sentKinds: sentByEntitlement.get(candidate.entitlementId) ?? [],
    }))
  }

  async markMessageSent(
    entitlementId: string,
    expiresOn: string,
    messageKind: ChallengeBehaviorMessageKind,
    now: Date,
  ): Promise<void> {
    await this.db
      .insert(entitlementLifecycleMessagesSent)
      .values({ entitlementId, expiresOn, messageKind, sentAt: now })
      .onConflictDoNothing()
  }
}

/**
 * Descobre os perfis ligados às contas candidatas e, em uma segunda consulta,
 * carrega TODAS as alegações de posse desses perfis. Filtrar a segunda etapa
 * pelas contas candidatas esconderia justamente uma relação conflitante.
 */
async function loadOwnerClaims(db: Database, accountIds: string[]): Promise<OwnerRow[]> {
  const discovered = await db.execute<{ userId: string }>(sql`
    select user_id as "userId" from members.gamification_profiles
      where account_id = any(${accountIds}::uuid[])
    union
    select user_id as "userId" from members.profile_preferences
      where account_id = any(${accountIds}::uuid[])
    union
    select user_id as "userId" from members.lesson_navigation
      where account_id = any(${accountIds}::uuid[])
    union
    select user_id as "userId" from members.lesson_section_progress
      where account_id = any(${accountIds}::uuid[])
    union
    select user_id as "userId" from members.lesson_block_progress
      where account_id = any(${accountIds}::uuid[])
    union
    select user_id as "userId" from members.learning_attempts
      where account_id = any(${accountIds}::uuid[])
    union
    select user_id as "userId" from members.studio_submissions
      where account_id = any(${accountIds}::uuid[])
  `)
  if (discovered.length === 0) return []

  const profileIds = discovered.map(({ userId }) => userId)
  return db.execute<OwnerRow>(sql`
    select user_id as "userId", account_id as "accountId" from members.gamification_profiles
      where user_id = any(${profileIds}::uuid[])
    union
    select user_id as "userId", account_id as "accountId" from members.profile_preferences
      where user_id = any(${profileIds}::uuid[])
    union
    select user_id as "userId", account_id as "accountId" from members.lesson_navigation
      where user_id = any(${profileIds}::uuid[])
    union
    select user_id as "userId", account_id as "accountId" from members.lesson_section_progress
      where user_id = any(${profileIds}::uuid[])
    union
    select user_id as "userId", account_id as "accountId" from members.lesson_block_progress
      where user_id = any(${profileIds}::uuid[])
    union
    select user_id as "userId", account_id as "accountId" from members.learning_attempts
      where user_id = any(${profileIds}::uuid[])
    union
    select user_id as "userId", account_id as "accountId" from members.studio_submissions
      where user_id = any(${profileIds}::uuid[]) and account_id is not null
  `)
}

function isBehaviorKind(value: string): value is ChallengeBehaviorMessageKind {
  return (CHALLENGE_BEHAVIOR_MESSAGE_KINDS as readonly string[]).includes(value)
}
