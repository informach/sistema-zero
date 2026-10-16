import { createHash, randomUUID } from 'node:crypto'
import {
  batchOperationSchema,
  type ConfigureMonitoring,
  canonicalJson,
  type EditorialDocument,
  type MonitoringObservation,
  monitoringOverviewSchema,
  monitoringStatusSchema,
  monitoringViewSchema,
} from '@sistemazero/marketing-contracts'
import { and, desc, eq, inArray, lt, lte, or } from 'drizzle-orm'
import type { FeedResult } from '../../../domain/intelligence/feed'
import { budgetDay, nextBudgetDay, nextCollection } from '../../../domain/intelligence/schedule'
import type {
  MonitoringJob,
  MonitoringRepository,
} from '../../../domain/ports/monitoring-repository.port'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import type { Database } from './db'
import {
  DrizzleWorkspaceRepository,
  projectAccess,
  receipt,
  snapshotProjectAccess,
  type WorkspaceTransaction,
} from './workspace.repository'
import {
  editorialMonitorEntries as entries,
  editorialItems as items,
  editorialMembers as members,
  editorialMonitors as monitors,
  editorialProjects as projects,
  editorialReceipts as receipts,
} from './workspace-schema'

type Monitor = typeof monitors.$inferSelect
const hash = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex')
function sourceHash(document: EditorialDocument) {
  if (document.kind !== 'watchlist') return ''
  const { evidenceIds: _, ...source } = document
  return hash(source)
}
function view(row: Monitor, now: Date) {
  return monitoringViewSchema.parse({
    projectId: row.projectId,
    watchlistId: row.watchlistId,
    ownerId: row.ownerId,
    version: row.version,
    config: row.config,
    state: row.state,
    nextAt: row.nextAt.toISOString(),
    lastCollectedAt: row.lastCollectedAt?.toISOString() ?? null,
    error: row.error,
    callsToday: budgetDay(now, row.config.timeZone) === row.budgetDay ? row.callsToday : 0,
    budgetDay: row.budgetDay,
    observedEntries: row.observedEntries,
    truncated: row.truncated,
  })
}
async function watch(tx: WorkspaceTransaction, projectId: string, id: string) {
  const [row] = await tx
    .select()
    .from(items)
    .where(and(eq(items.projectId, projectId), eq(items.id, id), eq(items.archived, false)))
  if (row?.document.kind !== 'watchlist')
    throw new WorkspaceError('OBJECT_INACCESSIBLE', 'Acompanhamento não disponível no projeto')
  return row
}
export class DrizzleMonitoringRepository implements MonitoringRepository {
  constructor(
    private readonly db: Database,
    private readonly now = () => new Date(),
  ) {}
  overview(actorId: string, projectId: string) {
    return this.db.transaction(
      async (tx) => {
        await snapshotProjectAccess(tx, actorId, projectId)
        const sources = await tx
          .select({ monitor: monitors, document: items.document })
          .from(monitors)
          .innerJoin(items, eq(items.id, monitors.watchlistId))
          .where(and(eq(monitors.projectId, projectId), eq(items.archived, false)))
          .orderBy(desc(monitors.lastCollectedAt), monitors.watchlistId)
          .limit(101)
        const latest = await tx
          .select({ entry: entries })
          .from(entries)
          .innerJoin(items, eq(items.id, entries.watchlistId))
          .where(and(eq(entries.projectId, projectId), eq(items.archived, false)))
          .orderBy(desc(entries.observedAt), desc(entries.id))
          .limit(51)
        return monitoringOverviewSchema.parse({
          sources: sources
            .slice(0, 100)
            .map((row) => ({ title: row.document.title, monitor: view(row.monitor, this.now()) })),
          entries: latest.slice(0, 50).map(({ entry }) => ({
            id: entry.id,
            watchlistId: entry.watchlistId,
            evidenceId: entry.evidenceId,
            evidenceRevisionId: entry.evidenceRevisionId,
            title: entry.title,
            url: entry.url,
            observedAt: entry.observedAt.toISOString(),
            publishedAt: entry.publishedAt?.toISOString() ?? null,
            change: entry.change,
            sourceType: entry.sourceType,
          })),
          sourcesTruncated: sources.length > 100,
          entriesTruncated: latest.length > 50,
        })
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    )
  }
  status(actorId: string, projectId: string, watchlistId: string, before?: string) {
    return this.db.transaction(
      async (tx) => {
        await snapshotProjectAccess(tx, actorId, projectId)
        await watch(tx, projectId, watchlistId)
        const [row] = await tx
          .select()
          .from(monitors)
          .where(and(eq(monitors.projectId, projectId), eq(monitors.watchlistId, watchlistId)))
        const [cursor] = before
          ? await tx
              .select()
              .from(entries)
              .where(
                and(
                  eq(entries.projectId, projectId),
                  eq(entries.watchlistId, watchlistId),
                  eq(entries.id, before),
                ),
              )
          : []
        if (before && !cursor)
          throw new WorkspaceError('OBJECT_INACCESSIBLE', 'Página de observações não disponível')
        const page = await tx
          .select()
          .from(entries)
          .where(
            and(
              eq(entries.projectId, projectId),
              eq(entries.watchlistId, watchlistId),
              cursor
                ? or(
                    lt(entries.observedAt, cursor.observedAt),
                    and(eq(entries.observedAt, cursor.observedAt), lt(entries.id, cursor.id)),
                  )
                : undefined,
            ),
          )
          .orderBy(desc(entries.observedAt), desc(entries.id))
          .limit(26)
        return monitoringStatusSchema.parse({
          monitor: row ? view(row, this.now()) : null,
          entries: page.slice(0, 25).map((entry) => ({
            id: entry.id,
            watchlistId,
            evidenceId: entry.evidenceId,
            evidenceRevisionId: entry.evidenceRevisionId,
            title: entry.title,
            url: entry.url,
            observedAt: entry.observedAt.toISOString(),
            publishedAt: entry.publishedAt?.toISOString() ?? null,
            change: entry.change,
            sourceType: entry.sourceType,
          })),
          more: page.length > 25,
        })
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    )
  }
  configure(
    actorId: string,
    projectId: string,
    watchlistId: string,
    input: ConfigureMonitoring,
    payload: string,
  ) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'edit')
      const previous = await receipt(tx, projectId, actorId, input.operationId, payload)
      if (previous) return monitoringViewSchema.parse(previous.result)
      const source = await watch(tx, projectId, watchlistId)
      const [current] = await tx
        .select()
        .from(monitors)
        .where(eq(monitors.watchlistId, watchlistId))
      if (
        source.revisionId !== input.expectedRevisionId ||
        (current?.version ?? 0) !== input.expectedVersion
      )
        throw new WorkspaceError(
          'CONTEXT_CHANGED',
          'A fonte ou o acompanhamento mudou. Confira antes de salvar.',
        )
      if (input.config.enabled && source.document.kind === 'watchlist' && !source.document.enabled)
        throw new WorkspaceError('VALIDATION_ERROR', 'Ative a fonte antes de ativar a coleta')
      const at = this.now()
      const next: Monitor = {
        watchlistId,
        projectId,
        ownerId: actorId,
        version: (current?.version ?? 0) + 1,
        config: input.config,
        sourceHash: sourceHash(source.document),
        state: input.config.enabled ? 'scheduled' : 'disabled',
        nextAt: at,
        leaseToken: null,
        leaseExpiresAt: null,
        attempts: 0,
        budgetDay: current?.budgetDay ?? null,
        callsToday: current?.callsToday ?? 0,
        lastCollectedAt: current?.lastCollectedAt ?? null,
        error: null,
        etag: current?.config.feedUrl === input.config.feedUrl ? current.etag : null,
        observedEntries: current?.observedEntries ?? 0,
        truncated: current?.truncated ?? false,
      }
      await tx
        .insert(monitors)
        .values(next)
        .onConflictDoUpdate({ target: monitors.watchlistId, set: next })
      const result = view(next, at)
      await tx
        .insert(receipts)
        .values({ projectId, actorId, operationId: input.operationId, hash: payload, result })
      return result
    })
  }
  observe(
    actorId: string,
    projectId: string,
    watchlistId: string,
    input: MonitoringObservation,
    payload: string,
  ) {
    return this.db.transaction(async (tx) => {
      await projectAccess(tx, actorId, projectId, 'edit')
      const previous = await receipt(tx, projectId, actorId, input.operationId, payload)
      if (previous) return monitoringViewSchema.parse(previous.result)
      const watched = await watch(tx, projectId, watchlistId)
      const [monitor] = await tx
        .select()
        .from(monitors)
        .where(eq(monitors.watchlistId, watchlistId))
      if (
        !monitor ||
        monitor.version !== input.expectedVersion ||
        !monitor.config.enabled ||
        monitor.config.mode === 'feed'
      )
        throw new WorkspaceError(
          'CONTEXT_CHANGED',
          'Confira o modo e a versão do acompanhamento antes de registrar a pesquisa',
        )
      if (sourceHash(watched.document) !== monitor.sourceHash)
        throw new WorkspaceError(
          'CONTEXT_CHANGED',
          'A fonte mudou. Confira a configuração antes de vincular a pesquisa.',
        )
      const [source] = await tx
        .select()
        .from(items)
        .where(
          and(
            eq(items.id, input.evidenceId),
            eq(items.projectId, projectId),
            eq(items.archived, false),
          ),
        )
      if (source?.document.kind !== 'evidence' || source.revisionId !== input.expectedRevisionId)
        throw new WorkspaceError(
          'CONTEXT_CHANGED',
          'Confira a revisão da evidência antes de registrar a pesquisa',
        )
      const at = this.now()
      // This transaction holds the project lock. Re-linking the same immutable
      // evidence is not a new collection, even under a fresh operation id.
      const [existing] = await tx
        .select({ id: entries.id })
        .from(entries)
        .where(
          and(
            eq(entries.watchlistId, watchlistId),
            eq(entries.evidenceRevisionId, source.revisionId),
          ),
        )
        .limit(1)
      if (existing) {
        const result = view(monitor, at)
        await tx
          .insert(receipts)
          .values({ projectId, actorId, operationId: input.operationId, hash: payload, result })
        return result
      }
      const [prior] = await tx
        .select({ id: entries.id })
        .from(entries)
        .where(and(eq(entries.watchlistId, watchlistId), eq(entries.evidenceId, source.id)))
        .limit(1)
      await tx.insert(entries).values({
        id: randomUUID(),
        projectId,
        watchlistId,
        evidenceId: source.id,
        evidenceRevisionId: source.revisionId,
        sourceKey: source.id,
        contentHash: source.revisionId,
        title: source.document.title,
        url: source.document.source.url ?? null,
        observedAt: at,
        publishedAt: null,
        change: prior ? 'changed' : 'new',
        sourceType: input.sourceType,
      })
      const [updated] = await tx
        .update(monitors)
        .set({
          state: 'scheduled',
          lastCollectedAt: at,
          nextAt: nextCollection(at, monitor.config.intervalHours),
          error: null,
          attempts: 0,
        })
        .where(eq(monitors.watchlistId, watchlistId))
        .returning()
      const result = view(updated!, at)
      await tx
        .insert(receipts)
        .values({ projectId, actorId, operationId: input.operationId, hash: payload, result })
      return result
    })
  }
  private async current(
    tx: WorkspaceTransaction,
    candidate: Pick<Monitor, 'projectId' | 'watchlistId'>,
  ) {
    await tx
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, candidate.projectId))
      .for('update')
    const [row] = await tx
      .select()
      .from(monitors)
      .where(
        and(
          eq(monitors.projectId, candidate.projectId),
          eq(monitors.watchlistId, candidate.watchlistId),
        ),
      )
    return row
  }
  private async allowed(tx: WorkspaceTransaction, row: Monitor) {
    const [source] = await tx
      .select()
      .from(items)
      .where(and(eq(items.projectId, row.projectId), eq(items.id, row.watchlistId)))
    const [member] = await tx
      .select()
      .from(members)
      .where(and(eq(members.projectId, row.projectId), eq(members.userId, row.ownerId)))
    return (
      source?.document.kind === 'watchlist' &&
      !source.archived &&
      source.document.enabled &&
      sourceHash(source.document) === row.sourceHash &&
      member?.permissions.includes('edit')
    )
  }
  async claim() {
    const at = this.now()
    const due = await this.db
      .select({ projectId: monitors.projectId, watchlistId: monitors.watchlistId })
      .from(monitors)
      .where(
        and(
          inArray(monitors.state, ['scheduled', 'retry', 'budget', 'running']),
          lte(monitors.nextAt, at),
        ),
      )
      .orderBy(monitors.nextAt, monitors.watchlistId)
      .limit(20)
    for (const candidate of due) {
      const job = await this.db.transaction(async (tx) => {
        const row = await this.current(tx, candidate)
        if (
          !row?.config.enabled ||
          !['scheduled', 'retry', 'budget', 'running'].includes(row.state) ||
          row.nextAt > at
        )
          return null
        if (!(await this.allowed(tx, row))) {
          await tx
            .update(monitors)
            .set({
              state: 'paused',
              leaseToken: null,
              leaseExpiresAt: null,
              error:
                'A fonte mudou, foi removida ou o responsável perdeu acesso. Revise o acompanhamento.',
            })
            .where(eq(monitors.watchlistId, row.watchlistId))
          return null
        }
        if (row.config.mode !== 'feed') {
          await tx
            .update(monitors)
            .set({ state: 'waiting-local', error: null })
            .where(eq(monitors.watchlistId, row.watchlistId))
          return null
        }
        if (row.attempts >= 3) {
          await tx
            .update(monitors)
            .set({
              state: 'paused',
              leaseToken: null,
              leaseExpiresAt: null,
              error:
                'Três tentativas foram interrompidas. Confira a fonte e retome o acompanhamento.',
            })
            .where(eq(monitors.watchlistId, row.watchlistId))
          return null
        }
        const day = budgetDay(at, row.config.timeZone),
          calls = row.budgetDay === day ? row.callsToday : 0
        if (calls >= row.config.dailyCallBudget) {
          await tx
            .update(monitors)
            .set({
              state: 'budget',
              nextAt: nextBudgetDay(at, row.config.timeZone),
              error:
                'Orçamento diário de consultas esgotado. A coleta retoma no próximo dia do fuso escolhido.',
            })
            .where(eq(monitors.watchlistId, row.watchlistId))
          return null
        }
        const leaseToken = randomUUID(),
          deadline = new Date(at.getTime() + 60_000)
        await tx
          .update(monitors)
          .set({
            state: 'running',
            leaseToken,
            leaseExpiresAt: deadline,
            nextAt: deadline,
            attempts: row.attempts + 1,
            budgetDay: day,
            callsToday: calls + 1,
            error: null,
          })
          .where(eq(monitors.watchlistId, row.watchlistId))
        return {
          projectId: row.projectId,
          watchlistId: row.watchlistId,
          ownerId: row.ownerId,
          leaseToken,
          version: row.version,
          config: row.config,
          etag: row.etag,
          attempt: row.attempts + 1,
        }
      })
      if (job) return job
    }
    return null
  }
  finish(
    job: MonitoringJob,
    outcome: { result: FeedResult } | { error: string; retryable: boolean; retryAfterMs?: number },
  ) {
    return this.db.transaction(async (tx) => {
      const row = await this.current(tx, job),
        at = this.now()
      if (
        row?.state !== 'running' ||
        row.leaseToken !== job.leaseToken ||
        row.version !== job.version ||
        !row.leaseExpiresAt ||
        row.leaseExpiresAt <= at
      )
        return false
      if (!(await this.allowed(tx, row))) {
        await tx
          .update(monitors)
          .set({
            state: 'paused',
            leaseToken: null,
            leaseExpiresAt: null,
            error: 'A fonte ou a permissão mudou durante a consulta. O resultado não foi aplicado.',
          })
          .where(eq(monitors.watchlistId, row.watchlistId))
        return false
      }
      if ('error' in outcome) {
        const retry = outcome.retryable && row.attempts < 3
        await tx
          .update(monitors)
          .set({
            state: retry ? 'retry' : 'paused',
            nextAt: new Date(
              at.getTime() + Math.max(row.attempts * 30_000, outcome.retryAfterMs ?? 0),
            ),
            leaseToken: null,
            leaseExpiresAt: null,
            error: outcome.error.slice(0, 1000),
          })
          .where(eq(monitors.watchlistId, row.watchlistId))
        return true
      }
      const fresh = []
      const seen = new Set<string>()
      for (const entry of outcome.result.entries.slice(0, 25)) {
        const sourceKey = hash([row.config.feedUrl, entry.key]),
          contentHash = hash(entry)
        if (seen.has(sourceKey)) continue
        seen.add(sourceKey)
        // Compare the latest observation, not all past content: A → B → A
        // is two changes. Project lock + lease fencing already prevent replay.
        const [history] = await tx
          .select({ id: entries.id, contentHash: entries.contentHash })
          .from(entries)
          .where(and(eq(entries.watchlistId, row.watchlistId), eq(entries.sourceKey, sourceKey)))
          .orderBy(desc(entries.observedAt), desc(entries.id))
          .limit(1)
        if (history?.contentHash === contentHash) continue
        fresh.push({
          entry,
          sourceKey,
          contentHash,
          id: randomUUID(),
          evidenceId: randomUUID(),
          change: history ? ('changed' as const) : ('new' as const),
        })
      }
      if (fresh.length) {
        const [project] = await tx
          .select({ product: projects.product })
          .from(projects)
          .where(eq(projects.id, row.projectId))
        const batch = batchOperationSchema.parse({
          schemaVersion: 1,
          projectId: row.projectId,
          operationId: job.leaseToken,
          changes: fresh.map((item) => ({
            entityId: item.evidenceId,
            baseRevisionId: null,
            action: 'save',
            document: {
              schemaVersion: 1,
              kind: 'evidence',
              title: item.entry.title,
              body: `Fonte pública consultada em ${at.toISOString()}.\nData de publicação informada pela fonte: ${item.entry.publishedAt ?? 'não disponível'}. A data da consulta não significa que o conteúdo é novo.\n\nTrecho textual da fonte (até 10.000 caracteres):\n${item.entry.text}\n\nConteúdo da fonte; alegações ainda exigem conferência. Métricas de rede social não fornecidas por este feed.`,
              classification: 'reference',
              source: {
                label: 'Acompanhamento de feed público',
                url: item.entry.url ?? row.config.feedUrl!,
                sourceKey: item.sourceKey,
                sha256: item.contentHash,
                observedAt: at.toISOString(),
              },
              product: project!.product,
              validity: 'unverified',
              tags: ['acompanhamento', item.change === 'new' ? 'novidade' : 'alteração'],
            },
          })),
        })
        const result = await new DrizzleWorkspaceRepository(this.db).applyBatchInTransaction(
          tx,
          row.ownerId,
          batch,
          hash(batch),
        )
        if (result.status !== 'applied')
          throw new Error('Conflito inesperado ao registrar observações novas')
        await tx.insert(entries).values(
          fresh.map((item) => ({
            id: item.id,
            projectId: row.projectId,
            watchlistId: row.watchlistId,
            evidenceId: item.evidenceId,
            evidenceRevisionId: result.items.find((value) => value.id === item.evidenceId)!
              .revisionId,
            sourceKey: item.sourceKey,
            contentHash: item.contentHash,
            title: item.entry.title,
            url: item.entry.url,
            observedAt: at,
            publishedAt: item.entry.publishedAt ? new Date(item.entry.publishedAt) : null,
            change: item.change,
            sourceType: 'public' as const,
          })),
        )
      }
      await tx
        .update(monitors)
        .set({
          state: 'scheduled',
          nextAt: nextCollection(at, row.config.intervalHours),
          lastCollectedAt: at,
          leaseToken: null,
          leaseExpiresAt: null,
          error: null,
          attempts: 0,
          etag: outcome.result.etag,
          observedEntries: outcome.result.notModified
            ? row.observedEntries
            : outcome.result.observedEntries,
          truncated: outcome.result.notModified ? row.truncated : outcome.result.truncated,
        })
        .where(eq(monitors.watchlistId, row.watchlistId))
      return true
    })
  }
}
