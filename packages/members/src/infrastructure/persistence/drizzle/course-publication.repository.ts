import { randomUUID } from 'node:crypto'
import {
  type CoursePublicationJobView,
  CoursePublicationJobViewSchema,
} from '@sistemazero/core/course/publication'
import { and, asc, count, desc, eq, inArray, isNull, lte, ne, or, sql } from 'drizzle-orm'
import {
  hash,
  type MediaProof,
  planCourseSync,
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
import { type CourseSyncDependencies, executeCourseSync, readSyncSnapshot } from './course-sync'
import type { Database } from './db'
import { coursePublicationJobs as jobs, coursePublicationTasks as tasks } from './schema'

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
  )

/** All clocks and leases are checked by Postgres, independently of worker machine clocks. */
export class DrizzleCoursePublicationRepository {
  constructor(
    private readonly db: Database,
    private readonly dependencies: CourseSyncDependencies,
  ) {}

  async create(seed: CoursePublicationSeed) {
    const snapshot = storePublicationSnapshot(seed.snapshot)
    const plan = planCourseSync(seed.snapshot)
    if (
      hash(snapshot) !== seed.snapshotHash ||
      plan.planHash !== seed.planHash ||
      hash(coursePublicationPreview(seed.snapshot, plan)) !== hash(seed.preview)
    )
      throw new CoursePublicationConflictError('A prévia mudou antes de ser registrada')
    return this.db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(jobs)
        .values({ ...seed, snapshot, status: 'preview' })
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
      .set({ status: 'queued', version: sql`${jobs.version}+1`, updatedAt: sql`clock_timestamp()` })
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
      const [row] = await tx
        .select({ id: jobs.id })
        .from(jobs)
        .where(
          and(
            inArray(jobs.status, [...active]),
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
  async initializeTasks(claim: CoursePublicationClaim, seeds: readonly PublicationTaskSeed[]) {
    if (
      seeds.length > 5000 ||
      seeds.some((seed) => !seed.id || seed.id.length > 128) ||
      new Set(seeds.map((s) => s.id)).size !== seeds.length
    )
      throw new Error('Lista de preparação inválida ou acima de 5000 recursos')
    return this.withClaim(claim, async (tx) => {
      if (!seeds.length) return
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
    })
  }
  async nextTask(claim: CoursePublicationClaim) {
    return this.withClaim(claim, async (tx) => {
      const [task] = await tx
        .select()
        .from(tasks)
        .where(and(eq(tasks.jobId, claim.id), eq(tasks.status, 'pending')))
        .orderBy(
          sql`case when ${tasks.kind} = 'media-plan' then 0 else 1 end`,
          asc(tasks.createdAt),
          asc(tasks.id),
        )
        .limit(1)
      return task ?? null
    })
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
  async release(claim: CoursePublicationClaim) {
    return this.withClaim(claim, async (tx) => {
      await tx
        .update(jobs)
        .set({ leaseToken: null, leaseUntil: null, updatedAt: sql`clock_timestamp()` })
        .where(eq(jobs.id, claim.id))
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
    return this.withClaim(claim, async (tx) => {
      const [row] = await tx.select().from(jobs).where(eq(jobs.id, claim.id))
      if (!row) throw new CoursePublicationLeaseError('O trabalho não existe mais')
      if (row.operation !== 'copy-adult') throw new Error('Operação não é uma cópia entre públicos')
      const snapshot = readPublicationSnapshot(row.snapshot)
      const request = {
        actorId: row.actorId,
        environment: snapshot.environment,
        sourceSlug: snapshot.source.course.slug,
        targetSlug: snapshot.target.course.slug,
        mode: 'apply' as const,
        media,
      }
      const current = await readSyncSnapshot(tx, request, this.dependencies.parseBlock)
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
        this.dependencies,
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
