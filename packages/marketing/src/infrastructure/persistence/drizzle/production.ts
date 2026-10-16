import { randomUUID } from 'node:crypto'
import {
  productionActivityReportSchema,
  productionRecordSchema,
  type RecordProduction,
  voidProductionResultSchema,
} from '@sistemazero/marketing-contracts'
import { and, desc, eq, gte, inArray, isNull, lte, ne, sql } from 'drizzle-orm'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import type { Database } from './db'
import { projectAccess, receipt, snapshotProjectAccess } from './workspace.repository'
import {
  editorialAttempts as attempts,
  editorialItems as items,
  editorialReceipts as receipts,
  editorialProductionRecords as records,
  editorialRuns as runs,
} from './workspace-schema'

function recordView(row: typeof records.$inferSelect) {
  return productionRecordSchema.parse({
    id: row.id,
    projectId: row.projectId,
    actorId: row.actorId,
    createdAt: row.createdAt.toISOString(),
    replacesId: row.replacesId,
    body: row.body,
  })
}
const changed = () =>
  new WorkspaceError('CONTEXT_CHANGED', 'O registro mudou. Atualize antes de corrigir.')
export function recordProduction(
  db: Database,
  actorId: string,
  projectId: string,
  input: RecordProduction,
  hash: string,
  now = new Date(),
) {
  return db.transaction(async (tx) => {
    await projectAccess(tx, actorId, projectId, 'edit')
    const saved = await receipt(tx, projectId, actorId, input.operationId, hash)
    if (saved) return productionRecordSchema.parse(saved.result)
    const [previous] = input.replacesId
      ? await tx
          .select()
          .from(records)
          .where(
            and(
              eq(records.projectId, projectId),
              eq(records.id, input.replacesId),
              isNull(records.replacedBy),
              isNull(records.voidedAt),
            ),
          )
      : []
    if (input.replacesId && (!previous || previous.body.kind !== input.body.kind)) throw changed()
    const body = input.body
    if (body.kind === 'human-time') {
      if (previous && previous.actorId !== actorId)
        throw new WorkspaceError(
          'OBJECT_INACCESSIBLE',
          'Só o autor pode corrigir seu tempo declarado.',
        )
      if (Date.parse(body.endedAt) > now.getTime())
        throw new WorkspaceError('VALIDATION_ERROR', 'Registre apenas trabalho já realizado.')
      if (body.entityId) {
        const [item] = await tx
          .select({ id: items.id })
          .from(items)
          .where(and(eq(items.projectId, projectId), eq(items.id, body.entityId)))
        if (!item)
          throw new WorkspaceError('OBJECT_INACCESSIBLE', 'Peça não disponível neste projeto.')
      }
      // Serialize this actor across projects too: simultaneous tabs must not double-count time.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${actorId}, 627103))`)
      const [overlap] = await tx
        .select({ id: records.id })
        .from(records)
        .where(
          and(
            eq(records.actorId, actorId),
            isNull(records.replacedBy),
            isNull(records.voidedAt),
            input.replacesId ? ne(records.id, input.replacesId) : undefined,
            sql`${records.body}->>'kind' = 'human-time'`,
            sql`(${records.body}->>'startedAt')::timestamptz < ${body.endedAt}::timestamptz`,
            sql`(${records.body}->>'endedAt')::timestamptz > ${body.startedAt}::timestamptz`,
          ),
        )
        .limit(1)
      if (overlap)
        throw new WorkspaceError(
          'VALIDATION_ERROR',
          'Esse horário já foi registrado por você, neste ou em outro projeto.',
        )
    } else {
      const [run] = await tx
        .select({ id: runs.id, state: runs.state })
        .from(runs)
        .where(and(eq(runs.projectId, projectId), eq(runs.id, body.runId)))
      if (run?.state !== 'succeeded')
        throw new WorkspaceError('VALIDATION_ERROR', 'Avalie um resultado concluído deste projeto.')
      const [current] = await tx
        .select({ id: records.id })
        .from(records)
        .where(
          and(
            eq(records.projectId, projectId),
            isNull(records.replacedBy),
            isNull(records.voidedAt),
            sql`${records.body}->>'kind' = 'generation-review'`,
            sql`${records.body}->>'runId' = ${body.runId}`,
          ),
        )
        .limit(1)
      if (
        (current?.id ?? null) !== input.replacesId ||
        (previous?.body.kind === 'generation-review' && previous.body.runId !== body.runId)
      )
        throw changed()
    }
    const id = randomUUID()
    await tx
      .insert(records)
      .values({ id, projectId, actorId, createdAt: now, replacesId: input.replacesId, body })
    if (previous)
      await tx.update(records).set({ replacedBy: id }).where(eq(records.id, previous.id))
    const result = productionRecordSchema.parse({
      id,
      projectId,
      actorId,
      createdAt: now.toISOString(),
      replacesId: input.replacesId,
      body,
    })
    await tx
      .insert(receipts)
      .values({ projectId, actorId, operationId: input.operationId, hash, result })
    return result
  })
}

export function voidProduction(
  db: Database,
  actorId: string,
  projectId: string,
  input: { operationId: string; recordId: string },
  hash: string,
) {
  return db.transaction(async (tx) => {
    await projectAccess(tx, actorId, projectId, 'edit')
    const saved = await receipt(tx, projectId, actorId, input.operationId, hash)
    if (saved) return voidProductionResultSchema.parse(saved.result)
    const [row] = await tx
      .select()
      .from(records)
      .where(and(eq(records.projectId, projectId), eq(records.id, input.recordId)))
    if (!row || (row.body.kind === 'human-time' && row.actorId !== actorId))
      throw new WorkspaceError('OBJECT_INACCESSIBLE', 'Registro não disponível para correção.')
    if (row.replacedBy) throw changed()
    if (!row.voidedAt)
      await tx
        .update(records)
        .set({ voidedAt: new Date(), voidedBy: actorId })
        .where(eq(records.id, row.id))
    const result = voidProductionResultSchema.parse({ id: row.id, voided: true })
    await tx
      .insert(receipts)
      .values({ projectId, actorId, operationId: input.operationId, hash, result })
    return result
  })
}

export function readProduction(
  db: Database,
  actorId: string,
  projectId: string,
  days: number,
  now = new Date(),
) {
  return db.transaction(
    async (tx) => {
      await snapshotProjectAccess(tx, actorId, projectId)
      const since = new Date(now.getTime() - days * 86_400_000)
      const candidates = await tx
        .select({
          id: runs.id,
          createdAt: runs.createdAt,
          state: runs.state,
          entityId: sql<string>`${runs.request}->>'entityId'`,
          title: sql<string>`${runs.context}->'source'->'document'->>'title'`,
          provider: sql<string>`${runs.request}->>'provider'`,
          capability: sql<string>`${runs.request}->>'capability'`,
          intent: sql<string>`${runs.request}->>'intent'`,
          applied: sql<boolean>`coalesce(${runs.application}->'result'->>'status' = 'applied', false)`,
          undone: sql<boolean>`coalesce(${runs.application}->'undo'->>'status' = 'applied', false)`,
        })
        .from(runs)
        .where(
          and(eq(runs.projectId, projectId), gte(runs.createdAt, since), lte(runs.createdAt, now)),
        )
        .orderBy(desc(runs.createdAt), desc(runs.id))
        .limit(501)
      const selected = candidates.slice(0, 500),
        ids = selected.map((run) => run.id)
      const aggregates = ids.length
        ? // A run can have only one successful attempt. Summing confirmed outcomes
          // avoids counting a recovered local result and its old checkpoints twice.
          // Interrupted attempts without a confirmed outcome remain uncovered.
          await tx
            .select({
              runId: attempts.runId,
              attempts: sql<number>`count(*)`.mapWith(Number),
              interrupted:
                sql<number>`count(*) filter (where ${attempts.state} in ('failed','waiting','canceled') or (${attempts.state} = 'running' and ${attempts.leaseExpiresAt} < ${now.toISOString()}::timestamptz))`.mapWith(
                  Number,
                ),
              duration: sql<
                number | null
              >`sum((${attempts.outcome}->>'durationMs')::bigint)`.mapWith(Number),
              durations: sql<number>`count(${attempts.outcome}->>'durationMs')`.mapWith(Number),
              inputTokens: sql<
                number | null
              >`sum((${attempts.outcome}->>'inputTokens')::bigint)`.mapWith(Number),
              outputTokens: sql<
                number | null
              >`sum((${attempts.outcome}->>'outputTokens')::bigint)`.mapWith(Number),
              inputCoverage: sql<number>`count((${attempts.outcome}->>'inputTokens'))`.mapWith(
                Number,
              ),
              outputCoverage: sql<number>`count((${attempts.outcome}->>'outputTokens'))`.mapWith(
                Number,
              ),
            })
            .from(attempts)
            .where(and(inArray(attempts.runId, ids), lte(attempts.startedAt, now)))
            .groupBy(attempts.runId)
        : []
      const evaluations = ids.length
        ? await tx
            .select()
            .from(records)
            .where(
              and(
                eq(records.projectId, projectId),
                isNull(records.replacedBy),
                isNull(records.voidedAt),
                lte(records.createdAt, now),
                sql`${records.body}->>'kind' = 'generation-review'`,
                inArray(sql`${records.body}->>'runId'`, ids),
              ),
            )
        : []
      const time = await tx
        .select()
        .from(records)
        .where(
          and(
            eq(records.projectId, projectId),
            isNull(records.replacedBy),
            isNull(records.voidedAt),
            lte(records.createdAt, now),
            sql`${records.body}->>'kind' = 'human-time'`,
            sql`(${records.body}->>'endedAt')::timestamptz > ${since.toISOString()}::timestamptz`,
            sql`(${records.body}->>'startedAt')::timestamptz < ${now.toISOString()}::timestamptz`,
          ),
        )
        .orderBy(desc(records.createdAt), desc(records.id))
        .limit(1001)
      const stats = new Map(aggregates.map((row) => [row.runId, row]))
      const reviews = new Map(
        evaluations.flatMap((row) =>
          row.body.kind === 'generation-review' ? [[row.body.runId, recordView(row)] as const] : [],
        ),
      )
      return productionActivityReportSchema.parse({
        projectId,
        since: since.toISOString(),
        until: now.toISOString(),
        coverage: { runsTruncated: candidates.length > 500, timeTruncated: time.length > 1000 },
        timeRecords: time.slice(0, 1000).map(recordView),
        runs: selected.map((run) => {
          const a = stats.get(run.id)
          return {
            ...run,
            createdAt: run.createdAt.toISOString(),
            attempts: a?.attempts ?? 0,
            interruptedAttempts: a?.interrupted ?? 0,
            recovered: run.state === 'succeeded' && (a?.interrupted ?? 0) > 0,
            measuredDurationMs: a?.duration ?? null,
            measuredDurations: a?.durations ?? 0,
            inputTokens: a?.inputTokens ?? null,
            outputTokens: a?.outputTokens ?? null,
            inputCoverage: a?.inputCoverage ?? 0,
            outputCoverage: a?.outputCoverage ?? 0,
            review: reviews.get(run.id) ?? null,
          }
        }),
      })
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  )
}
