import { createHash, randomUUID } from 'node:crypto'
import {
  type ClaimRun,
  type ContextRequest,
  canonicalJson,
  demonstrationSources,
  type EditorialApplication,
  type EditorialBatch,
  type ExecutionContext,
  type ExecutionRequest,
  type ExecutionRun,
  executionContextSchema,
  type FinishRun,
  type Heartbeat,
  type RunListQuery,
  revisionSchema,
  runViewSchema,
  stableEditorialId,
} from '@sistemazero/marketing-contracts'
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { ExecutionRepository } from '../../../domain/ports/execution-repository.port'
import { editorialBatch, frozenRevisions } from '../../../domain/workspace/editorial-proposal'
import { references } from '../../../domain/workspace/references'
import {
  validateRecordingAssets,
  validateRenderResult,
} from '../../../domain/workspace/render-result'
import {
  validateOutcomeCapability,
  validateVisualRequest,
} from '../../../domain/workspace/visual-request'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import { loadContextBasis } from './context-basis'
import type { Database } from './db'
import {
  DrizzleWorkspaceRepository,
  projectAccess,
  receipt,
  recordChange,
  type WorkspaceTransaction,
} from './workspace.repository'
import {
  editorialAssets as assets,
  editorialAttempts as attempts,
  editorialItems as items,
  editorialReceipts as receipts,
  editorialRevisions as revisions,
  editorialRuns as runs,
} from './workspace-schema'

const inaccessible = () =>
  new WorkspaceError('OBJECT_INACCESSIBLE', 'Trabalho não disponível para esta conta')
const expired = () =>
  new WorkspaceError(
    'LEASE_EXPIRED',
    'Esta tentativa perdeu a autorização de execução. Seu resultado local foi preservado.',
  )
const contextChanged = () =>
  new WorkspaceError(
    'CONTEXT_CHANGED',
    'A base mudou. Confira a revisão atual antes de iniciar o trabalho.',
  )
const hash = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex')
type RunRow = typeof runs.$inferSelect
async function serverTime(tx: WorkspaceTransaction) {
  const rows = await tx.execute(sql`select clock_timestamp()::text as now`)
  return new Date(z.object({ now: z.string() }).parse(rows[0]).now)
}
async function loadContext(
  tx: WorkspaceTransaction,
  input: ContextRequest,
): Promise<{ context: ExecutionContext; hash: string }> {
  const [source] = await tx
    .select()
    .from(items)
    .where(
      and(
        eq(items.id, input.entityId),
        eq(items.projectId, input.projectId),
        eq(items.archived, false),
      ),
    )
  if (!source || source.revisionId !== input.revisionId) throw contextChanged()
  const ancestors: Array<typeof source> = []
  let child = source
  for (let level = 0; level < 2; level++) {
    const parentId =
      child.document.kind === 'component' || child.document.kind === 'video'
        ? child.document.representationId
        : child.document.kind === 'representation'
          ? child.document.pieceId
          : null
    if (!parentId) break
    const [parent] = await tx
      .select()
      .from(items)
      .where(
        and(
          eq(items.id, parentId),
          eq(items.projectId, input.projectId),
          eq(items.archived, false),
        ),
      )
    if (!parent) throw inaccessible()
    ancestors.push(parent)
    child = parent
  }
  const basis = await loadContextBasis(tx, input.projectId, source.document, ancestors)
  const byId = new Map([[source.id, source]])
  const allowed = new Set<string>(),
    queue = [source.id]
  while (queue.length) {
    const id = queue.shift()
    if (!id || allowed.has(id)) continue
    allowed.add(id)
    const item = byId.get(id)
    const ids =
      item?.document.kind === 'piece'
        ? item.document.representationIds
        : item?.document.kind === 'representation'
          ? item.document.componentIds
          : []
    if (ids.length) {
      const children = await tx
        .select()
        .from(items)
        .where(
          and(
            eq(items.projectId, input.projectId),
            eq(items.archived, false),
            inArray(items.id, ids),
          ),
        )
      for (const value of children) {
        byId.set(value.id, value)
        queue.push(value.id)
      }
    }
  }
  for (const id of [...input.selection, ...input.protectedIds])
    if (!allowed.has(id) || !byId.has(id)) throw inaccessible()
  const selection = input.selection.length
    ? input.selection
    : source.document.kind === 'piece' || source.document.kind === 'representation'
      ? [...allowed].filter((id) => id !== source.id)
      : []
  if (selection.length > 100)
    throw new WorkspaceError('CONTEXT_TOO_LARGE', 'Selecione uma parte menor da peça')
  const selected = [...new Set(selection)]
    .map((id) => byId.get(id))
    .filter((row) => row !== undefined)
  const directions = await tx
    .select()
    .from(items)
    .where(
      and(
        eq(items.projectId, input.projectId),
        eq(items.archived, false),
        eq(items.kind, 'direction'),
        sql`coalesce(${items.document}->>'status','current')='current'`,
      ),
    )
    .orderBy(desc(items.updatedAt), asc(items.id))
    .limit(5)
  const evidenceIds = new Set<string>()
  for (const row of [source, ...ancestors, ...selected, ...directions]) {
    if (row.document.kind === 'video')
      for (const source of demonstrationSources(row.document.timeline))
        evidenceIds.add(source.evidenceId)
    if (
      row.document.kind === 'piece' ||
      row.document.kind === 'analysis' ||
      row.document.kind === 'watchlist'
    )
      for (const id of row.document.evidenceIds) evidenceIds.add(id)
    if (row.document.kind === 'direction')
      for (const id of row.document.referenceIds) evidenceIds.add(id)
  }
  const evidence = evidenceIds.size
    ? await tx
        .select()
        .from(items)
        .where(
          and(
            eq(items.projectId, input.projectId),
            eq(items.archived, false),
            eq(items.kind, 'evidence'),
            inArray(items.id, [...evidenceIds]),
          ),
        )
        .orderBy(asc(items.id))
    : []
  if (evidence.length > 30)
    throw new WorkspaceError(
      'CONTEXT_TOO_LARGE',
      'Selecione uma parte menor da peça para este pedido',
    )
  const related = [source, ...ancestors, ...selected, ...directions, ...evidence]
  const memory = await tx
    .select()
    .from(items)
    .where(
      and(
        eq(items.projectId, input.projectId),
        eq(items.archived, false),
        eq(items.kind, 'analysis'),
        sql`${items.document}->>'analysisType' in ('summary','decision')`,
        sql`exists (select 1 from jsonb_array_elements(coalesce(${items.document}->'basis','[]'::jsonb)) b
      where b->>'entityId' in (${sql.join(
        related.map((row) => sql`${row.id}`),
        sql`, `,
      )}))`,
        sql`not exists (select 1 from jsonb_array_elements(coalesce(${items.document}->'basis','[]'::jsonb)) b
      left join marketing.editorial_items origin on origin.id::text=b->>'entityId'
        and origin.project_id=${input.projectId}
      where origin.id is null or origin.archived or origin.kind='analysis' or origin.revision_id::text<>b->>'revisionId')`,
      ),
    )
    .orderBy(desc(items.updatedAt), asc(items.id))
    .limit(5)
  const needed = [...related, ...memory]
  const assetIds = [...new Set(needed.flatMap((row) => references(row.document).assets))].sort()
  if (assetIds.length > 100)
    throw new WorkspaceError(
      'CONTEXT_TOO_LARGE',
      'Selecione uma parte com até 100 arquivos de referência',
    )
  const assetRows = assetIds.length
    ? await tx
        .select({ manifest: assets.manifest })
        .from(assets)
        .where(
          and(
            eq(assets.projectId, input.projectId),
            eq(assets.confirmed, true),
            inArray(assets.id, assetIds),
          ),
        )
        .orderBy(asc(assets.id))
    : []
  if (assetRows.length !== assetIds.length) throw inaccessible()
  const revisionRows = await tx
    .select()
    .from(revisions)
    .where(
      and(
        eq(revisions.projectId, input.projectId),
        inArray(revisions.id, [...new Set(needed.map((row) => row.revisionId))]),
      ),
    )
  const byRevision = new Map(
    revisionRows.map((row) => [
      row.id,
      revisionSchema.parse({ ...row, createdAt: row.createdAt.toISOString() }),
    ]),
  )
  const revision = (id: string) => {
    const found = byRevision.get(id)
    if (!found) throw new Error('Revisão editorial ausente')
    return found
  }
  const context = executionContextSchema.parse({
    schemaVersion: 1,
    source: revision(source.revisionId),
    ancestors: ancestors.map((row) => revision(row.revisionId)),
    selected: selected.map((row) => revision(row.revisionId)),
    directions: directions.map((row) => revision(row.revisionId)),
    evidence: evidence.map((row) => revision(row.revisionId)),
    memory: memory.map((row) => revision(row.revisionId)),
    ...(basis.length ? { basis } : {}),
    // Omit the additive field for contexts without media to preserve their v1 hashes.
    ...(assetRows.length ? { assets: assetRows.map((row) => row.manifest) } : {}),
    protectedIds: [...new Set(input.protectedIds)].sort(),
  })
  if (Buffer.byteLength(canonicalJson(context)) > 240000)
    throw new WorkspaceError(
      'CONTEXT_TOO_LARGE',
      'O contexto excede o limite. Selecione slides ou cenas para trabalhar por partes.',
    )
  return { context, hash: hash(context) }
}
async function view(tx: WorkspaceTransaction, run: RunRow, now: Date): Promise<ExecutionRun> {
  const [attempt] = run.currentAttemptId
    ? await tx.select().from(attempts).where(eq(attempts.id, run.currentAttemptId))
    : []
  return runViewSchema.parse({
    request: run.request,
    context: run.context,
    state: run.state,
    epoch: run.epoch,
    createdBy: run.createdBy,
    createdAt: run.createdAt.toISOString(),
    outcome: run.outcome,
    application: run.application,
    leaseExpired: run.state === 'running' && Boolean(attempt && attempt.leaseExpiresAt <= now),
    attempt: attempt
      ? {
          schemaVersion: 1,
          id: attempt.id,
          runId: attempt.runId,
          deviceId: attempt.deviceId,
          epoch: attempt.epoch,
          leaseExpiresAt: attempt.leaseExpiresAt.toISOString(),
          state: attempt.state,
          checkpoint: attempt.checkpoint,
        }
      : null,
  })
}
async function getRun(tx: WorkspaceTransaction, projectId: string, id: string) {
  const [run] = await tx
    .select()
    .from(runs)
    .where(and(eq(runs.projectId, projectId), eq(runs.id, id)))
    .for('update')
  if (!run) throw inaccessible()
  return run
}
async function saveReceipt(
  tx: WorkspaceTransaction,
  actorId: string,
  run: RunRow,
  operationId: string,
  payloadHash: string,
  now: Date,
) {
  const result = await view(tx, run, now)
  await tx
    .insert(receipts)
    .values({ projectId: run.projectId, actorId, operationId, hash: payloadHash, result })
  return result
}
async function activeLease(
  tx: WorkspaceTransaction,
  run: RunRow,
  actorId: string,
  deviceId: string,
  input: { attemptId: string; epoch: number },
  now: Date,
) {
  if (
    (run.request.assignedTo ?? run.createdBy) !== actorId ||
    run.state !== 'running' ||
    run.epoch !== input.epoch ||
    run.currentAttemptId !== input.attemptId
  )
    throw expired()
  const [attempt] = await tx
    .select()
    .from(attempts)
    .where(
      and(
        eq(attempts.id, input.attemptId),
        eq(attempts.runId, run.id),
        eq(attempts.deviceId, deviceId),
      ),
    )
    .for('update')
  if (attempt?.state !== 'running' || attempt.leaseExpiresAt <= now || attempt.deadline <= now)
    throw expired()
  return attempt
}
export class DrizzleExecutionRepository implements ExecutionRepository {
  constructor(private readonly db: Database) {}
  private async applyProposal(
    tx: WorkspaceTransaction,
    actorId: string,
    run: RunRow,
    variantIndex: number,
  ) {
    if (run.application) return run
    const current = await view(tx, run, await serverTime(tx))
    if (current.state !== 'succeeded')
      throw new WorkspaceError('INVALID_RESULT', 'A produção ainda não terminou')
    let batch: EditorialBatch | undefined
    let error: EditorialApplication['error'] = null
    try {
      const ids =
        current.request.capability === 'composition' && current.outcome?.status === 'succeeded'
          ? current.outcome.assetIds
          : []
      const produced = ids.length
        ? await tx
            .select({ manifest: assets.manifest })
            .from(assets)
            .where(
              and(
                eq(assets.projectId, run.projectId),
                inArray(assets.id, ids),
                eq(assets.confirmed, true),
              ),
            )
        : []
      batch = await editorialBatch(
        current,
        variantIndex,
        produced.map((asset) => asset.manifest),
      )
    } catch (failure) {
      if (!(failure instanceof WorkspaceError || failure instanceof z.ZodError)) throw failure
      error = {
        code: failure instanceof WorkspaceError ? failure.code : 'INVALID_RESULT',
        message: failure.message.slice(0, 1000),
      }
    }
    const result = batch
      ? await new DrizzleWorkspaceRepository(this.db).applyBatchInTransaction(
          tx,
          actorId,
          batch,
          hash(batch),
          frozenRevisions(current),
        )
      : null
    const application: EditorialApplication = { variantIndex, result, undo: null, error }
    const [updated] = await tx
      .update(runs)
      .set({ application })
      .where(eq(runs.id, run.id))
      .returning()
    if (!updated) throw inaccessible()
    await recordChange(tx, run.projectId, actorId, 'execution', run.id, null)
    return updated
  }
  apply(actorId: string, projectId: string, id: string, variantIndex: number) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'edit')
      const run = await getRun(tx, projectId, id)
      if (run.application && run.application.variantIndex !== variantIndex)
        throw new WorkspaceError(
          'VALIDATION_ERROR',
          'Outra alternativa deste pedido já foi escolhida',
        )
      return view(
        tx,
        await this.applyProposal(tx, actorId, run, variantIndex),
        await serverTime(tx),
      )
    })
  }
  undo(actorId: string, projectId: string, id: string) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'edit')
      const run = await getRun(tx, projectId, id),
        application = run.application
      if (application?.result?.status !== 'applied')
        throw new WorkspaceError('VALIDATION_ERROR', 'Não há alteração aplicada para desfazer')
      if (application.undo) return view(tx, run, await serverTime(tx))
      const applied = await tx
        .select()
        .from(revisions)
        .where(
          and(
            eq(revisions.projectId, projectId),
            inArray(
              revisions.id,
              application.result.items.map((item) => item.revisionId),
            ),
          ),
        )
      const parents = applied.flatMap((revision) =>
        revision.parentRevisionId ? [revision.parentRevisionId] : [],
      )
      const originals = parents.length
        ? await tx
            .select()
            .from(revisions)
            .where(and(eq(revisions.projectId, projectId), inArray(revisions.id, parents)))
        : []
      const changes: EditorialBatch['changes'] = application.result.items.map((item) => {
        const revision = applied.find((revision) => revision.id === item.revisionId)
        if (!revision) throw new Error('Revisão aplicada ausente')
        const original = originals.find((original) => original.id === revision.parentRevisionId)
        if (revision.parentRevisionId && !original) throw new Error('Revisão anterior ausente')
        return original
          ? {
              entityId: item.id,
              baseRevisionId: item.revisionId,
              action: 'save',
              document: original.document,
            }
          : { entityId: item.id, baseRevisionId: item.revisionId, action: 'archive' }
      })
      const batch: EditorialBatch = {
        schemaVersion: 1,
        projectId,
        operationId: await stableEditorialId(`${projectId}:undo:${id}`),
        changes,
      }
      const undo = await new DrizzleWorkspaceRepository(this.db).applyBatchInTransaction(
        tx,
        actorId,
        batch,
        hash(batch),
      )
      const [updated] = await tx
        .update(runs)
        .set({ application: { ...application, undo } })
        .where(eq(runs.id, id))
        .returning()
      if (!updated) throw inaccessible()
      await recordChange(tx, projectId, actorId, 'execution', id, null)
      return view(tx, updated, await serverTime(tx))
    })
  }
  context(actorId: string, input: ContextRequest) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, input.projectId, 'read')
      return loadContext(tx, input)
    })
  }
  create(actorId: string, input: ExecutionRequest, payloadHash: string) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, input.projectId, 'execute')
      const saved = await receipt(tx, input.projectId, actorId, input.operationId, payloadHash)
      if (saved) return runViewSchema.parse(saved.result)
      const frozen = await loadContext(tx, input)
      if (input.assignedTo) await projectAccess(tx, input.assignedTo, input.projectId, 'execute')
      if (frozen.hash !== input.contextHash) throw contextChanged()
      validateVisualRequest(input, frozen.context)
      if (input.capability.startsWith('image') && input.provider !== 'codex')
        throw new WorkspaceError('VALIDATION_ERROR', 'Imagens exigem o cliente Codex conectado')
      const [run] = await tx
        .insert(runs)
        .values({
          id: input.id,
          projectId: input.projectId,
          request: input,
          context: frozen.context,
          state: 'queued',
          createdBy: actorId,
        })
        .onConflictDoNothing()
        .returning()
      if (!run)
        throw new WorkspaceError('OPERATION_REUSED', 'Identificador de trabalho já utilizado')
      await recordChange(tx, input.projectId, actorId, 'execution', run.id, null)
      return saveReceipt(tx, actorId, run, input.operationId, payloadHash, await serverTime(tx))
    })
  }
  list(actorId: string, projectId: string, query: RunListQuery) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'read')
      const rows = await tx
        .select()
        .from(runs)
        .where(
          and(
            eq(runs.projectId, projectId),
            query.entityId
              ? sql`(${runs.request}->>'entityId'=${query.entityId} or ${runs.application}->'result'->'items' @> ${JSON.stringify([{ id: query.entityId }])}::jsonb)`
              : undefined,
            query.before
              ? sql`(${runs.createdAt},${runs.id}) < (select prior.created_at,prior.id from marketing.editorial_runs prior where prior.id=${query.before} and prior.project_id=${projectId})`
              : undefined,
          ),
        )
        .orderBy(desc(runs.createdAt), desc(runs.id))
        .limit(21)
      const now = await serverTime(tx)
      const page = rows.slice(0, 20)
      return {
        items: await Promise.all(page.map((run) => view(tx, run, now))),
        nextCursor: rows.length > 20 ? (page.at(-1)?.id ?? null) : null,
      }
    })
  }
  get(actorId: string, projectId: string, id: string) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'read')
      return view(tx, await getRun(tx, projectId, id), await serverTime(tx))
    })
  }
  claim(
    actorId: string,
    deviceId: string,
    projectId: string,
    id: string,
    input: ClaimRun,
    payloadHash: string,
  ) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'execute')
      const run = await getRun(tx, projectId, id)
      if ((run.request.assignedTo ?? run.createdBy) !== actorId) throw inaccessible()
      const saved = await receipt(tx, projectId, actorId, input.operationId, payloadHash)
      if (saved) return runViewSchema.parse(saved.result)
      const now = await serverTime(tx),
        current = await view(tx, run, now)
      if (
        run.epoch !== input.expectedEpoch ||
        ['canceled', 'succeeded'].includes(run.state) ||
        (run.state === 'running' && !current.leaseExpired)
      )
        throw expired()
      if (run.epoch > 0 && !input.retry)
        throw new WorkspaceError(
          'RETRY_REQUIRES_USER',
          'Confira o resultado anterior antes de tentar novamente',
        )
      if (run.epoch >= 3)
        throw new WorkspaceError(
          'ATTEMPTS_EXHAUSTED',
          'Este trabalho atingiu três tentativas. Revise o pedido antes de criar outro.',
        )
      if ((await loadContext(tx, run.request)).hash !== run.request.contextHash)
        throw contextChanged()
      if (current.attempt && current.leaseExpired)
        await tx
          .update(attempts)
          .set({
            state: 'failed',
            outcome: {
              status: 'failed',
              code: 'TIMEOUT',
              message: 'A concessão da tentativa expirou',
            },
          })
          .where(eq(attempts.id, current.attempt.id))
      const attemptId = randomUUID(),
        epoch = run.epoch + 1,
        deadline = new Date(now.getTime() + run.request.limits.timeoutMs)
      await tx.insert(attempts).values({
        id: attemptId,
        runId: id,
        epoch,
        deviceId,
        state: 'running',
        startedAt: now,
        deadline,
        leaseExpiresAt: new Date(Math.min(now.getTime() + 90000, deadline.getTime())),
        checkpoint: {
          phase: 'working',
          stage: 'Preparando execução',
          artifactIds: [],
          progress: 0,
          inputTokens: null,
          outputTokens: null,
        },
      })
      const [updated] = await tx
        .update(runs)
        .set({ epoch, state: 'running', currentAttemptId: attemptId, outcome: null })
        .where(eq(runs.id, id))
        .returning()
      if (!updated) throw inaccessible()
      await recordChange(tx, projectId, actorId, 'execution', id, null)
      return saveReceipt(tx, actorId, updated, input.operationId, payloadHash, now)
    })
  }
  heartbeat(
    actorId: string,
    deviceId: string,
    projectId: string,
    id: string,
    input: Heartbeat,
    payloadHash: string,
  ) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'execute')
      const run = await getRun(tx, projectId, id)
      if ((run.request.assignedTo ?? run.createdBy) !== actorId) throw inaccessible()
      const saved = await receipt(tx, projectId, actorId, input.operationId, payloadHash)
      if (saved) return runViewSchema.parse(saved.result)
      const now = await serverTime(tx),
        attempt = await activeLease(tx, run, actorId, deviceId, input, now)
      const before = attempt.checkpoint.phase ?? 'working',
        after = input.checkpoint.phase
      const phases = ['working', 'transferring', 'finalizing']
      if (phases.indexOf(after) < phases.indexOf(before))
        throw new WorkspaceError(
          'VALIDATION_ERROR',
          'Uma tentativa não pode voltar à geração depois de iniciar o envio',
        )
      // A single bounded transfer window; repeated heartbeats cannot extend it indefinitely.
      const deadline =
        before === 'working' && after === 'transferring'
          ? new Date(now.getTime() + 30 * 60 * 1000)
          : attempt.deadline
      await tx
        .update(attempts)
        .set({
          checkpoint: input.checkpoint,
          deadline,
          leaseExpiresAt: new Date(Math.min(now.getTime() + 90000, deadline.getTime())),
        })
        .where(eq(attempts.id, attempt.id))
      await recordChange(tx, projectId, actorId, 'execution', id, null)
      return saveReceipt(tx, actorId, run, input.operationId, payloadHash, now)
    })
  }
  finish(
    actorId: string,
    deviceId: string,
    projectId: string,
    id: string,
    input: FinishRun,
    payloadHash: string,
  ) {
    return this.db.transaction(async (tx) => {
      const access = await projectAccess(tx, actorId, projectId, 'execute')
      const run = await getRun(tx, projectId, id)
      if ((run.request.assignedTo ?? run.createdBy) !== actorId) throw inaccessible()
      const saved = await receipt(tx, projectId, actorId, input.operationId, payloadHash)
      if (saved) return runViewSchema.parse(saved.result)
      const now = await serverTime(tx),
        attempt = await activeLease(tx, run, actorId, deviceId, input, now)
      validateOutcomeCapability(run.request, input.outcome)
      if (
        run.request.capability === 'copy' &&
        run.context.source.document.kind === 'analysis' &&
        input.outcome.status === 'succeeded' &&
        !input.outcome.editorial
      )
        throw new WorkspaceError(
          'INVALID_RESULT',
          'A análise precisa de uma proposta editorial estruturada',
        )
      if (input.outcome.status === 'succeeded' && input.outcome.capture) {
        const capture = input.outcome.capture
        const [source] = await tx
          .select({ manifest: assets.manifest })
          .from(assets)
          .where(
            and(
              eq(assets.id, capture.sourceAssetId),
              eq(assets.projectId, projectId),
              eq(assets.confirmed, true),
            ),
          )
        if (
          !source ||
          source.manifest.sha256 !== capture.sourceSha256 ||
          source.manifest.mime !== 'application/json'
        )
          throw new WorkspaceError(
            'INVALID_RESULT',
            'A origem da captura não corresponde ao projeto confirmado',
          )
      }
      if (input.outcome.status === 'succeeded' && input.outcome.assetIds.length) {
        const ids = [...new Set(input.outcome.assetIds)]
        const confirmed = await tx
          .select({ id: assets.id, manifest: assets.manifest })
          .from(assets)
          .where(
            and(
              eq(assets.projectId, projectId),
              inArray(assets.id, ids),
              eq(assets.confirmed, true),
            ),
          )
        if (confirmed.length !== ids.length)
          throw new WorkspaceError(
            'ASSET_UNCONFIRMED',
            'O resultado ainda tem arquivos pendentes de envio',
          )
        const completed = await view(tx, { ...run, outcome: input.outcome }, now)
        validateRecordingAssets(
          completed,
          confirmed.map((asset) => asset.manifest),
        )
        await validateRenderResult(
          completed,
          confirmed.map((asset) => asset.manifest),
        )
        if (run.request.capability === 'composition') {
          for (let index = 0; index < (input.outcome.video?.variants.length ?? 0); index++)
            await editorialBatch(
              completed,
              index,
              confirmed.map((asset) => asset.manifest),
            )
        }
      }
      if (
        input.outcome.status === 'succeeded' &&
        input.outcome.render &&
        !input.outcome.assetIds.includes(input.outcome.render.outputAssetId)
      )
        throw new WorkspaceError('INVALID_RESULT', 'O resultado não inclui o arquivo do render')
      await tx
        .update(attempts)
        .set({ state: input.outcome.status, outcome: input.outcome })
        .where(eq(attempts.id, attempt.id))
      const [updated] = await tx
        .update(runs)
        .set({ state: input.outcome.status, outcome: input.outcome })
        .where(eq(runs.id, id))
        .returning()
      if (!updated) throw inaccessible()
      await recordChange(tx, projectId, actorId, 'execution', id, null)
      const applied =
        access.permissions.includes('edit') &&
        input.outcome.status === 'succeeded' &&
        (input.outcome.editorial || input.outcome.art || input.outcome.video) &&
        run.request.intent !== 'alternatives'
          ? await this.applyProposal(tx, actorId, updated, 0)
          : updated
      return saveReceipt(tx, actorId, applied, input.operationId, payloadHash, now)
    })
  }
  cancel(actorId: string, projectId: string, id: string, operationId: string, payloadHash: string) {
    return this.db.transaction(async (tx) => {
      const access = await projectAccess(tx, actorId, projectId, 'execute'),
        run = await getRun(tx, projectId, id)
      if (
        run.createdBy !== actorId &&
        run.request.assignedTo !== actorId &&
        !access.permissions.includes('admin')
      )
        throw inaccessible()
      const saved = await receipt(tx, projectId, actorId, operationId, payloadHash)
      if (saved) return runViewSchema.parse(saved.result)
      const now = await serverTime(tx)
      if (run.state === 'succeeded')
        throw new WorkspaceError('VALIDATION_ERROR', 'O trabalho já foi concluído')
      if (run.currentAttemptId)
        await tx
          .update(attempts)
          .set({ state: 'canceled' })
          .where(eq(attempts.id, run.currentAttemptId))
      const [updated] = await tx
        .update(runs)
        .set({ state: 'canceled' })
        .where(eq(runs.id, id))
        .returning()
      if (!updated) throw inaccessible()
      await recordChange(tx, projectId, actorId, 'execution', id, null)
      return saveReceipt(tx, actorId, updated, operationId, payloadHash, now)
    })
  }
}
