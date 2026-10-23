import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { rejects } from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import {
  configureMonitoringSchema,
  type EditorialDocument,
  monitoringObservationSchema,
} from '@sistemazero/marketing-contracts'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { WorkspaceService } from '../src/application/workspace/workspace.service'
import type { FeedResult } from '../src/domain/intelligence/feed'
import { createDbConnection, type DbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleMonitoringRepository } from '../src/infrastructure/persistence/drizzle/monitoring.repository'
import { DrizzleWorkspaceRepository } from '../src/infrastructure/persistence/drizzle/workspace.repository'
import { editorialMonitors } from '../src/infrastructure/persistence/drizzle/workspace-schema'
import { requireReviewDatabase } from './helpers/review-database'
import { fixtureDirectory } from './helpers/staff-directory'

const url = process.env.MARKETING_TEST_DATABASE_URL,
  suite = url ? describe : describe.skip
suite('acompanhamento PostgreSQL: agenda, observações e concessões', () => {
  let connection: DbConnection, workspace: WorkspaceService, repo: DrizzleMonitoringRepository
  let at = new Date('2026-10-16T02:59:00Z')
  const owner = {
    userId: randomUUID(),
    displayName: 'Revisão',
    role: 'staff' as const,
    status: 'active' as const,
  }
  const result: FeedResult = {
    entries: [
      {
        key: 'entry-1',
        title: 'Atividade publicada',
        text: 'Proposta da fonte',
        url: 'https://example.com/post/1',
        publishedAt: '2026-10-15T12:00:00Z',
      },
    ],
    notModified: false,
    etag: '"v1"',
    observedEntries: 1,
    truncated: false,
  }
  beforeAll(async () => {
    requireReviewDatabase(url)
    connection = createDbConnection(url)
    await migrate(connection.db, {
      migrationsFolder: 'src/infrastructure/persistence/drizzle/migrations',
      migrationsTable: 'marketing_migrations',
    })
    workspace = new WorkspaceService(
      new DrizzleWorkspaceRepository(connection.db),
      fixtureDirectory,
    )
    repo = new DrizzleMonitoringRepository(connection.db, () => at)
  })
  afterEach(async () => {
    await connection.db
      .update(editorialMonitors)
      .set({ state: 'disabled' })
      .where(eq(editorialMonitors.ownerId, owner.userId))
    at = new Date('2026-10-16T02:59:00Z')
  })
  afterAll(async () => connection?.close())
  async function fixture(mode: 'feed' | 'local-ai' | 'manual' = 'feed', budget = 24) {
    const project = await workspace.create(owner, {
      schemaVersion: 1,
      operationId: randomUUID(),
      id: randomUUID(),
      name: 'Acompanhamento de revisão',
      product: 'Revisão isolada',
    })
    const saved = await workspace.apply(owner, {
      schemaVersion: 1,
      operationId: randomUUID(),
      projectId: project.id,
      entityId: randomUUID(),
      baseRevisionId: null,
      action: 'save',
      document: {
        schemaVersion: 1,
        kind: 'watchlist',
        title: 'Fonte de revisão',
        body: 'Observar novas atividades.',
        objective: 'Identificar referências',
        subjectType: 'topic',
        source: { label: 'Fonte de revisão' },
        url: 'https://example.com',
        enabled: true,
        evidenceIds: [],
      },
    })
    if (saved.status !== 'applied') throw new Error('Fixture')
    const input = configureMonitoringSchema.parse({
      schemaVersion: 1,
      operationId: randomUUID(),
      expectedRevisionId: saved.revisionId,
      expectedVersion: 0,
      config: {
        mode,
        feedUrl: mode === 'feed' ? 'https://example.com/feed.xml' : null,
        intervalHours: 1,
        timeZone: 'America/Sao_Paulo',
        dailyCallBudget: budget,
        enabled: true,
      },
    })
    const configured = await repo.configure(
      owner.userId,
      project.id,
      saved.item.id,
      input,
      input.operationId,
    )
    return { project, watch: saved.item, input, configured }
  }
  test('duas réplicas não coletam juntas; repetição e mudança de conteúdo preservam observações', async () => {
    const f = await fixture()
    const claims = await Promise.all([
      repo.claim(),
      new DrizzleMonitoringRepository(connection.db, () => at).claim(),
    ])
    expect(claims.filter(Boolean)).toHaveLength(1)
    const job = claims.find(Boolean)!
    expect(await repo.finish(job, { result })).toBe(true)
    expect(await repo.finish(job, { result })).toBe(false)
    let state = await repo.status(owner.userId, f.project.id, f.watch.id)
    expect(state.entries).toHaveLength(1)
    expect(state.monitor?.lastCollectedAt).toBe(at.toISOString())
    const original = state.entries[0]!
    at = new Date(state.monitor!.nextAt)
    await repo.finish((await repo.claim())!, { result })
    state = await repo.status(owner.userId, f.project.id, f.watch.id)
    expect(state.entries).toHaveLength(1)
    at = new Date(state.monitor!.nextAt)
    await repo.finish((await repo.claim())!, {
      result: {
        ...result,
        entries: [{ ...result.entries[0]!, text: 'Texto atualizado pela fonte' }],
      },
    })
    state = await repo.status(owner.userId, f.project.id, f.watch.id)
    expect(state.entries).toHaveLength(2)
    expect(state.entries[0]?.change).toBe('changed')
    expect(state.entries[1]?.evidenceRevisionId).toBe(original.evidenceRevisionId)
    at = new Date(state.monitor!.nextAt)
    await repo.finish((await repo.claim())!, { result })
    state = await repo.status(owner.userId, f.project.id, f.watch.id)
    expect(state.entries).toHaveLength(3)
    expect(state.entries[0]?.change).toBe('changed')
    expect(state.entries[0]?.evidenceRevisionId).not.toBe(original.evidenceRevisionId)
    at = new Date(state.monitor!.nextAt)
    await repo.finish((await repo.claim())!, { result })
    expect((await repo.status(owner.userId, f.project.id, f.watch.id)).entries).toHaveLength(3)
    const old = await workspace.history(owner, f.project.id, original.evidenceId)
    expect(old[0]?.document.kind === 'evidence' && old[0].document.body).toContain(
      'Proposta da fonte',
    )
    await rejects(repo.status(randomUUID(), f.project.id, f.watch.id), {
      code: 'OBJECT_INACCESSIBLE',
    })
  })
  test('cancelamento, concessão expirada e permissão revogada impedem resultado tardio', async () => {
    const f = await fixture(),
      first = (await repo.claim())!
    const stopped = await repo.configure(
      owner.userId,
      f.project.id,
      f.watch.id,
      {
        ...f.input,
        operationId: randomUUID(),
        expectedVersion: 1,
        config: { ...f.input.config, enabled: false },
      },
      randomUUID(),
    )
    expect(stopped.state).toBe('disabled')
    expect(await repo.finish(first, { result })).toBe(false)
    await repo.configure(
      owner.userId,
      f.project.id,
      f.watch.id,
      { ...f.input, operationId: randomUUID(), expectedVersion: 2 },
      randomUUID(),
    )
    const old = (await repo.claim())!
    at = new Date(at.getTime() + 61_000)
    const fresh = (await repo.claim())!
    expect(fresh.leaseToken).not.toBe(old.leaseToken)
    expect(await repo.finish(old, { result })).toBe(false)
    await workspace.setMember(owner, f.project.id, {
      operationId: randomUUID(),
      userId: owner.userId,
      permissions: ['read', 'admin'],
    })
    expect(await repo.finish(fresh, { result })).toBe(false)
    expect((await repo.status(owner.userId, f.project.id, f.watch.id)).entries).toHaveLength(0)
  })
  test('painel do projeto tem limite explícito, histórico continua por página e não vaza outra equipe', async () => {
    const f = await fixture()
    for (let batch = 0; batch < 3; batch++) {
      const count = batch === 2 ? 1 : 25
      const collected = {
        ...result,
        observedEntries: count,
        entries: Array.from({ length: count }, (_, i) => ({
          ...result.entries[0]!,
          key: `batch-${batch}-${i}`,
        })),
      }
      await repo.finish((await repo.claim())!, { result: collected })
      at = new Date((await repo.status(owner.userId, f.project.id, f.watch.id)).monitor!.nextAt)
    }
    const overview = await repo.overview(owner.userId, f.project.id)
    expect(overview.entries).toHaveLength(50)
    expect(overview.entriesTruncated).toBe(true)
    expect(overview.sources).toHaveLength(1)
    const first = await repo.status(owner.userId, f.project.id, f.watch.id)
    const second = await repo.status(
      owner.userId,
      f.project.id,
      f.watch.id,
      first.entries.at(-1)!.id,
    )
    const third = await repo.status(
      owner.userId,
      f.project.id,
      f.watch.id,
      second.entries.at(-1)!.id,
    )
    expect(
      new Set([...first.entries, ...second.entries, ...third.entries].map((entry) => entry.id))
        .size,
    ).toBe(51)
    expect(third.more).toBe(false)
    const other = await fixture('manual')
    expect((await repo.overview(owner.userId, other.project.id)).entries).toHaveLength(0)
    await rejects(
      repo.status(owner.userId, other.project.id, other.watch.id, first.entries[0]!.id),
      { code: 'OBJECT_INACCESSIBLE' },
    )
    await rejects(repo.overview(randomUUID(), f.project.id), { code: 'OBJECT_INACCESSIBLE' })
  })
  test('orçamento inclui retry, vira no fuso e falha não substitui a última coleta válida', async () => {
    const f = await fixture('feed', 1),
      first = (await repo.claim())!
    await repo.finish(first, { result })
    const before = await repo.status(owner.userId, f.project.id, f.watch.id)
    // Reconfiguring resumes the schedule, but must not replenish today's budget.
    await repo.configure(
      owner.userId,
      f.project.id,
      f.watch.id,
      { ...f.input, operationId: randomUUID(), expectedVersion: 1 },
      randomUUID(),
    )
    expect(await repo.claim()).toBeNull()
    const blocked = await repo.status(owner.userId, f.project.id, f.watch.id)
    expect(blocked.monitor?.state).toBe('budget')
    expect(
      new Date(blocked.monitor!.nextAt).getTime() - Date.parse('2026-10-16T03:00:00Z'),
    ).toBeLessThan(1000)
    at = new Date(new Date(blocked.monitor!.nextAt).getTime() + 1)
    const next = (await repo.claim())!
    expect(next).toBeTruthy()
    await repo.finish(next, { error: 'Fonte indisponível', retryable: true, retryAfterMs: 60000 })
    const failed = await repo.status(owner.userId, f.project.id, f.watch.id)
    expect(failed.monitor?.lastCollectedAt).toBe(before.monitor?.lastCollectedAt)
    expect(failed.entries).toEqual(before.entries)
    expect(failed.monitor?.state).toBe('retry')
    at = new Date(failed.monitor!.nextAt)
    expect(await repo.claim()).toBeNull()
    expect((await repo.status(owner.userId, f.project.id, f.watch.id)).monitor?.state).toBe(
      'budget',
    )
  })
  test('três tentativas encerram retry automático; mudança da fonte exige revisão', async () => {
    const f = await fixture()
    for (let attempt = 1; attempt <= 3; attempt++) {
      const job = (await repo.claim())!
      expect(job.attempt).toBe(attempt)
      await repo.finish(job, { error: 'HTTP 503', retryable: true })
      const status = await repo.status(owner.userId, f.project.id, f.watch.id)
      at = new Date(status.monitor!.nextAt)
    }
    expect(await repo.claim()).toBeNull()
    expect((await repo.status(owner.userId, f.project.id, f.watch.id)).monitor?.state).toBe(
      'paused',
    )
    await repo.configure(
      owner.userId,
      f.project.id,
      f.watch.id,
      { ...f.input, operationId: randomUUID(), expectedVersion: 1 },
      randomUUID(),
    )
    await workspace.apply(owner, {
      schemaVersion: 1,
      operationId: randomUUID(),
      projectId: f.project.id,
      entityId: f.watch.id,
      baseRevisionId: f.watch.revisionId,
      action: 'save',
      document: { ...f.watch.document, title: 'Outra fonte' },
    })
    expect(await repo.claim()).toBeNull()
    expect((await repo.status(owner.userId, f.project.id, f.watch.id)).monitor?.error).toContain(
      'fonte mudou',
    )
  })
  test('pesquisa pessoal aguarda desktop e aceita somente evidência confirmada do projeto', async () => {
    const f = await fixture('local-ai')
    expect(await repo.claim()).toBeNull()
    expect((await repo.status(owner.userId, f.project.id, f.watch.id)).monitor?.state).toBe(
      'waiting-local',
    )
    const document: EditorialDocument = {
      schemaVersion: 1,
      kind: 'evidence',
      title: 'Pesquisa conferida',
      body: 'Dados fornecidos; alcance não informado.',
      source: { label: 'Importação da equipe' },
      classification: 'reference',
      product: 'Revisão',
      validity: 'unverified',
      tags: [],
    }
    const saved = await workspace.apply(owner, {
      schemaVersion: 1,
      operationId: randomUUID(),
      projectId: f.project.id,
      entityId: randomUUID(),
      baseRevisionId: null,
      action: 'save',
      document,
    })
    if (saved.status !== 'applied') throw new Error('Fixture')
    const input = monitoringObservationSchema.parse({
      schemaVersion: 1,
      operationId: randomUUID(),
      expectedVersion: 1,
      evidenceId: saved.item.id,
      expectedRevisionId: saved.revisionId,
      sourceType: 'imported',
    })
    await rejects(
      repo.observe(
        owner.userId,
        f.project.id,
        f.watch.id,
        { ...input, expectedRevisionId: randomUUID() },
        randomUUID(),
      ),
      { code: 'CONTEXT_CHANGED' },
    )
    const observed = await repo.observe(
      owner.userId,
      f.project.id,
      f.watch.id,
      input,
      input.operationId,
    )
    expect(
      await repo.observe(owner.userId, f.project.id, f.watch.id, input, input.operationId),
    ).toEqual(observed)
    at = new Date(at.getTime() + 2000)
    const repeated = await repo.observe(
      owner.userId,
      f.project.id,
      f.watch.id,
      { ...input, operationId: randomUUID() },
      randomUUID(),
    )
    expect(repeated.lastCollectedAt).toBe(observed.lastCollectedAt)
    const status = await repo.status(owner.userId, f.project.id, f.watch.id)
    expect(status.entries).toHaveLength(1)
    expect(status.entries[0]?.sourceType).toBe('imported')
    expect(status.monitor?.callsToday).toBe(0)
  })
})
