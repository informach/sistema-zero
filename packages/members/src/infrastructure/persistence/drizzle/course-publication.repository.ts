import { randomUUID } from 'node:crypto'
import {
  type CoursePublicationJobView,
  CoursePublicationJobViewSchema,
} from '@sistemazero/core/course/publication'
import { and, asc, count, desc, eq, inArray, isNull, lte, ne, or, sql } from 'drizzle-orm'
import { ContentNotFoundError } from '../../../domain/course/course.errors'
import {
  type CourseSnapshot,
  type Environment,
  hash,
  type MediaProof,
  planCourseSync,
  sourceHash,
} from '../../../domain/course-publication/course-sync'
import {
  CoursePublicationConflictError,
  CoursePublicationLeaseError,
  type CoursePublicationSeed,
  coursePublicationPreview,
  type PublicationTaskSeed,
  readPublicationSnapshot,
  storePublicationSnapshot,
} from '../../../domain/course-publication/jobs'
import {
  type CourseSyncDependencies,
  executeCourseSync,
  readCourseSnapshot,
  readSyncSnapshot,
} from './course-sync'
import type { Database } from './db'
import { courses, coursePublicationJobs as jobs, coursePublicationTasks as tasks } from './schema'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
export interface CoursePublicationClaim {
  id: string
  token: string
}
const active = ['queued', 'preparing', 'publishing'] as const
const claimed = (claim: CoursePublicationClaim) =>
  and(
    eq(jobs.id, claim.id),
    eq(jobs.leaseToken, claim.token),
    inArray(jobs.status, [...active]),
    sql`${jobs.leaseUntil} > clock_timestamp()`,
    or(isNull(jobs.deadlineAt), sql`${jobs.deadlineAt} > clock_timestamp()`),
  )

/** All clocks and leases are checked by Postgres, independently of worker machine clocks. */
export class DrizzleCoursePublicationRepository {
  constructor(
    private readonly db: Database,
    private readonly dependencies: CourseSyncDependencies,
  ) {}

  async snapshotForMirror(environment: Environment, sourceCourseId: string, targetSlug: string) {
    return this.db.transaction(
      async (tx) => {
        const [source] = await tx
          .select({ slug: courses.slug })
          .from(courses)
          .where(eq(courses.id, sourceCourseId))
        if (!source) throw new ContentNotFoundError('Curso não encontrado')
        return readSyncSnapshot(
          tx,
          { environment, sourceSlug: source.slug, targetSlug },
          this.dependencies.parseBlock,
        )
      },
      { isolationLevel: 'repeatable read' },
    )
  }

  async sourceForPromotion(sourceCourseId: string): Promise<CourseSnapshot> {
    return this.db.transaction(
      async (tx) => {
        const [course] = await tx.select().from(courses).where(eq(courses.id, sourceCourseId))
        if (
          course?.audience !== 'kids' ||
          course.status !== 'published' ||
          course.modality !== 'recorded'
        )
          throw new ContentNotFoundError('Curso Kids gravado publicado não encontrado')
        const source = await readCourseSnapshot(tx, course, this.dependencies.parseBlock)
        // Historical source rows are not teaching content and are never exported to another environment.
        return { ...source, archivedModules: [], archivedLessons: [] }
      },
      { isolationLevel: 'repeatable read' },
    )
  }
  async snapshotForPromotion(source: CourseSnapshot, targetSlug: string) {
    return this.db.transaction(
      (tx) =>
        readSyncSnapshot(
          tx,
          { environment: 'production', sourceSlug: source.course.slug, targetSlug },
          this.dependencies.parseBlock,
          { environment: 'staging', content: source },
        ),
      { isolationLevel: 'repeatable read' },
    )
  }
  async promotionBinding(id: string) {
    const [row] = await this.db
      .select({
        id: jobs.id,
        operation: jobs.operation,
        status: jobs.status,
        sourceHash: jobs.sourceHash,
        sourceCourseId: sql<string>`${jobs.preview}->'source'->>'id'`,
        sourceEnvironment: sql<string | null>`${jobs.snapshot}->>'sourceEnvironment'`,
        environment: sql<string>`${jobs.snapshot}->>'environment'`,
      })
      .from(jobs)
      .where(eq(jobs.id, id))
    return row ?? null
  }

  async create(seed: CoursePublicationSeed) {
    const snapshot = storePublicationSnapshot(seed.snapshot)
    if (Buffer.byteLength(JSON.stringify(snapshot), 'utf8') > 64_000_000)
      throw new CoursePublicationConflictError(
        'A captura dos cursos ultrapassa 64 MB. Divida a operação antes de publicar',
      )
    const plan = planCourseSync(seed.snapshot)
    if (
      plan.operation !== seed.operation ||
      hash(snapshot) !== seed.snapshotHash ||
      plan.planHash !== seed.planHash ||
      hash(coursePublicationPreview(seed.snapshot, plan)) !== hash(seed.preview)
    )
      throw new CoursePublicationConflictError('A prévia mudou antes de ser registrada')
    return this.db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(jobs)
        .values({ ...seed, snapshot, sourceHash: sourceHash(seed.snapshot), status: 'preview' })
        .onConflictDoNothing({ target: [jobs.actorId, jobs.requestKey] })
        .returning()
      const [existing] = inserted
        ? [inserted]
        : await tx
            .select()
            .from(jobs)
            .where(and(eq(jobs.actorId, seed.actorId), eq(jobs.requestKey, seed.requestKey)))
      if (
        !existing ||
        existing.operation !== seed.operation ||
        existing.snapshotHash !== seed.snapshotHash ||
        existing.planHash !== seed.planHash
      )
        throw new CoursePublicationConflictError('A chave do pedido já pertence a outra prévia')
      return existing.id
    })
  }
  async capture(id: string) {
    const [row] = await this.db.select().from(jobs).where(eq(jobs.id, id))
    return row ? { ...row, snapshot: readPublicationSnapshot(row.snapshot) } : null
  }
  async view(id: string): Promise<CoursePublicationJobView | null> {
    const [row] = await this.db
      .select({
        id: jobs.id,
        operation: jobs.operation,
        status: jobs.status,
        version: jobs.version,
        planHash: jobs.planHash,
        preview: jobs.preview,
        error: jobs.error,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
      })
      .from(jobs)
      .where(eq(jobs.id, id))
    if (!row) return null
    const counts = await this.db
      .select({ status: tasks.status, count: count() })
      .from(tasks)
      .where(and(eq(tasks.jobId, id), ne(tasks.kind, 'media-plan')))
      .groupBy(tasks.status)
    return CoursePublicationJobViewSchema.parse({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      tasks: {
        completed: counts.find((c) => c.status === 'completed')?.count ?? 0,
        total: counts.reduce((n, c) => n + c.count, 0),
      },
    })
  }
  async latest(sourceCourseId: string, limit = 10) {
    const rows = await this.db
      .select({ id: jobs.id })
      .from(jobs)
      .where(sql`${jobs.preview}->'source'->>'id' = ${sourceCourseId}`)
      .orderBy(desc(jobs.createdAt), desc(jobs.id))
      .limit(Math.min(20, Math.max(1, limit)))
    return Promise.all(rows.map((row) => this.view(row.id)))
  }
  async approve(id: string, version: number, planHash: string) {
    const [row] = await this.db
      .update(jobs)
      .set({
        status: 'queued',
        availableAt: sql`clock_timestamp()`,
        deadlineAt: sql`clock_timestamp()+interval '2 hours'`,
        version: sql`${jobs.version}+1`,
        updatedAt: sql`clock_timestamp()`,
      })
      .where(
        and(
          eq(jobs.id, id),
          eq(jobs.status, 'preview'),
          eq(jobs.version, version),
          eq(jobs.planHash, planHash),
        ),
      )
      .returning({ id: jobs.id })
    if (!row) throw new CoursePublicationConflictError('A prévia mudou ou já foi iniciada')
  }
  async cancel(id: string, version: number) {
    const [row] = await this.db
      .update(jobs)
      .set({
        status: 'cancelled',
        leaseToken: null,
        leaseUntil: null,
        version: sql`${jobs.version}+1`,
        updatedAt: sql`clock_timestamp()`,
      })
      .where(
        and(
          eq(jobs.id, id),
          eq(jobs.version, version),
          inArray(jobs.status, ['preview', 'queued', 'preparing', 'failed']),
        ),
      )
      .returning({ id: jobs.id })
    if (!row)
      throw new CoursePublicationConflictError('A publicação já começou ou o trabalho mudou')
  }
  async claim(): Promise<CoursePublicationClaim | null> {
    return this.db.transaction(async (tx) => {
      const expired = await tx
        .select({ id: jobs.id })
        .from(jobs)
        .where(and(inArray(jobs.status, [...active]), lte(jobs.deadlineAt, sql`clock_timestamp()`)))
        .limit(20)
        .for('update', { skipLocked: true })
      if (expired.length)
        await tx
          .update(jobs)
          .set({
            status: 'failed',
            error: 'A preparação ultrapassou duas horas. Confira as mídias e retome o trabalho.',
            leaseToken: null,
            leaseUntil: null,
            version: sql`${jobs.version}+1`,
            updatedAt: sql`clock_timestamp()`,
          })
          .where(
            inArray(
              jobs.id,
              expired.map((row) => row.id),
            ),
          )
      const [row] = await tx
        .select({ id: jobs.id })
        .from(jobs)
        .where(
          and(
            inArray(jobs.status, [...active]),
            lte(jobs.availableAt, sql`clock_timestamp()`),
            or(isNull(jobs.deadlineAt), sql`${jobs.deadlineAt} > clock_timestamp()`),
            or(isNull(jobs.leaseUntil), lte(jobs.leaseUntil, sql`clock_timestamp()`)),
          ),
        )
        .orderBy(asc(jobs.createdAt), asc(jobs.id))
        .limit(1)
        .for('update', { skipLocked: true })
      if (!row) return null
      const token = randomUUID()
      await tx
        .update(jobs)
        .set({
          status: 'preparing',
          leaseToken: token,
          leaseUntil: sql`clock_timestamp()+interval '90 seconds'`,
          version: sql`${jobs.version}+1`,
          updatedAt: sql`clock_timestamp()`,
        })
        .where(eq(jobs.id, row.id))
      return { id: row.id, token }
    })
  }
  async renew(claim: CoursePublicationClaim) {
    const [row] = await this.db
      .update(jobs)
      .set({ leaseUntil: sql`clock_timestamp()+interval '90 seconds'` })
      .where(claimed(claim))
      .returning({ id: jobs.id })
    if (!row) throw new CoursePublicationLeaseError('A preparação perdeu a posse do trabalho')
  }
  private async withClaim<T>(claim: CoursePublicationClaim, work: (tx: Transaction) => Promise<T>) {
    return this.db.transaction(async (tx) => {
      const [row] = await tx.select({ id: jobs.id }).from(jobs).where(claimed(claim)).for('update')
      if (!row)
        throw new CoursePublicationLeaseError(
          'O trabalho foi interrompido ou assumido por outra execução',
        )
      return work(tx)
    })
  }
  async initializeTasks(
    claim: CoursePublicationClaim,
    seeds: readonly PublicationTaskSeed[],
    progress?: { taskId: string; result: Record<string, unknown> },
  ) {
    if (
      seeds.length > 5000 ||
      seeds.some((seed) => !seed.id || seed.id.length > 128) ||
      new Set(seeds.map((s) => s.id)).size !== seeds.length
    )
      throw new Error('Lista de preparação inválida ou acima de 5000 recursos')
    return this.withClaim(claim, async (tx) => {
      if (seeds.length) {
        await tx
          .insert(tasks)
          .values(
            seeds.map((seed) => ({
              id: randomUUID(),
              jobId: claim.id,
              taskKey: seed.id,
              kind: seed.kind,
              input: seed.input,
            })),
          )
          .onConflictDoNothing({ target: [tasks.jobId, tasks.taskKey] })
        const existing = await tx
          .select({ key: tasks.taskKey, kind: tasks.kind, input: tasks.input })
          .from(tasks)
          .where(
            and(
              eq(tasks.jobId, claim.id),
              inArray(
                tasks.taskKey,
                seeds.map((seed) => seed.id),
              ),
            ),
          )
        const byKey = new Map(existing.map((row) => [row.key, row]))
        for (const seed of seeds) {
          const previous = byKey.get(seed.id)
          if (!previous || previous.kind !== seed.kind || hash(previous.input) !== hash(seed.input))
            throw new CoursePublicationConflictError('O recurso já tem outra preparação')
        }
      }
      if (progress) {
        const [saved] = await tx
          .update(tasks)
          .set({ result: progress.result, updatedAt: sql`clock_timestamp()` })
          .where(
            and(
              eq(tasks.id, progress.taskId),
              eq(tasks.jobId, claim.id),
              eq(tasks.kind, 'media-plan'),
              eq(tasks.status, 'pending'),
            ),
          )
          .returning({ id: tasks.id })
        if (!saved) throw new CoursePublicationConflictError('A preparação mudou ou já terminou')
      }
    })
  }
  async nextTask(claim: CoursePublicationClaim) {
    return this.withClaim(claim, async (tx) => {
      const [task] = await tx
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.jobId, claim.id),
            eq(tasks.status, 'pending'),
            or(
              and(
                ne(tasks.kind, 'media-plan'),
                sql`(coalesce(${tasks.result}->>'waiting', 'false') <> 'true' or ${tasks.updatedAt} <= clock_timestamp()-interval '30 seconds')`,
              ),
              and(
                eq(tasks.kind, 'media-plan'),
                sql`(${tasks.result} is null or not exists (select 1 from ${tasks} pending_resource where pending_resource.job_id = ${tasks.jobId} and pending_resource.status = 'pending' and pending_resource.kind <> 'media-plan'))`,
              ),
            ),
          ),
        )
        .orderBy(
          sql`case when ${tasks.kind} = 'media-plan' and ${tasks.result} is null then 0 when ${tasks.kind} = 'media-plan' then 2 else 1 end`,
          asc(tasks.createdAt),
          asc(tasks.id),
        )
        .limit(1)
      return task ?? null
    })
  }
  async planTask(claim: CoursePublicationClaim) {
    return this.withClaim(claim, async (tx) => {
      const rows = await tx
        .select()
        .from(tasks)
        .where(and(eq(tasks.jobId, claim.id), eq(tasks.kind, 'media-plan')))
        .limit(2)
      if (rows.length !== 1)
        throw new CoursePublicationConflictError('Plano da preparação ausente ou repetido')
      return rows[0]!
    })
  }
  async deferTask(claim: CoursePublicationClaim, taskId: string) {
    return this.withClaim(claim, async (tx) => {
      const [saved] = await tx
        .update(tasks)
        .set({ result: { waiting: true }, updatedAt: sql`clock_timestamp()` })
        .where(
          and(
            eq(tasks.id, taskId),
            eq(tasks.jobId, claim.id),
            eq(tasks.status, 'pending'),
            inArray(tasks.kind, ['r2-copy', 'vimeo-copy']),
          ),
        )
        .returning({ id: tasks.id })
      if (!saved)
        throw new CoursePublicationConflictError('O recurso mudou ou não pode aguardar o provedor')
    })
  }
  async savePlanProgress(
    claim: CoursePublicationClaim,
    taskId: string,
    result: Record<string, unknown>,
  ) {
    return this.initializeTasks(claim, [], { taskId, result })
  }
  async finishTask(claim: CoursePublicationClaim, taskId: string, result: Record<string, unknown>) {
    return this.withClaim(claim, async (tx) => {
      const [task] = await tx
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.jobId, claim.id)))
        .for('update')
      if (!task) throw new CoursePublicationConflictError('Recurso não pertence ao trabalho')
      if (task.status === 'completed') {
        if (hash(task.result) !== hash(result))
          throw new CoursePublicationConflictError('O recurso já tem outro resultado')
        return
      }
      await tx
        .update(tasks)
        .set({ status: 'completed', result, updatedAt: sql`clock_timestamp()` })
        .where(eq(tasks.id, taskId))
    })
  }
  async release(claim: CoursePublicationClaim, delaySeconds = 0) {
    if (!Number.isFinite(delaySeconds) || delaySeconds < 0 || delaySeconds > 300)
      throw new Error('Intervalo de retomada inválido')
    return this.withClaim(claim, async (tx) => {
      await tx
        .update(jobs)
        .set({
          leaseToken: null,
          leaseUntil: null,
          availableAt: sql`clock_timestamp()+${delaySeconds} * interval '1 second'`,
          updatedAt: sql`clock_timestamp()`,
        })
        .where(eq(jobs.id, claim.id))
    })
  }
  async completedTasks(claim: CoursePublicationClaim) {
    return this.withClaim(claim, async (tx) => {
      const [budget] = await tx
        .select({
          bytes: sql<string>`coalesce(sum(octet_length(${tasks.input}::text) + coalesce(octet_length(${tasks.result}::text), 0)), 0)`,
        })
        .from(tasks)
        .where(eq(tasks.jobId, claim.id))
      if (!budget || Number(budget.bytes) > 64_000_000)
        throw new CoursePublicationConflictError(
          'O material preparado ultrapassou o teto de 64 MB por curso',
        )
      return tx.select().from(tasks).where(eq(tasks.jobId, claim.id))
    })
  }
  async resume(id: string, version: number, planHash: string) {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(jobs)
        .where(
          and(
            eq(jobs.id, id),
            eq(jobs.status, 'failed'),
            eq(jobs.version, version),
            eq(jobs.planHash, planHash),
          ),
        )
        .for('update')
      if (!row)
        throw new CoursePublicationConflictError('O trabalho mudou ou não pode ser retomado')
      const snapshot = readPublicationSnapshot(row.snapshot)
      const current = await readSyncSnapshot(
        tx,
        {
          environment: snapshot.environment,
          sourceSlug: snapshot.source.course.slug,
          targetSlug: snapshot.target.course.slug,
        },
        this.dependencies.parseBlock,
        row.operation === 'promote-kids'
          ? { environment: 'staging', content: snapshot.source }
          : undefined,
      )
      if (hash(current) !== row.snapshotHash)
        throw new CoursePublicationConflictError('O curso mudou. Prepare outra prévia')
      // Rebuild derived tasks against the current destination profile. Provider caches/journals
      // retain the prepared resources; obsolete task identities must never leak into the new plan.
      await tx.delete(tasks).where(eq(tasks.jobId, id))
      await tx
        .update(jobs)
        .set({
          status: 'queued',
          availableAt: sql`clock_timestamp()`,
          deadlineAt: sql`clock_timestamp()+interval '2 hours'`,
          error: null,
          leaseToken: null,
          leaseUntil: null,
          version: sql`${jobs.version}+1`,
          updatedAt: sql`clock_timestamp()`,
        })
        .where(eq(jobs.id, id))
    })
  }
  async fail(claim: CoursePublicationClaim, message: string) {
    return this.withClaim(claim, async (tx) => {
      await tx
        .update(jobs)
        .set({
          status: 'failed',
          error: message.slice(0, 500),
          leaseToken: null,
          leaseUntil: null,
          version: sql`${jobs.version}+1`,
          updatedAt: sql`clock_timestamp()`,
        })
        .where(eq(jobs.id, claim.id))
    })
  }
  async publishMirror(claim: CoursePublicationClaim, media: MediaProof) {
    return this.publish(claim, media, 'copy-adult')
  }
  async publishPromotion(
    claim: CoursePublicationClaim,
    media: MediaProof,
    sourceSeal: { sourceHash: string; checkedAt: Date },
  ) {
    return this.publish(claim, media, 'promote-kids', sourceSeal)
  }
  private async publish(
    claim: CoursePublicationClaim,
    media: MediaProof,
    operation: 'copy-adult' | 'promote-kids',
    sourceSeal?: { sourceHash: string; checkedAt: Date },
  ) {
    return this.withClaim(claim, async (tx) => {
      const [row] = await tx.select().from(jobs).where(eq(jobs.id, claim.id))
      if (!row) throw new CoursePublicationLeaseError('O trabalho não existe mais')
      if (row.operation !== operation) throw new Error('Operação da publicação não confere')
      const snapshot = readPublicationSnapshot(row.snapshot)
      if (operation === 'promote-kids') {
        if (
          !sourceSeal ||
          sourceSeal.sourceHash !== row.sourceHash ||
          !Number.isFinite(sourceSeal.checkedAt.getTime())
        )
          throw new CoursePublicationConflictError('A origem de staging ainda não foi conferida')
        const fresh = await tx.execute(
          sql`select ${sourceSeal.checkedAt.toISOString()}::timestamptz between clock_timestamp()-interval '30 seconds' and clock_timestamp()+interval '5 seconds' as fresh`,
        )
        if (fresh[0]?.fresh !== true)
          throw new CoursePublicationConflictError('A conferência da origem de staging venceu')
      }
      const syncDependencies = {
        ...this.dependencies,
        ...(operation === 'promote-kids'
          ? { promotionSource: { environment: 'staging' as const, content: snapshot.source } }
          : {}),
      }
      const request = {
        actorId: row.actorId,
        environment: snapshot.environment,
        sourceSlug: snapshot.source.course.slug,
        targetSlug: snapshot.target.course.slug,
        mode: 'apply' as const,
        media,
      }
      const current = await readSyncSnapshot(
        tx,
        request,
        syncDependencies.parseBlock,
        syncDependencies.promotionSource,
      )
      if (hash(current) !== row.snapshotHash)
        throw new CoursePublicationConflictError('O curso mudou. Prepare outra prévia')
      const resources = await tx
        .select({
          key: tasks.taskKey,
          kind: tasks.kind,
          status: tasks.status,
          dependencies: sql<unknown>`case when ${tasks.kind} = 'media-plan' then ${tasks.result}->'taskKeys' else null end`,
        })
        .from(tasks)
        .where(eq(tasks.jobId, row.id))
      const plans = resources.filter((resource) => resource.kind === 'media-plan')
      const others = resources.filter((resource) => resource.kind !== 'media-plan')
      const dependencies = plans[0]?.dependencies
      if (
        plans.length !== 1 ||
        resources.some((resource) => resource.status !== 'completed') ||
        !Array.isArray(dependencies) ||
        dependencies.some((key) => typeof key !== 'string') ||
        new Set(dependencies).size !== dependencies.length ||
        dependencies.length !== others.length ||
        others.some((resource) => !dependencies.includes(resource.key))
      )
        throw new CoursePublicationConflictError('A preparação das mídias ainda não terminou')
      const plan = planCourseSync(current, media)
      await tx.update(jobs).set({ status: 'publishing' }).where(eq(jobs.id, row.id))
      const result = await executeCourseSync(
        tx,
        { ...request, expectedPlanHash: plan.planHash },
        syncDependencies,
      )
      await tx
        .update(jobs)
        .set({
          status: 'completed',
          result,
          leaseToken: null,
          leaseUntil: null,
          version: sql`${jobs.version}+1`,
          updatedAt: sql`clock_timestamp()`,
        })
        .where(eq(jobs.id, row.id))
      return result
    })
  }
}
