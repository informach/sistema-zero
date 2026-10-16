import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { rejects, throws } from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { contextRequestSchema, summarizeProduction } from '@sistemazero/marketing-contracts'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import type { Actor } from '../src/application/actor'
import { ExecutionService } from '../src/application/workspace/execution.service'
import { WorkspaceService } from '../src/application/workspace/workspace.service'
import { createDbConnection, type DbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleExecutionRepository } from '../src/infrastructure/persistence/drizzle/execution.repository'
import { readProduction } from '../src/infrastructure/persistence/drizzle/production'
import { DrizzleWorkspaceRepository } from '../src/infrastructure/persistence/drizzle/workspace.repository'
import { editorialProductionRecords } from '../src/infrastructure/persistence/drizzle/workspace-schema'
import { requireReviewDatabase } from './helpers/review-database'

const url = process.env.MARKETING_TEST_DATABASE_URL,
  suite = url ? describe : describe.skip
suite('produção: tempo declarado, utilidade e consumo com cobertura', () => {
  let connection: DbConnection, workspace: WorkspaceService, execution: ExecutionService
  const owner: Actor = {
    userId: randomUUID(),
    displayName: 'Editor',
    role: 'staff',
    status: 'active',
  }
  const device = { ...owner, desktopDeviceId: randomUUID() }
  beforeAll(async () => {
    requireReviewDatabase(url)
    connection = createDbConnection(url)
    await migrate(connection.db, {
      migrationsFolder: 'src/infrastructure/persistence/drizzle/migrations',
      migrationsTable: 'marketing_migrations',
    })
    workspace = new WorkspaceService(new DrizzleWorkspaceRepository(connection.db), {
      lookup: async () => [],
    })
    execution = new ExecutionService(new DrizzleExecutionRepository(connection.db))
  }, 30000)
  afterAll(async () => connection?.close())
  async function project() {
    return workspace.create(owner, {
      schemaVersion: 1,
      operationId: randomUUID(),
      id: randomUUID(),
      name: 'Revisão de produção',
      product: 'Teste',
    })
  }
  test('relatório separa observações importadas, preserva sua revisão e não cria publicação ou número ausente', async () => {
    const p = await project(),
      timestamp = new Date(Date.now() - 3600_000).toISOString()
    const source = await workspace.apply(owner, {
      schemaVersion: 1,
      operationId: randomUUID(),
      projectId: p.id,
      entityId: randomUUID(),
      baseRevisionId: null,
      action: 'save',
      document: {
        schemaVersion: 1,
        kind: 'evidence',
        title: 'Números da pesquisa',
        body: 'Cobertura parcial.',
        classification: 'reference',
        source: { label: 'Arquivo de pesquisa' },
        product: 'Teste',
        validity: 'unverified',
        tags: [],
        observation: {
          schemaVersion: 1,
          sourceType: 'imported',
          network: 'instagram',
          subject: 'Post da pesquisa',
          periodStart: timestamp,
          periodEnd: timestamp,
          collectedAt: timestamp,
          sampleSize: 1,
          coverage: 'Uma consulta manual, sem métricas privadas.',
          dimensions: { objective: 'Ensinar', audienceNeed: '', series: '', format: 'feed' },
          metrics: [
            {
              key: 'likes',
              label: 'Curtidas',
              unit: 'count',
              measurement: {
                value: 0,
                availability: 'observed',
                denominator: null,
                definition: 'Contador público',
              },
            },
            {
              key: 'views',
              label: 'Visualizações',
              unit: 'count',
              measurement: {
                value: null,
                availability: 'unavailable',
                denominator: null,
                definition: 'Não disponível',
              },
            },
          ],
        },
      },
    })
    if (source.status !== 'applied') throw new Error('Fixture')
    const report = await workspace.analytics(owner, p.id, { days: 7 })
    expect(report.rows).toHaveLength(0)
    expect(report.observations).toHaveLength(1)
    expect(report.observations[0]).toMatchObject({
      evidenceId: source.item.id,
      revisionId: source.revisionId,
      observation: { sourceType: 'imported' },
    })
    expect(
      report.observations[0]?.observation.metrics.map((metric) => metric.measurement.value),
    ).toEqual([0, null])
    const other = await project()
    expect((await workspace.analytics(owner, other.id, { days: 7 })).observations).toHaveLength(0)
  })
  function time(startedAt: string, endedAt: string) {
    return {
      operationId: randomUUID(),
      replacesId: null,
      body: {
        kind: 'human-time',
        startedAt,
        endedAt,
        activity: 'review',
        entityId: null,
        note: 'Conferência de copy',
      },
    }
  }
  test('resposta perdida, correção, anulação e histórico sem somar o registro antigo', async () => {
    const p = await project(),
      end = new Date(Date.now() - 3600_000).toISOString(),
      start = new Date(Date.parse(end) - 1800_000).toISOString()
    const input = time(start, end)
    const [a, b] = await Promise.all([
      workspace.recordProduction(owner, p.id, input),
      workspace.recordProduction(owner, p.id, input),
    ])
    expect(a).toEqual(b)
    expect((await workspace.production(owner, p.id, {})).timeRecords).toHaveLength(1)
    await rejects(
      workspace.recordProduction(owner, p.id, {
        ...input,
        body: { ...input.body, note: 'Alterado' },
      }),
      { code: 'OPERATION_REUSED' },
    )
    const replacement = await workspace.recordProduction(owner, p.id, {
      ...time(start, new Date(Date.parse(end) - 300_000).toISOString()),
      replacesId: a.id,
    })
    expect((await workspace.production(owner, p.id, {})).timeRecords.map((row) => row.id)).toEqual([
      replacement.id,
    ])
    await rejects(
      workspace.recordProduction(owner, p.id, { ...time(start, end), replacesId: a.id }),
      { code: 'CONTEXT_CHANGED' },
    )
    const cancellation = { operationId: randomUUID(), recordId: replacement.id }
    expect(await workspace.voidProduction(owner, p.id, cancellation)).toEqual(
      await workspace.voidProduction(owner, p.id, cancellation),
    )
    expect((await workspace.production(owner, p.id, {})).timeRecords).toHaveLength(0)
    const history = await connection.db
      .select()
      .from(editorialProductionRecords)
      .where(eq(editorialProductionRecords.projectId, p.id))
    expect(history).toHaveLength(2)
    expect(history.find((row) => row.id === a.id)?.replacedBy).toBe(replacement.id)
    expect(history.find((row) => row.id === replacement.id)?.voidedBy).toBe(owner.userId)
  })
  test('duas abas em projetos diferentes não duplicam o horário; futuro, inversão e ACL falham', async () => {
    const a = await project(),
      b = await project(),
      end = new Date(Date.now() - 7200_000).toISOString(),
      start = new Date(Date.parse(end) - 600_000).toISOString()
    const results = await Promise.allSettled([
      workspace.recordProduction(owner, a.id, time(start, end)),
      workspace.recordProduction(owner, b.id, time(start, end)),
    ])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1)
    throws(() => workspace.recordProduction(owner, a.id, time(end, start)), {
      code: 'VALIDATION_ERROR',
    })
    await rejects(
      workspace.recordProduction(
        owner,
        a.id,
        time(new Date().toISOString(), new Date(Date.now() + 3600_000).toISOString()),
      ),
      { code: 'VALIDATION_ERROR' },
    )
    const outsider = { ...owner, userId: randomUUID() }
    await rejects(workspace.production(outsider, a.id, {}), { code: 'OBJECT_INACCESSIBLE' })
    await rejects(workspace.recordProduction(outsider, a.id, time(start, end)), {
      code: 'OBJECT_INACCESSIBLE',
    })
    const fulfilled = results.find((r) => r.status === 'fulfilled')
    if (fulfilled?.status !== 'fulfilled') throw new Error('Registro esperado')
    await rejects(
      workspace.voidProduction(outsider, fulfilled.value.projectId, {
        operationId: randomUUID(),
        recordId: fulfilled.value.id,
      }),
      { code: 'OBJECT_INACCESSIBLE' },
    )
  })
  test('janela corta intervalos sem contar somente a data do registro', async () => {
    const p = await project(),
      until = new Date(),
      since = new Date(until.getTime() - 86400_000)
    const start = new Date(since.getTime() - 300_000).toISOString(),
      end = new Date(since.getTime() + 300_000).toISOString()
    await workspace.recordProduction(owner, p.id, time(start, end))
    const report = await readProduction(
      connection.db,
      owner.userId,
      p.id,
      1,
      new Date(Date.now() + 1000),
    )
    expect(report.timeRecords).toHaveLength(1)
    expect(
      Date.parse(
        report.timeRecords[0]?.body.kind === 'human-time'
          ? report.timeRecords[0].body.startedAt
          : '',
      ),
    ).toBeLessThan(Date.parse(report.since))
  })
  test('retomada mede tentativas uma vez, distingue token ausente de zero e aceita reavaliação concorrente', async () => {
    const p = await project()
    const source = await workspace.apply(owner, {
      schemaVersion: 1,
      operationId: randomUUID(),
      projectId: p.id,
      entityId: randomUUID(),
      baseRevisionId: null,
      action: 'save',
      document: {
        schemaVersion: 1,
        kind: 'direction',
        title: 'Direção',
        body: 'Criar',
        objective: 'Ensinar',
        audience: 'Famílias',
        voice: 'Direta',
        referenceIds: [],
        protectedTerms: [],
      },
    })
    if (source.status !== 'applied') throw new Error('Fixture')
    const input = contextRequestSchema.parse({
      schemaVersion: 1,
      projectId: p.id,
      entityId: source.item.id,
      revisionId: source.revisionId,
      intent: 'adjust',
      capability: 'copy',
      provider: 'codex',
      instruction: 'Revisar',
      selection: [],
      protectedIds: [],
      limits: {},
    })
    const context = await execution.context(owner, input)
    const run = await execution.create(owner, {
      ...input,
      id: randomUUID(),
      operationId: randomUUID(),
      contextHash: context.hash,
    })
    const first = await execution.claim(device, p.id, run.request.id, {
      operationId: randomUUID(),
      expectedEpoch: 0,
    })
    if (!first.attempt) throw new Error('Tentativa')
    await execution.heartbeat(device, p.id, run.request.id, {
      operationId: randomUUID(),
      attemptId: first.attempt.id,
      epoch: first.epoch,
      checkpoint: {
        phase: 'working',
        stage: 'Execução',
        artifactIds: [],
        progress: null,
        inputTokens: 10,
        outputTokens: null,
      },
    })
    await execution.finish(device, p.id, run.request.id, {
      operationId: randomUUID(),
      attemptId: first.attempt.id,
      epoch: first.epoch,
      outcome: { status: 'waiting', code: 'NETWORK', message: 'Interrompida' },
    })
    const next = await execution.claim(device, p.id, run.request.id, {
      operationId: randomUUID(),
      expectedEpoch: first.epoch,
      retry: true,
    })
    if (!next.attempt) throw new Error('Tentativa')
    await execution.heartbeat(device, p.id, run.request.id, {
      operationId: randomUUID(),
      attemptId: next.attempt.id,
      epoch: next.epoch,
      checkpoint: {
        phase: 'working',
        stage: 'Execução',
        artifactIds: [],
        progress: null,
        inputTokens: 20,
        outputTokens: 5,
      },
    })
    await execution.finish(device, p.id, run.request.id, {
      operationId: randomUUID(),
      attemptId: next.attempt.id,
      epoch: next.epoch,
      outcome: {
        status: 'succeeded',
        text: 'Direção revisada',
        mode: 'codex',
        durationMs: 1500,
        assetIds: [],
        inputTokens: 25,
        outputTokens: 0,
      },
    })
    let report = await workspace.production(owner, p.id, {})
    expect(report.runs[0]).toMatchObject({
      attempts: 2,
      recovered: true,
      interruptedAttempts: 1,
      inputTokens: 25,
      outputTokens: 0,
      inputCoverage: 1,
      outputCoverage: 1,
      measuredDurations: 1,
      measuredDurationMs: 1500,
      review: null,
    })
    const review = {
      operationId: randomUUID(),
      replacesId: null,
      body: {
        kind: 'generation-review',
        runId: run.request.id,
        verdict: 'discarded',
        note: 'Não atende à direção',
      },
    }
    const saved = await workspace.recordProduction(owner, p.id, review)
    expect(await workspace.recordProduction(owner, p.id, review)).toEqual(saved)
    const race = await Promise.allSettled(
      ['useful', 'rework'].map((verdict) =>
        workspace.recordProduction(owner, p.id, {
          ...review,
          operationId: randomUUID(),
          replacesId: saved.id,
          body: { ...review.body, verdict },
        }),
      ),
    )
    expect(race.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(race.filter((r) => r.status === 'rejected')).toHaveLength(1)
    report = await workspace.production(owner, p.id, {})
    const groups = summarizeProduction(report.runs)
    expect(groups[0]).toMatchObject({
      requests: 1,
      attempts: 2,
      inputTokens: 25,
      outputTokens: 0,
      reviewed: 1,
      discarded: 0,
      recovered: 1,
    })
    const rechecked = report.runs[0]?.review
    if (!rechecked) throw new Error('Avaliação')
    await workspace.voidProduction(owner, p.id, {
      operationId: randomUUID(),
      recordId: rechecked.id,
    })
    expect((await workspace.production(owner, p.id, {})).runs[0]?.review).toBeNull()
  })
})
