import { randomUUID } from 'node:crypto'
import type { StudioAiActor } from '@sistemazero/core/ai-credits'
import {
  appendStudioProAssistanceEvent,
  applyStudioProChange,
  createStudioProAssistanceJournal,
  STUDIO_PRO_BUILDER_LIMITS as limits,
  parseStudioProAssistanceRequest,
  STUDIO_PRO_ASSISTANCE_LIMITS,
  type StudioProBuilderClaim,
  type StudioProBuilderCommand,
  type StudioProBuilderJob,
  type StudioProBuilderPage,
  type StudioProBuilderPreview,
  type StudioProBuilderRepository,
  type StudioProRevision,
  studioProBuilderView,
  studioProChangeScopeIssue,
} from '@sistemazero/core/studio'
import { verifyStudioPythonBuilderPreview } from '@sistemazero/core/studio/python-builder-preview'
import { and, desc, eq, gt, inArray, lt, or, sql } from 'drizzle-orm'
import { StudioBuilderConflictError } from '../../../domain/studio-pro/studio-builder.errors'
import type { Database } from './db'
import {
  adultStudioBuilderProjectDeletions,
  studioBuilderJobs as jobs,
  studioBuilderProjectDeletions as kidsDeletions,
  studioAiAttempts,
  studioAiRuns,
} from './schema'
import { lockStudioAiAccount } from './studio-ai-account.repository'

type Row = typeof jobs.$inferSelect
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
const terminal = new Set(['review', 'failed', 'cancelled'])
const journalFor = (row: Row) =>
  row.assistance ?? createStudioProAssistanceJournal(undefined, row.createdAt.toISOString())
const clearPreviewError = (row: Row) => {
  const { previewError: _error, ...journal } = journalFor(row)
  return journal
}
const requestIdentity = (
  request: import('@sistemazero/core/studio').StudioProAssistanceRequest | undefined,
) =>
  JSON.stringify(
    parseStudioProAssistanceRequest(
      request ?? { version: 1, intent: 'change', scope: 'part', criteria: [] },
    ),
  )
function verifiedEvidence(
  evidence: import('@sistemazero/core/studio').StudioProBuilderEvidence[],
  preview?: StudioProBuilderPreview,
): boolean {
  const required =
    preview?.kind === 'python' && !preview.validation.report.execution?.capture
      ? ['types', 'build', 'playtest']
      : ['types', 'build', 'playtest', 'capture']
  return (
    evidence.length === required.length &&
    required.every(
      (kind) =>
        evidence.filter((item) => item.kind === kind && item.status === 'passed').length === 1,
    )
  )
}
const owned = (actor: StudioAiActor, projectId: string) =>
  and(
    eq(jobs.accountId, actor.accountId),
    eq(jobs.userId, actor.userId),
    eq(jobs.audience, actor.audience ?? 'kids'),
    eq(jobs.projectId, projectId),
  )!
async function view(tx: Transaction, row: Row): Promise<StudioProBuilderJob> {
  const {
    accountId: _account,
    audience: _audience,
    userId: _user,
    leaseToken: _token,
    binaries: _binaries,
    execution: _execution,
    ...job
  } = row
  // The ledger remains authoritative even if cancellation wins a race with a late model response.
  const [run] = await tx
    .select({ source: studioAiRuns.source })
    .from(studioAiRuns)
    .where(
      and(
        eq(studioAiRuns.id, row.id),
        eq(studioAiRuns.accountId, row.accountId),
        eq(studioAiRuns.userId, row.userId),
        eq(studioAiRuns.audience, row.audience),
      ),
    )
  if (run) {
    const attempts = await tx
      .select({ status: studioAiAttempts.status, cost: studioAiAttempts.actualMicroUsd })
      .from(studioAiAttempts)
      .where(eq(studioAiAttempts.runId, row.id))
    job.cost = {
      source: run.source,
      confirmedMicroUsd: attempts.reduce(
        (sum, attempt) => sum + (attempt.status === 'confirmed' ? (attempt.cost ?? 0) : 0),
        0,
      ),
      uncertain: attempts.some(
        (attempt) => attempt.status === 'dispatched' || attempt.status === 'uncertain',
      ),
    }
  }
  return {
    ...job,
    createdAt: row.createdAt.toISOString(),
    deadlineAt: row.deadlineAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    leaseUntil: row.leaseUntil?.toISOString() ?? null,
  }
}

/** Account lock is acquired before any job/ledger access, matching deletion and quota lock order. */
export class DrizzleStudioBuilderRepository implements StudioProBuilderRepository {
  constructor(
    private readonly db: Database,
    private readonly pythonPreviewServiceOrigin?: string,
    private readonly clock: () => Date = () => new Date(),
  ) {}
  private assertPythonAcceptanceLease(row: Row, preview?: StudioProBuilderPreview) {
    if (row.base.version !== 2 || row.base.configuration.programmingLanguage !== 'python') return
    const now = this.clock().getTime()
    if (
      !Number.isFinite(now) ||
      !row.leaseUntil ||
      row.leaseUntil.getTime() <= now ||
      row.expiresAt.getTime() <= now ||
      (row.phase === 'validating' && row.deadlineAt.getTime() <= now) ||
      (preview?.kind === 'python' && preview.reference.expiresAt <= now)
    )
      throw new StudioBuilderConflictError(
        'O prazo de validação Python terminou antes do aceite da proposta.',
      )
  }
  private async verifyPreview(
    row: Row,
    candidate: StudioProRevision,
    preview: StudioProBuilderPreview,
    evidence: import('@sistemazero/core/studio').StudioProBuilderEvidence[],
    now: Date,
  ) {
    const python =
      candidate.version === 2 && candidate.configuration.programmingLanguage === 'python'
    if ((preview.kind === 'python') !== python || preview.revisionHash !== candidate.hash)
      throw new StudioBuilderConflictError(
        'A prévia não pertence à revisão e à linguagem da proposta.',
      )
    if (preview.kind === 'python') {
      if (!this.pythonPreviewServiceOrigin)
        throw new StudioBuilderConflictError('O serviço de prévia Python não está configurado.')
      await verifyStudioPythonBuilderPreview(preview, candidate, row.binaries, {
        serviceOrigin: this.pythonPreviewServiceOrigin,
        parentOrigin: row.execution.parentOrigin,
        now: now.getTime(),
      })
      const capture = evidence.find((item) => item.kind === 'capture')
      if (
        (preview.validation.report.execution?.capture
          ? capture?.artifactUrl !== new URL('python-playtest.png', preview.reference.url).href
          : capture !== undefined) ||
        evidence.some((item) => item.kind !== 'capture' && item.artifactUrl !== undefined)
      )
        throw new StudioBuilderConflictError(
          'A captura não corresponde à execução Python da proposta.',
        )
    } else if (
      preview.artifact.expiresAt <= now.getTime() ||
      evidence.find((item) => item.kind === 'capture')?.artifactUrl !==
        new URL('__studio-proof.png', preview.artifact.url).href
    )
      throw new StudioBuilderConflictError(
        'A captura não pertence a uma prévia verificada disponível.',
      )
  }
  async pendingExecutions(now: Date, limit: number) {
    const count = Math.min(20, Math.max(1, limit))
    const columns = {
      id: jobs.id,
      projectId: jobs.projectId,
      accountId: jobs.accountId,
      userId: jobs.userId,
      audience: jobs.audience,
      execution: jobs.execution,
    }
    const [active, unfinished] = await Promise.all([
      this.db
        .select(columns)
        .from(jobs)
        .where(
          and(
            inArray(jobs.phase, ['queued', 'generating', 'validating']),
            gt(jobs.expiresAt, now),
            or(sql`${jobs.leaseUntil} is null`, lt(jobs.leaseUntil, now), lt(jobs.deadlineAt, now)),
          ),
        )
        .orderBy(jobs.deadlineAt, jobs.id)
        .limit(count),
      this.db
        .select(columns)
        .from(jobs)
        .where(
          and(
            inArray(jobs.phase, ['review', 'failed', 'cancelled']),
            gt(jobs.expiresAt, now),
            sql`exists (select 1 from ${studioAiRuns} where ${studioAiRuns.id} = ${jobs.id} and ${studioAiRuns.finishedAt} is null)`,
          ),
        )
        .orderBy(jobs.deadlineAt, jobs.id)
        .limit(count),
    ])
    // Alternate execution and settlement so either queue can progress under load.
    const rows = Array.from({ length: count }, (_, index) => [active[index], unfinished[index]])
      .flat()
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .slice(0, count)
    return rows.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      parentOrigin: row.execution.parentOrigin,
      actor: {
        accountId: row.accountId,
        userId: row.userId,
        privileged: row.execution.privileged,
        ...(row.audience === 'adult' ? { audience: 'adult' as const } : {}),
      },
    }))
  }
  list(
    actor: StudioAiActor,
    input: { projectId: string; before?: string },
    now: Date,
  ): Promise<StudioProBuilderPage> {
    const cursor = input.before?.match(
      /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\|([a-f0-9-]{36})$/,
    )
    if (
      input.before &&
      (!cursor ||
        !Number.isFinite(Date.parse(cursor[1]!)) ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(cursor[2]!))
    )
      throw new StudioBuilderConflictError('O cursor de propostas é inválido. Reabra o histórico.')
    return this.db.transaction(async (tx) => {
      await lockStudioAiAccount(tx, actor.accountId)
      const rows = await tx
        .select()
        .from(jobs)
        .where(
          and(
            owned(actor, input.projectId),
            gt(jobs.expiresAt, now),
            cursor
              ? or(
                  lt(jobs.createdAt, new Date(cursor[1]!)),
                  and(eq(jobs.createdAt, new Date(cursor[1]!)), lt(jobs.id, cursor[2]!)),
                )
              : undefined,
          ),
        )
        .orderBy(desc(jobs.createdAt), desc(jobs.id))
        .limit(STUDIO_PRO_ASSISTANCE_LIMITS.pageSize + 1)
      const page = rows.slice(0, STUDIO_PRO_ASSISTANCE_LIMITS.pageSize)
      const last = page.at(-1)
      return {
        jobs: await Promise.all(page.map(async (row) => studioProBuilderView(await view(tx, row)))),
        nextCursor:
          rows.length > page.length && last ? `${last.createdAt.toISOString()}|${last.id}` : null,
      }
    })
  }
  /** Bounded physical retention, independent of the family returning to create another job. */
  purgeExpired(now: Date): Promise<number> {
    return this.db.transaction(async (tx) => {
      for (const deletions of [kidsDeletions, adultStudioBuilderProjectDeletions]) {
        const expiredFences = await tx
          .select()
          .from(deletions)
          .where(lt(deletions.expiresAt, now))
          .orderBy(deletions.expiresAt)
          .limit(100)
          .for('update', { skipLocked: true })
        if (expiredFences.length)
          await tx
            .delete(deletions)
            .where(
              or(
                ...expiredFences.map((item) =>
                  and(
                    eq(deletions.accountId, item.accountId),
                    eq(deletions.userId, item.userId),
                    eq(deletions.projectId, item.projectId),
                  ),
                ),
              ),
            )
      }
      const expired = await tx
        .select({ id: jobs.id })
        .from(jobs)
        .where(lt(jobs.expiresAt, now))
        .orderBy(jobs.expiresAt, jobs.id)
        .limit(100)
        .for('update', { skipLocked: true })
      if (!expired.length) return 0
      const deleted = await tx
        .delete(jobs)
        .where(
          inArray(
            jobs.id,
            expired.map((job) => job.id),
          ),
        )
        .returning({ id: jobs.id })
      return deleted.length
    })
  }
  execute(
    actor: StudioAiActor,
    command: StudioProBuilderCommand,
    now: Date,
    signal?: AbortSignal,
  ): Promise<StudioProBuilderClaim | null> {
    signal?.throwIfAborted()
    return this.db.transaction(async (tx) => {
      await lockStudioAiAccount(tx, actor.accountId, signal)
      signal?.throwIfAborted()
      const deletions =
        actor.audience === 'adult' ? adultStudioBuilderProjectDeletions : kidsDeletions
      const projectId = command.operation === 'create' ? command.base.projectId : command.projectId
      const deletedProject = and(
        eq(deletions.accountId, actor.accountId),
        eq(deletions.userId, actor.userId),
        eq(deletions.projectId, projectId),
      )
      if (command.operation === 'remove-project') {
        // Owner-scoped and idempotent. The financial ledger retains real dispatched usage.
        await tx
          .delete(deletions)
          .where(and(eq(deletions.accountId, actor.accountId), lt(deletions.expiresAt, now)))
        const [total] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(deletions)
          .where(eq(deletions.accountId, actor.accountId))
        const [existing] = await tx.select().from(deletions).where(deletedProject).limit(1)
        if (!existing && (total?.count ?? 0) >= 1000)
          throw new StudioBuilderConflictError(
            'A limpeza de projetos atingiu o limite temporário. A solicitação pode ser retomada mais tarde.',
          )
        await tx
          .insert(deletions)
          .values({
            accountId: actor.accountId,
            userId: actor.userId,
            projectId,
            expiresAt: new Date(now.getTime() + limits.retentionMs),
          })
          .onConflictDoNothing()
        await tx.delete(jobs).where(owned(actor, projectId))
        return null
      }
      if (command.operation === 'create') {
        const [removed] = await tx
          .select()
          .from(deletions)
          .where(and(deletedProject, gt(deletions.expiresAt, now)))
          .limit(1)
        if (removed)
          throw new StudioBuilderConflictError(
            'Este projeto foi excluído. Crie um novo projeto para fazer outro pedido.',
          )
        await tx
          .delete(jobs)
          .where(and(eq(jobs.accountId, actor.accountId), lt(jobs.expiresAt, now)))
        const [existing] = await tx.select().from(jobs).where(eq(jobs.id, command.id))
        if (existing) {
          if (
            existing.accountId !== actor.accountId ||
            existing.userId !== actor.userId ||
            existing.audience !== (actor.audience ?? 'kids') ||
            existing.projectId !== projectId ||
            existing.objective !== command.objective ||
            existing.model !== command.model ||
            existing.base.hash !== command.base.hash ||
            existing.execution.parentOrigin !== command.parentOrigin ||
            existing.execution.privileged !== actor.privileged ||
            requestIdentity(existing.assistance?.request) !== requestIdentity(command.request)
          )
            throw new StudioBuilderConflictError()
          return { job: await view(tx, existing), token: null }
        }
        // Abandoned queued jobs still expire without requiring the original browser to return.
        const abandoned = await tx
          .select()
          .from(jobs)
          .where(
            and(
              eq(jobs.accountId, actor.accountId),
              lt(jobs.deadlineAt, now),
              sql`${jobs.phase} in ('queued','generating','validating')`,
            ),
          )
        for (const expired of abandoned)
          await tx
            .update(jobs)
            .set({
              phase: 'failed',
              leaseToken: null,
              leaseUntil: null,
              version: expired.version + 1,
              assistance: appendStudioProAssistanceEvent(
                journalFor(expired),
                'failed',
                now.toISOString(),
              ),
              error: 'O prazo total desta execução terminou. A revisão original foi preservada.',
            })
            .where(eq(jobs.id, expired.id))
        const [active] = await tx
          .select({ id: jobs.id })
          .from(jobs)
          .where(
            and(
              owned(actor, projectId),
              sql`${jobs.phase} in ('queued','generating','validating')`,
            ),
          )
          .limit(1)
        if (active)
          throw new StudioBuilderConflictError(
            'Já existe uma construção ativa neste projeto. Consulte ou cancele essa execução antes de iniciar outra.',
          )
        const retained = await tx
          .select({ phase: jobs.phase })
          .from(jobs)
          .where(eq(jobs.accountId, actor.accountId))
        if (retained.length >= limits.maxStoredPerAccount) {
          // Evict only the oldest finished job; active revisions are never discarded to make space.
          const [oldest] = await tx
            .select({ id: jobs.id })
            .from(jobs)
            .where(
              and(
                eq(jobs.accountId, actor.accountId),
                sql`${jobs.phase} in ('review','failed','cancelled')`,
              ),
            )
            .orderBy(jobs.createdAt)
            .limit(1)
          if (!oldest)
            throw new StudioBuilderConflictError(
              'Já existem execuções demais em andamento nesta família.',
            )
          await tx.delete(jobs).where(eq(jobs.id, oldest.id))
        }
        const [row] = await tx
          .insert(jobs)
          .values({
            id: command.id,
            execution: { parentOrigin: command.parentOrigin, privileged: actor.privileged },
            accountId: actor.accountId,
            userId: actor.userId,
            audience: actor.audience ?? 'kids',
            projectId,
            objective: command.objective,
            model: command.model,
            binaries: command.binaries,
            base: command.base,
            assistance: createStudioProAssistanceJournal(command.request, now.toISOString()),
            phase: 'queued',
            createdAt: now,
            deadlineAt: new Date(now.getTime() + limits.deadlineMs),
            expiresAt: new Date(now.getTime() + limits.retentionMs),
          })
          .onConflictDoNothing()
          .returning()
        if (!row) throw new StudioBuilderConflictError()
        return { job: await view(tx, row), token: null }
      }
      const [found] = await tx
        .select()
        .from(jobs)
        .where(
          and(
            owned(actor, projectId),
            gt(jobs.expiresAt, now),
            command.operation === 'latest' ? undefined : eq(jobs.id, command.id),
          ),
        )
        .orderBy(desc(jobs.createdAt))
        .limit(1)
      if (!found) return null
      // Authorization is strictly read-only, even for an expired generation. Keep
      // this before the expiry transition, which intentionally persists failures.
      if (command.operation === 'authorize-javascript')
        return { job: await view(tx, found), token: null }
      if (command.operation === 'authorize-generation') {
        if (
          found.phase !== 'generating' ||
          journalFor(found).disposition === 'discarded' ||
          command.token !== found.leaseToken ||
          command.version !== found.version ||
          !found.leaseUntil ||
          found.leaseUntil <= now ||
          found.deadlineAt <= now
        )
          throw new StudioBuilderConflictError('A autorização desta geração foi retirada.')
        const revision = found.result
          ? (await applyStudioProChange(found.base, found.result.change)).revision
          : found.base
        if (
          revision.hash !== command.revisionHash ||
          (found.result && found.result.revisionHash !== revision.hash) ||
          revision.version !== 2 ||
          revision.configuration.programmingLanguage !== 'python'
        )
          throw new StudioBuilderConflictError('A revisão não corresponde à geração Python.')
        signal?.throwIfAborted()
        return {
          job: await view(tx, found),
          token: null,
          binaries: found.binaries,
          generationLease: {
            revisionHash: revision.hash,
            parentOrigin: found.execution.parentOrigin,
          },
        }
      }
      let row = found
      const update = async (data: Partial<typeof jobs.$inferInsert>) => {
        signal?.throwIfAborted()
        const currentJournal = data.assistance ?? journalFor(row)
        const assistance = data.phase
          ? appendStudioProAssistanceEvent(currentJournal, data.phase, now.toISOString())
          : currentJournal
        const [updated] = await tx
          .update(jobs)
          .set({ ...data, assistance, version: row.version + 1 })
          .where(and(eq(jobs.id, row.id), eq(jobs.version, row.version)))
          .returning()
        if (!updated) throw new StudioBuilderConflictError()
        row = updated
      }
      if (
        !terminal.has(row.phase) &&
        (row.deadlineAt <= now ||
          (row.phase === 'generating' && row.leaseUntil && row.leaseUntil <= now))
      ) {
        await update({
          phase: 'failed',
          leaseToken: null,
          leaseUntil: null,
          error:
            row.phase === 'generating'
              ? 'A geração foi interrompida. Ela não será repetida automaticamente; consulte o consumo antes de iniciar outra.'
              : 'O prazo total desta execução terminou. A revisão original foi preservada.',
        })
        // Return the durable failure even for a late checkpoint. Throwing here would roll
        // back the expiry update and leave an interrupted generation looking active.
        return { job: await view(tx, row), token: null }
      }
      if (command.operation === 'get' || command.operation === 'latest')
        return { job: await view(tx, row), token: null }
      if (
        command.operation === 'authorize-validation' ||
        command.operation === 'authorize-proposal'
      ) {
        const validation = command.operation === 'authorize-validation'
        if (
          !(validation ? ['validating', 'review'].includes(row.phase) : row.phase === 'review') ||
          journalFor(row).disposition === 'discarded' ||
          command.version !== row.version ||
          (validation &&
            (command.token !== row.leaseToken || !row.leaseUntil || row.leaseUntil <= now)) ||
          !row.result
        )
          throw new StudioBuilderConflictError('A autorização desta validação foi retirada.')
        const candidate = await applyStudioProChange(row.base, row.result.change)
        if (
          candidate.revision.hash !== command.revisionHash ||
          candidate.revision.version !== 2 ||
          candidate.revision.configuration.programmingLanguage !== 'python'
        )
          throw new StudioBuilderConflictError('A revisão não corresponde à validação Python.')
        if (command.operation === 'authorize-proposal' && command.purpose === 'preview') {
          const preview = row.result.preview
          if (
            preview?.kind !== 'python' ||
            preview.reference.id !== command.preview?.id ||
            preview.reference.sha256 !== command.preview.sha256
          )
            throw new StudioBuilderConflictError('A prévia desta proposta mudou.')
          await this.verifyPreview(
            row,
            candidate.revision,
            preview,
            row.result.evidence,
            this.clock(),
          )
        }
        return {
          job: await view(tx, row),
          token: null,
          binaries: row.binaries,
          [validation ? 'validationLease' : 'proposalScope']: {
            revisionHash: candidate.revision.hash,
            parentOrigin: row.execution.parentOrigin,
          },
        }
      }
      if (command.operation === 'discard') {
        if (!terminal.has(row.phase))
          throw new StudioBuilderConflictError(
            'Cancele a execução antes de descartar sua proposta.',
          )
        if (row.assistance?.disposition === 'discarded')
          return { job: await view(tx, row), token: null }
        if (command.version !== row.version)
          throw new StudioBuilderConflictError(
            'A proposta mudou. Consulte a versão atual antes de descartá-la.',
          )
        await update({
          assistance: {
            ...appendStudioProAssistanceEvent(journalFor(row), 'discarded', now.toISOString()),
            disposition: 'discarded',
          },
          leaseToken: null,
          leaseUntil: null,
        })
        return { job: await view(tx, row), token: null }
      }
      if (command.operation === 'preview-claim') {
        if (row.phase !== 'review' || !row.result || journalFor(row).disposition === 'discarded')
          throw new StudioBuilderConflictError(
            'Esta proposta não está disponível para experimentar.',
          )
        if (row.leaseUntil && row.leaseUntil > now) return { job: await view(tx, row), token: null }
        if (journalFor(row).previewRefreshes >= STUDIO_PRO_ASSISTANCE_LIMITS.maxPreviewRefreshes)
          throw new StudioBuilderConflictError(
            'O limite de recriações da prévia terminou. O código e a comparação continuam disponíveis enquanto retidos.',
          )
        const token = randomUUID()
        await update({
          assistance: {
            ...clearPreviewError(row),
            previewRefreshes: journalFor(row).previewRefreshes + 1,
          },
          leaseToken: token,
          leaseUntil: new Date(now.getTime() + limits.leaseMs),
        })
        return { job: await view(tx, row), token, binaries: row.binaries }
      }
      if (command.operation === 'preview-checkpoint') {
        if (
          row.phase !== 'review' ||
          !row.result ||
          journalFor(row).disposition === 'discarded' ||
          command.token !== row.leaseToken ||
          command.version !== row.version ||
          !row.leaseUntil ||
          row.leaseUntil <= now ||
          command.preview.revisionHash !== row.result.revisionHash ||
          !verifiedEvidence(command.evidence, command.preview)
        )
          throw new StudioBuilderConflictError(
            'A prévia não corresponde a uma revisão verificada disponível.',
          )
        const candidate = await applyStudioProChange(row.base, row.result.change)
        await this.verifyPreview(row, candidate.revision, command.preview, command.evidence, now)
        this.assertPythonAcceptanceLease(row, command.preview)
        await update({
          result: { ...row.result, preview: command.preview, evidence: command.evidence },
          assistance: appendStudioProAssistanceEvent(
            clearPreviewError(row),
            'preview',
            now.toISOString(),
          ),
          leaseToken: null,
          leaseUntil: null,
        })
        return { job: await view(tx, row), token: null }
      }
      if (command.operation === 'preview-release') {
        if (
          row.phase !== 'review' ||
          command.token !== row.leaseToken ||
          command.version !== row.version
        )
          throw new StudioBuilderConflictError('A tentativa de prévia já foi encerrada.')
        await update({
          assistance: {
            ...appendStudioProAssistanceEvent(journalFor(row), 'preview-failed', now.toISOString()),
            previewError: command.error,
          },
          leaseToken: null,
          leaseUntil: null,
        })
        return { job: await view(tx, row), token: null }
      }
      if (command.operation === 'cancel') {
        if (!terminal.has(row.phase))
          await update({
            phase: 'cancelled',
            leaseToken: null,
            leaseUntil: null,
            error: 'Execução cancelada. Nenhum arquivo do projeto foi alterado.',
          })
        return { job: await view(tx, row), token: null }
      }
      if (command.operation === 'claim') {
        if (terminal.has(row.phase) || (row.leaseUntil && row.leaseUntil > now))
          return { job: await view(tx, row), token: null }
        const generating = row.phase === 'queued'
        if (
          (generating && row.modelCalls >= limits.maxModelCalls) ||
          (!generating && row.validationCalls >= limits.maxValidationCalls)
        ) {
          await update({
            phase: 'failed',
            leaseToken: null,
            leaseUntil: null,
            error: 'O limite de tentativas terminou. Sua revisão original está preservada.',
          })
          return { job: await view(tx, row), token: null }
        }
        const token = randomUUID()
        await update({
          phase: generating ? 'generating' : 'validating',
          modelCalls: row.modelCalls + Number(generating),
          validationCalls: row.validationCalls + Number(!generating),
          leaseToken: token,
          leaseUntil: new Date(Math.min(now.getTime() + limits.leaseMs, row.deadlineAt.getTime())),
        })
        return {
          job: await view(tx, row),
          token,
          ...(!generating ? { binaries: row.binaries } : {}),
        }
      }
      if (
        terminal.has(row.phase) ||
        command.token !== row.leaseToken ||
        command.version !== row.version ||
        !row.leaseUntil ||
        row.leaseUntil <= now
      )
        throw new StudioBuilderConflictError()
      if (
        (row.phase === 'generating' &&
          !['queued', 'validating', 'failed'].includes(command.phase)) ||
        (row.phase === 'validating' && !['queued', 'review', 'failed'].includes(command.phase))
      )
        throw new StudioBuilderConflictError()
      if (command.result) {
        const scopeIssue = studioProChangeScopeIssue(
          row.assistance?.request,
          row.base.files,
          command.result.change,
        )
        if (scopeIssue) throw new StudioBuilderConflictError(scopeIssue)
        const applied = await applyStudioProChange(row.base, command.result.change)
        if (applied.revision.hash !== command.result.revisionHash)
          throw new StudioBuilderConflictError(
            'A revisão de trabalho não corresponde às alterações propostas.',
          )
        if (command.result.preview && command.result.preview.revisionHash !== applied.revision.hash)
          throw new StudioBuilderConflictError('A prévia não pertence à revisão candidata.')
        if (command.result.preview)
          await this.verifyPreview(
            row,
            applied.revision,
            command.result.preview,
            command.result.evidence,
            now,
          )
      }
      if (command.phase === 'validating' && !command.result) throw new StudioBuilderConflictError()
      if (
        command.phase === 'review' &&
        (!command.result ||
          !verifiedEvidence(command.result.evidence, command.result.preview) ||
          (row.base.version === 2 &&
            row.base.configuration.programmingLanguage === 'python' &&
            command.result.preview?.kind !== 'python'))
      )
        throw new StudioBuilderConflictError(
          'Ainda faltam verificações para revisar esta proposta.',
        )
      if (command.phase === 'queued' && row.modelCalls >= limits.maxModelCalls)
        throw new StudioBuilderConflictError('O limite de reparos terminou.')
      this.assertPythonAcceptanceLease(
        row,
        command.phase === 'review' ? command.result?.preview : undefined,
      )
      await update({
        phase: command.phase,
        result: command.result,
        error: command.error,
        cost: command.cost,
        notes: command.notes,
        leaseToken: null,
        leaseUntil: null,
      })
      return { job: await view(tx, row), token: null }
    })
  }
}
