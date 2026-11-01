import { randomUUID } from 'node:crypto'
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { curriculumParkingPositions } from '../../../domain/course/curriculum-order'
import type { LessonBlockContent } from '../../../domain/course/lesson-block'
import {
  type Environment,
  hash,
  type MediaProof,
  missingAdultTarget,
  missingKidsTarget,
  planCourseSync,
  type Snapshot,
  same,
} from '../../../domain/course-publication/course-sync'
import type { StudioAuthoringPolicy } from '../../../domain/studio/authoring-policy'
import { DrizzleContentAdminRepository } from './content-admin.repository'
import { syncCourseKnowledge } from './course-knowledge-sync'
import type { Database } from './db'
import { DrizzleLessonDraftRepository } from './lesson-draft.repository'
import { courses, lessonBlocks, lessonDrafts, lessons, modules } from './schema'
import { preserveStudioChainsForLessons } from './studio-chain.repository'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
export interface CourseSyncDependencies {
  parseBlock: (value: unknown) => LessonBlockContent
  policy?: StudioAuthoringPolicy
  promotionSource?: { environment: 'staging'; content: Snapshot['source'] }
}
export interface SyncRequest {
  actorId: string
  environment: Environment
  sourceSlug: string
  targetSlug: string
  mode: 'plan' | 'apply' | 'verify'
  expectedPlanHash?: string
  media?: MediaProof
}

/** Current published tree, with archived identities retained only for matching/history. */
export async function readCourseSnapshot(
  tx: Transaction,
  course: Snapshot['source']['course'],
  parseBlock: CourseSyncDependencies['parseBlock'],
): Promise<Snapshot['source']> {
  const drafts = new DrizzleLessonDraftRepository(tx, parseBlock)
  const moduleRows = await tx
    .select()
    .from(modules)
    .where(eq(modules.courseId, course.id))
    .orderBy(asc(modules.sortOrder))
  const lessonRows = await tx
    .select()
    .from(lessons)
    .where(eq(lessons.courseId, course.id))
    .orderBy(asc(lessons.moduleId), asc(lessons.sortOrder))
  const snapshots: Snapshot['source']['lessons'] = []
  for (const row of lessonRows) {
    if (row.archivedAt) continue
    const published = await drafts.readPublished(row.id)
    const [draft] = await tx.select().from(lessonDrafts).where(eq(lessonDrafts.lessonId, row.id))
    snapshots.push({
      row,
      published: published.document,
      publishedRevision: published.revision,
      draft: draft ? { revision: draft.revision, document: draft.document } : null,
    })
  }
  return {
    course,
    modules: moduleRows.filter((m) => !m.archivedAt),
    lessons: snapshots,
    archivedModules: moduleRows.filter((m) => m.archivedAt),
    archivedLessons: lessonRows.filter((l) => l.archivedAt),
  }
}

/** Reads only. The external source is accepted solely from the trusted promotion composition. */
export async function readSyncSnapshot(
  tx: Transaction,
  request: Pick<SyncRequest, 'environment' | 'sourceSlug' | 'targetSlug'>,
  parseBlock: CourseSyncDependencies['parseBlock'],
  promotionSource?: CourseSyncDependencies['promotionSource'],
): Promise<Snapshot> {
  if (promotionSource) {
    if (
      request.environment !== 'production' ||
      promotionSource.environment !== 'staging' ||
      promotionSource.content.course.slug !== request.sourceSlug ||
      promotionSource.content.missing
    )
      throw new Error('Origem externa inválida para a promoção')
    const [target] = await tx.select().from(courses).where(eq(courses.slug, request.targetSlug))
    return {
      environment: 'production',
      sourceEnvironment: 'staging',
      operation: 'promote-kids',
      source: promotionSource.content,
      target: target
        ? await readCourseSnapshot(tx, target, parseBlock)
        : missingKidsTarget(promotionSource.content.course, request.targetSlug, 'production'),
    }
  }
  const rows = await tx
    .select()
    .from(courses)
    .where(inArray(courses.slug, [request.sourceSlug, request.targetSlug]))
    .orderBy(asc(courses.id))
  if (!rows.length || request.sourceSlug === request.targetSlug)
    throw new Error('Informe uma origem existente e slugs distintos')
  const trees: Snapshot['source'][] = []
  for (const course of rows) trees.push(await readCourseSnapshot(tx, course, parseBlock))
  const source = trees.find((t) => t.course.slug === request.sourceSlug)
  if (!source) throw new Error('Curso Kids não encontrado')
  const target =
    trees.find((t) => t.course.slug === request.targetSlug) ??
    missingAdultTarget(source.course, request.targetSlug, request.environment)
  return { environment: request.environment, source, target }
}

export async function executeCourseSync(
  db: Database,
  request: SyncRequest,
  { parseBlock, policy, promotionSource }: CourseSyncDependencies,
) {
  if (!['plan', 'apply', 'verify'].includes(request.mode)) throw new Error('Modo inválido')
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local statement_timeout = '60s'`)
    await tx.execute(sql`set local lock_timeout = '10s'`)
    if (request.mode !== 'apply')
      await tx.execute(sql`set transaction isolation level repeatable read, read only`)
    else {
      // Same ordering as canonical authoring: courses, then lessons. Concurrent edits block.
      const locked = await tx
        .select({ id: courses.id })
        .from(courses)
        .where(
          inArray(
            courses.slug,
            promotionSource ? [request.targetSlug] : [request.sourceSlug, request.targetSlug],
          ),
        )
        .orderBy(asc(courses.id))
        .for('update')
      await tx
        .select({ id: lessons.id })
        .from(lessons)
        .where(
          inArray(
            lessons.courseId,
            locked.map((c) => c.id),
          ),
        )
        .orderBy(asc(lessons.id))
        .for('update')
    }
    const snapshot = await readSyncSnapshot(tx, request, parseBlock, promotionSource)
    const plan = planCourseSync(snapshot, request.media)
    if (request.mode === 'plan') return { snapshot, plan }
    if (request.mode === 'verify') {
      const knowledge = await syncCourseKnowledge(
        tx,
        plan,
        snapshot.source,
        true,
        request.media?.knowledge,
      )
      if (plan.changed || !knowledge.unchanged)
        throw new Error('O conteúdo ou o material do Zappy ainda difere da origem')
      return { snapshot, plan, knowledge }
    }
    if (!request.media || request.expectedPlanHash !== plan.planHash)
      throw new Error('O plano mudou ou a mídia não foi conferida. Gere outro plano')
    const checked = Date.parse(request.media.checkedAt)
    if (
      !Number.isFinite(checked) ||
      checked > Date.now() + 60_000 ||
      Date.now() - checked > 30 * 60_000
    )
      throw new Error('A conferência de mídia precisa ter menos de 30 minutos')
    if (!plan.changed) {
      const knowledge = await syncCourseKnowledge(
        tx,
        plan,
        snapshot.source,
        false,
        request.media?.knowledge,
      )
      return {
        applied: !knowledge.unchanged,
        contentChanged: false,
        knowledge,
        verified: true,
        planHash: plan.planHash,
        sourceHash: plan.sourceHash,
      }
    }
    const author = request.actorId
    const drafts = new DrizzleLessonDraftRepository(tx, parseBlock, policy)
    const content = new DrizzleContentAdminRepository(tx, policy)
    const now = new Date()
    if (snapshot.target.missing) {
      await tx.insert(courses).values({
        ...plan.course,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      })
    }
    // Park active rows below every historical position. Archived identities stay unique;
    // repeated replacements never collide with an older archived curriculum.
    const park = async (
      table: typeof modules | typeof lessons,
      active: { id: string; sortOrder: number }[],
      archived: { sortOrder: number }[],
    ) => {
      const positions = curriculumParkingPositions([
        ...active.map((r) => ({ ...r, archivedAt: null })),
        ...archived.map((r, i) => ({ ...r, id: `archived:${i}`, archivedAt: now })),
      ])
      for (const row of positions)
        await tx.update(table).set({ sortOrder: row.sortOrder }).where(eq(table.id, row.id))
    }
    await park(modules, snapshot.target.modules, snapshot.target.archivedModules ?? [])
    await park(
      lessons,
      snapshot.target.lessons.map((l) => l.row),
      snapshot.target.archivedLessons ?? [],
    )
    if (plan.retirements.lessons.length) {
      await preserveStudioChainsForLessons(tx, plan.course.id, plan.retirements.lessons)
      await tx
        .update(lessonBlocks)
        .set({ archivedAt: now })
        .where(
          and(
            inArray(lessonBlocks.lessonId, plan.retirements.lessons),
            isNull(lessonBlocks.archivedAt),
          ),
        )
      await tx
        .update(lessons)
        .set({ archivedAt: now, isPublished: false, updatedAt: now })
        .where(inArray(lessons.id, plan.retirements.lessons))
    }
    if (plan.retirements.modules.length)
      await tx
        .update(modules)
        .set({ archivedAt: now, updatedAt: now })
        .where(inArray(modules.id, plan.retirements.modules))
    for (const module of plan.modules) {
      const { createdAt: _c, updatedAt: _u, ...fields } = module
      const [savedModule] = await tx
        .insert(modules)
        .values({ ...fields, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({
          target: modules.id,
          setWhere: eq(modules.courseId, plan.course.id),
          set: {
            title: module.title,
            summary: module.summary,
            animation: module.animation,
            sortOrder: module.sortOrder,
            archivedAt: null,
            updatedAt: now,
          },
        })
        .returning({ courseId: modules.courseId })
      if (savedModule?.courseId !== plan.course.id)
        throw new Error('O módulo pertence a outro curso')
    }
    for (const lesson of plan.lessons) {
      const exists =
        snapshot.target.lessons.some((l) => l.row.id === lesson.row.id) ||
        snapshot.target.archivedLessons?.some((l) => l.id === lesson.row.id)
      if (!exists) {
        const { createdAt: _c, updatedAt: _u, ...fields } = lesson.row
        await tx
          .insert(lessons)
          .values({ ...fields, isPublished: false, createdAt: now, updatedAt: now })
      } else {
        await tx
          .update(lessons)
          .set({
            moduleId: lesson.row.moduleId,
            sortOrder: lesson.row.sortOrder,
            archivedAt: null,
            updatedAt: now,
          })
          .where(eq(lessons.id, lesson.row.id))
      }
      if (!lesson.changed) continue
      const current = await drafts.read(lesson.row.id)
      const updated = await drafts.replace(
        lesson.row.id,
        author,
        current.revision,
        randomUUID(),
        lesson.document,
      )
      const issues = await drafts.validate(
        lesson.row.id,
        updated.revision,
        request.media.readyVideoIds,
      )
      if (issues.length)
        throw new Error(`${lesson.row.slug}: ${issues.map((i) => i.message).join('; ')}`)
      await drafts.publish(
        lesson.row.id,
        author,
        updated.revision,
        randomUUID(),
        request.media.readyVideoIds,
      )
    }
    if (!(await content.updateCourse({ ...plan.course, updatedAt: now })))
      throw new Error('O curso adulto mudou durante a sincronização')
    const knowledge = await syncCourseKnowledge(
      tx,
      plan,
      snapshot.source,
      false,
      request.media?.knowledge,
    )
    const after = await readSyncSnapshot(tx, request, parseBlock, promotionSource)
    if (!same(snapshot.source, after.source)) throw new Error('A origem Kids foi alterada')
    const verify = planCourseSync(after, request.media)
    if (verify.changed)
      throw new Error(
        'A conferência final encontrou conteúdo diferente. Toda a operação foi desfeita',
      )
    return {
      applied: true,
      verified: true,
      knowledge,
      planHash: plan.planHash,
      sourceHash: plan.sourceHash,
      targetCourseId: plan.course.id,
      targetSlug: plan.course.slug,
      coursePublished: after.target.course.status === 'published',
      modules: plan.modules.length,
      lessons: plan.lessons.length,
      blocks: plan.lessons.reduce((n, l) => n + l.document.blocks.length, 0),
      attachments: plan.lessons.reduce((n, l) => n + l.document.attachments.length, 0),
      videos: request.media.readyVideoIds.length,
      generatedVoices: request.media.generated,
      reusedVoices: request.media.reused,
      sourceUnchanged: hash(snapshot.source) === hash(after.source),
    }
  })
}
