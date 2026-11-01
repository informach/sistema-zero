import { randomUUID } from 'node:crypto'
import { asc, eq, inArray, sql } from 'drizzle-orm'
import { loadStudioAuthoringPolicy } from '../../src/infrastructure/config/studio-authoring-policy'
import { DrizzleContentAdminRepository } from '../../src/infrastructure/persistence/drizzle/content-admin.repository'
import { createDbConnection, type Database } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleLessonDraftRepository } from '../../src/infrastructure/persistence/drizzle/lesson-draft.repository'
import {
  courses,
  lessonDrafts,
  lessons,
  modules,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { parsePublishedLessonBlock } from '../../src/interfaces/http/lesson-draft.dtos'
import { syncCourseKnowledge } from './knowledge'
import {
  type Environment,
  hash,
  type MediaProof,
  planCourseSync,
  type Snapshot,
  same,
} from './plan'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
export interface SyncRequest {
  actorId: string
  environment: Environment
  sourceSlug: string
  targetSlug: string
  mode: 'plan' | 'apply'
  expectedPlanHash?: string
  media?: MediaProof
}

/** Reads only. No get-or-create draft operation is called during the inventory. */
export async function readSyncSnapshot(
  tx: Transaction,
  request: Pick<SyncRequest, 'environment' | 'sourceSlug' | 'targetSlug'>,
): Promise<Snapshot> {
  const rows = await tx
    .select()
    .from(courses)
    .where(inArray(courses.slug, [request.sourceSlug, request.targetSlug]))
    .orderBy(asc(courses.id))
  if (rows.length !== 2) throw new Error('Informe dois cursos existentes e distintos')
  const drafts = new DrizzleLessonDraftRepository(tx, parsePublishedLessonBlock)
  const trees: Snapshot['source'][] = []
  for (const course of rows) {
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
    const snapshots = []
    for (const row of lessonRows) {
      const published = await drafts.readPublished(row.id)
      const [draft] = await tx.select().from(lessonDrafts).where(eq(lessonDrafts.lessonId, row.id))
      snapshots.push({
        row,
        published: published.document,
        publishedRevision: published.revision,
        draft: draft ? { revision: draft.revision, document: draft.document } : null,
      })
    }
    trees.push({ course, modules: moduleRows, lessons: snapshots })
  }
  const source = trees.find((t) => t.course.slug === request.sourceSlug)
  const target = trees.find((t) => t.course.slug === request.targetSlug)
  if (!source || !target) throw new Error('Cursos não encontrados')
  return { environment: request.environment, source, target }
}

export async function executeCourseSync(
  db: Database,
  request: SyncRequest,
  policy?: Awaited<ReturnType<typeof loadStudioAuthoringPolicy>>,
) {
  if (request.mode !== 'plan' && request.mode !== 'apply') throw new Error('Modo inválido')
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local statement_timeout = '60s'`)
    await tx.execute(sql`set local lock_timeout = '10s'`)
    if (request.mode === 'plan')
      await tx.execute(sql`set transaction isolation level repeatable read, read only`)
    else {
      // Same ordering as canonical authoring: courses, then lessons. Concurrent edits block.
      const locked = await tx
        .select({ id: courses.id })
        .from(courses)
        .where(inArray(courses.slug, [request.sourceSlug, request.targetSlug]))
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
    const snapshot = await readSyncSnapshot(tx, request)
    const plan = planCourseSync(snapshot, request.media)
    if (request.mode === 'plan') return { snapshot, plan }
    if (!request.media || request.expectedPlanHash !== plan.planHash)
      throw new Error('O plano mudou ou a mídia não foi conferida. Gere outro plano')
    const checked = Date.parse(request.media.checkedAt)
    if (
      !Number.isFinite(checked) ||
      checked > Date.now() + 60_000 ||
      Date.now() - checked > 30 * 60_000
    )
      throw new Error('A conferência de mídia precisa ter menos de 30 minutos')
    if (!plan.changed)
      return {
        applied: false,
        verified: true,
        planHash: plan.planHash,
        sourceHash: plan.sourceHash,
      }
    const author = request.actorId
    const drafts = new DrizzleLessonDraftRepository(tx, parsePublishedLessonBlock, policy)
    const content = new DrizzleContentAdminRepository(tx, policy)
    const now = new Date()
    // Temporary positions prevent unique conflicts when existing rows are reordered.
    if (snapshot.target.modules.length)
      await tx
        .update(modules)
        .set({ sortOrder: sql`${modules.sortOrder} - 2000000` })
        .where(eq(modules.courseId, plan.course.id))
    if (snapshot.target.lessons.length)
      await tx
        .update(lessons)
        .set({ sortOrder: sql`${lessons.sortOrder} - 2000000` })
        .where(eq(lessons.courseId, plan.course.id))
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
            updatedAt: now,
          },
        })
        .returning({ courseId: modules.courseId })
      if (savedModule?.courseId !== plan.course.id)
        throw new Error('O módulo pertence a outro curso')
    }
    for (const lesson of plan.lessons) {
      const exists = snapshot.target.lessons.some((l) => l.row.id === lesson.row.id)
      if (!exists) {
        const { createdAt: _c, updatedAt: _u, ...fields } = lesson.row
        await tx
          .insert(lessons)
          .values({ ...fields, isPublished: false, createdAt: now, updatedAt: now })
      } else {
        await tx
          .update(lessons)
          .set({ moduleId: lesson.row.moduleId, sortOrder: lesson.row.sortOrder, updatedAt: now })
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
    const knowledge = await syncCourseKnowledge(tx, plan, snapshot.source.course.id)
    const after = await readSyncSnapshot(tx, request)
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

export async function run(request: SyncRequest) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request.actorId))
    throw new Error('Informe o UUID da conta administrativa responsável')
  if (
    !['staging', 'production'].includes(request.environment) ||
    process.env.RAILWAY_ENVIRONMENT_NAME !== request.environment ||
    process.env.RAILWAY_SERVICE_NAME !== 'members'
  )
    throw new Error('Ambiente ou serviço Railway diferente do solicitado')
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(request.sourceSlug) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(request.targetSlug)
  )
    throw new Error('Slugs inválidos')
  const connection = createDbConnection(process.env.DATABASE_URL ?? '', {
    max: 1,
    idleInTransactionTimeoutMs: 120_000,
  })
  try {
    return await executeCourseSync(
      connection.db,
      request,
      await loadStudioAuthoringPolicy({
        STUDIO_AUTHORING_POLICY_JSON: process.env.STUDIO_AUTHORING_POLICY_JSON,
        STUDIO_AUTHORING_POLICY_SHA256: process.env.STUDIO_AUTHORING_POLICY_SHA256,
      }),
    )
  } finally {
    await connection.close()
  }
}
