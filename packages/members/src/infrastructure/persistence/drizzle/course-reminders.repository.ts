import { and, asc, desc, eq, inArray, isNull, notInArray, or, sql } from 'drizzle-orm'
import { CHALLENGE_COURSE_REFS } from '../../../domain/entitlement/challenge-courses'
import {
  COURSE_REMINDER_KINDS,
  type CourseReminderCandidate,
  type CourseReminderCursor,
  type CourseReminderKind,
  type CourseRemindersRepository,
} from '../../../domain/ports/course-reminders-repository.port'
import type { CourseStartsReader } from '../../../domain/ports/course-starts.port'
import { loadOwnerClaims } from './challenge-lifecycle.repository'
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

type OwnerRow = { userId: string; accountId: string }

type Base = {
  entitlementId: string
  accountId: string
  grantedAt: Date
  courseRef: string
}

/**
 * Progresso de um curso por CONTA (25/11/2026), a régua dos lembretes do curso e do "começaram o
 * curso do presente" do Admin. A posse perfil→conta é a do Desafio (`loadOwnerClaims`: só colunas
 * `account_id` autoritativas; perfil ligado a duas contas fica de fora) e a própria conta também
 * conta (o guia dos pais: o responsável estuda). `null` = o curso não existe.
 */
export interface CourseAccountProgress {
  course: { id: string; title: string; audience: string; learner: string }
  started: Set<string>
  lastActivity: Map<string, Date>
  completedAt: Map<string, Date>
  /** Aulas publicadas do curso. */
  lessonCount: number
}

export async function loadCourseAccountProgress(
  db: Database,
  courseRef: string,
  accountIds: string[],
): Promise<CourseAccountProgress | null> {
  const [course] = await db
    .select({
      id: courses.id,
      title: courses.title,
      audience: courses.audience,
      learner: courses.learner,
    })
    .from(courses)
    .where(eq(courses.slug, courseRef))
    .limit(1)
  if (!course) return null
  const lessonRows = await db
    .select({ id: lessons.id })
    .from(lessons)
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .where(
      and(
        eq(lessons.courseId, course.id),
        eq(lessons.isPublished, true),
        isNull(lessons.archivedAt),
        isNull(modules.archivedAt),
      ),
    )
    .orderBy(asc(modules.sortOrder), asc(lessons.sortOrder), asc(lessons.id))
  const lessonIds = lessonRows.map((lesson) => lesson.id)
  if (lessonIds.length === 0)
    return {
      course,
      started: new Set(),
      lastActivity: new Map(),
      completedAt: new Map(),
      lessonCount: 0,
    }

  const [ownerRows, navigationRows, sectionRows, blockRows, attemptRows, submissionRows] =
    await Promise.all([
      loadOwnerClaims(db, accountIds),
      db
        .select({
          userId: lessonNavigation.userId,
          accountId: lessonNavigation.accountId,
          at: lessonNavigation.updatedAt,
        })
        .from(lessonNavigation)
        .where(
          and(
            inArray(lessonNavigation.accountId, accountIds),
            inArray(lessonNavigation.lessonId, lessonIds),
          ),
        ),
      db
        .select({
          userId: lessonSectionProgress.userId,
          accountId: lessonSectionProgress.accountId,
          at: lessonSectionProgress.completedAt,
        })
        .from(lessonSectionProgress)
        .where(
          and(
            inArray(lessonSectionProgress.accountId, accountIds),
            inArray(lessonSectionProgress.lessonId, lessonIds),
          ),
        ),
      db
        .select({
          userId: lessonBlockProgress.userId,
          accountId: lessonBlockProgress.accountId,
          at: lessonBlockProgress.updatedAt,
        })
        .from(lessonBlockProgress)
        .where(
          and(
            inArray(lessonBlockProgress.accountId, accountIds),
            inArray(lessonBlockProgress.lessonId, lessonIds),
          ),
        ),
      db
        .select({
          userId: learningAttempts.userId,
          accountId: learningAttempts.accountId,
          at: learningAttempts.createdAt,
        })
        .from(learningAttempts)
        .where(
          and(
            inArray(learningAttempts.accountId, accountIds),
            inArray(learningAttempts.lessonId, lessonIds),
          ),
        ),
      db
        .select({
          userId: studioSubmissions.userId,
          accountId: studioSubmissions.accountId,
          at: studioSubmissions.submittedAt,
        })
        .from(studioSubmissions)
        .where(
          and(
            inArray(studioSubmissions.accountId, accountIds),
            eq(studioSubmissions.courseId, course.id),
            inArray(studioSubmissions.lessonId, lessonIds),
          ),
        ),
    ])

  // Posse perfil→conta (a mesma régua do Desafio) + a própria conta.
  const claims = new Map<string, Set<string>>()
  const claim = (row: OwnerRow) => {
    const set = claims.get(row.userId) ?? new Set<string>()
    set.add(row.accountId)
    claims.set(row.userId, set)
  }
  for (const accountId of accountIds) claim({ userId: accountId, accountId })
  for (const row of ownerRows) claim(row)
  const accountByProfile = new Map<string, string>()
  for (const [profileId, set] of claims)
    if (set.size === 1) accountByProfile.set(profileId, [...set][0]!)
  const safeProfileIds = [...accountByProfile.keys()]

  const [progressRows, completionRows] = await Promise.all([
    db
      .select({ userId: lessonProgress.userId, at: lessonProgress.updatedAt })
      .from(lessonProgress)
      .where(
        and(
          inArray(lessonProgress.userId, safeProfileIds),
          eq(lessonProgress.courseId, course.id),
          inArray(lessonProgress.lessonId, lessonIds),
        ),
      ),
    db
      .select({
        userId: lessonCompletions.userId,
        lessonId: lessonCompletions.lessonId,
        at: lessonCompletions.completedAt,
      })
      .from(lessonCompletions)
      .where(
        and(
          inArray(lessonCompletions.userId, safeProfileIds),
          inArray(lessonCompletions.lessonId, lessonIds),
        ),
      ),
  ])

  const started = new Set<string>()
  const lastActivity = new Map<string, Date>()
  const touch = (accountId: string, at: Date | null) => {
    started.add(accountId)
    if (!at) return
    const current = lastActivity.get(accountId)
    if (!current || at > current) lastActivity.set(accountId, at)
  }
  for (const row of [
    ...navigationRows,
    ...sectionRows,
    ...blockRows,
    ...attemptRows,
    ...submissionRows,
  ]) {
    if (row.accountId && accountByProfile.get(row.userId) === row.accountId)
      touch(row.accountId, row.at)
  }
  for (const row of progressRows) {
    const accountId = accountByProfile.get(row.userId)
    if (accountId) touch(accountId, row.at)
  }

  // Concluiu: algum perfil da conta terminou TODAS as aulas publicadas; a data é a da última.
  const byProfile = new Map<string, Map<string, Date>>()
  for (const row of completionRows) {
    const accountId = accountByProfile.get(row.userId)
    if (!accountId) continue
    touch(accountId, row.at)
    const done = byProfile.get(row.userId) ?? new Map<string, Date>()
    done.set(row.lessonId, row.at)
    byProfile.set(row.userId, done)
  }
  const completedAt = new Map<string, Date>()
  for (const [profileId, done] of byProfile) {
    if (!lessonIds.every((id) => done.has(id))) continue
    const accountId = accountByProfile.get(profileId)!
    const last = new Date(Math.max(...lessonIds.map((id) => done.get(id)!.getTime())))
    const current = completedAt.get(accountId)
    if (!current || last < current) completedAt.set(accountId, last)
  }

  return { course, started, lastActivity, completedAt, lessonCount: lessonIds.length }
}

/**
 * Read-model dos lembretes do curso (25/11/2026). A posse perfil→conta é a mesma do ciclo do
 * Desafio (`loadOwnerClaims`: só colunas `account_id` autoritativas; perfil ligado a duas contas
 * fica de fora); a própria conta também conta, para o guia dos pais (o responsável estuda).
 */
const grantedAtMs = sql`date_trunc('milliseconds', ${entitlements.grantedAt})`

export class DrizzleCourseRemindersRepository implements CourseRemindersRepository {
  constructor(private readonly db: Database) {}

  async listCandidates(
    now: Date,
    limit: number,
    after?: CourseReminderCursor | null,
  ): Promise<{ candidates: CourseReminderCandidate[]; next: CourseReminderCursor | null }> {
    const rows = await this.db
      .select({
        entitlementId: entitlements.id,
        accountId: entitlements.userId,
        grantedAt: entitlements.grantedAt,
        courseRef: entitlements.courseRef,
      })
      .from(entitlements)
      .where(
        and(
          eq(entitlements.status, 'active'),
          eq(entitlements.accessType, 'course'),
          isNull(entitlements.subscriptionId),
          notInArray(entitlements.courseRef, CHALLENGE_COURSE_REFS),
          sql`(${entitlements.expiresAt} is null or ${entitlements.expiresAt} > ${now.toISOString()}::timestamptz)`,
          // Compra única ou presente (resgate `scholarship:`); cortesia do admin fica de fora.
          sql`(${entitlements.sourceKind} = 'payment' or (${entitlements.sourceKind} = 'manual' and ${entitlements.sourceId} like 'scholarship:%'))`,
          // A conclusão é o último lembrete: a conta que já o recebeu deste curso, por QUALQUER
          // matrícula dele, não ocupa vaga do lote.
          sql`not exists (
            select 1
              from members.entitlement_lifecycle_messages_sent sent
              join members.entitlements other on other.id = sent.entitlement_id
             where other.user_id = ${entitlements.userId}
               and other.course_ref = ${entitlements.courseRef}
               and sent.message_kind = 'course_completed'
          )`,
          // Página seguinte (keyset na mesma ordem do `orderBy`). ⚠️ O cursor volta como Date do
          // JS (milissegundos) e o Postgres guarda microssegundos: comparar com `granted_at` cru
          // PULAVA as matrículas do mesmo milissegundo da fronteira. Ordem e comparação usam o
          // instante truncado ao milissegundo.
          after
            ? or(
                sql`${grantedAtMs} < ${after.grantedAt.toISOString()}::timestamptz`,
                and(
                  sql`${grantedAtMs} = ${after.grantedAt.toISOString()}::timestamptz`,
                  sql`${entitlements.id} < ${after.entitlementId}::uuid`,
                ),
              )
            : undefined,
        ),
      )
      .orderBy(desc(grantedAtMs), desc(entitlements.id))
      .limit(limit)
    const last = rows.at(-1)
    const next =
      rows.length === limit && last?.grantedAt
        ? { grantedAt: last.grantedAt, entitlementId: last.entitlementId }
        : null
    const candidates = rows.filter(
      (row): row is Base => row.courseRef !== null && row.grantedAt !== null,
    )
    if (candidates.length === 0) return { candidates: [], next }

    // O que a CONTA já recebeu de cada curso, por qualquer matrícula dele (ativa ou não).
    const accountIds = [...new Set(candidates.map((c) => c.accountId))]
    const courseRefs = [...new Set(candidates.map((c) => c.courseRef))]
    const sentRows = await this.db
      .select({
        accountId: entitlements.userId,
        courseRef: entitlements.courseRef,
        messageKind: entitlementLifecycleMessagesSent.messageKind,
      })
      .from(entitlementLifecycleMessagesSent)
      .innerJoin(entitlements, eq(entitlements.id, entitlementLifecycleMessagesSent.entitlementId))
      .where(
        and(
          inArray(entitlements.userId, accountIds),
          inArray(entitlements.courseRef, courseRefs),
          inArray(entitlementLifecycleMessagesSent.messageKind, [...COURSE_REMINDER_KINDS]),
        ),
      )
    const sentByCourse = new Map<string, CourseReminderKind[]>()
    for (const row of sentRows) {
      const key = `${row.accountId}|${row.courseRef}`
      const kinds = sentByCourse.get(key) ?? []
      if (!kinds.includes(row.messageKind as CourseReminderKind))
        kinds.push(row.messageKind as CourseReminderKind)
      sentByCourse.set(key, kinds)
    }

    const result: CourseReminderCandidate[] = []
    for (const courseRef of courseRefs) {
      const group = candidates.filter((c) => c.courseRef === courseRef)
      result.push(...(await this.withProgress(group, courseRef, sentByCourse)))
    }
    return { candidates: result, next }
  }

  private async withProgress(
    candidates: Base[],
    courseRef: string,
    sentByCourse: Map<string, CourseReminderKind[]>,
  ): Promise<CourseReminderCandidate[]> {
    const accountIds = [...new Set(candidates.map((c) => c.accountId))]
    const progress = await loadCourseAccountProgress(this.db, courseRef, accountIds)
    // Sem curso ou sem aula publicada: nenhum lembrete (como antes).
    if (!progress || progress.lessonCount === 0) return []
    const { course, started, lastActivity, completedAt } = progress
    return candidates.map((candidate) => ({
      ...candidate,
      courseTitle: course.title,
      audience: course.audience === 'kids' ? ('kids' as const) : ('adult' as const),
      learner: course.learner === 'parents' ? ('parents' as const) : ('child' as const),
      started: started.has(candidate.accountId),
      completed: completedAt.has(candidate.accountId),
      lastActivityAt: lastActivity.get(candidate.accountId) ?? null,
      completedAt: completedAt.get(candidate.accountId) ?? null,
      sentKinds: sentByCourse.get(`${candidate.accountId}|${courseRef}`) ?? [],
    }))
  }

  async markSent(
    entitlementId: string,
    dedupeOn: string,
    kind: CourseReminderKind,
    now: Date,
  ): Promise<void> {
    await this.db
      .insert(entitlementLifecycleMessagesSent)
      .values({ entitlementId, expiresOn: dedupeOn, messageKind: kind, sentAt: now })
      .onConflictDoNothing()
  }
}

/** "Começaram o curso do presente" do Admin: as contas, entre as pedidas, que começaram. */
export class DrizzleCourseStartsRepository implements CourseStartsReader {
  constructor(private readonly db: Database) {}

  async startedAccounts(courseSlug: string, accountIds: string[]): Promise<string[] | null> {
    if (accountIds.length === 0) return []
    const progress = await loadCourseAccountProgress(this.db, courseSlug, accountIds)
    if (!progress) return null
    return accountIds.filter((id) => progress.started.has(id))
  }
}
