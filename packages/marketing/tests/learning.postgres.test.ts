import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { rejects, throws } from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import {
  contextRequestSchema,
  createPieceBatch,
  type EditorialDocument,
} from '@sistemazero/marketing-contracts'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import type { Actor } from '../src/application/actor'
import { WorkspaceService } from '../src/application/workspace/workspace.service'
import { createDbConnection, type DbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleExecutionRepository } from '../src/infrastructure/persistence/drizzle/execution.repository'
import { DrizzleWorkspaceRepository } from '../src/infrastructure/persistence/drizzle/workspace.repository'
import { requireReviewDatabase } from './helpers/review-database'

const url = process.env.MARKETING_TEST_DATABASE_URL,
  suite = url ? describe : describe.skip
suite('análise para próxima pauta: origem, concorrência e contexto', () => {
  let connection: DbConnection, workspace: WorkspaceService
  const owner: Actor = {
    userId: randomUUID(),
    displayName: 'Editor',
    role: 'staff',
    status: 'active',
  }
  beforeAll(async () => {
    requireReviewDatabase(url)
    connection = createDbConnection(url)
    await migrate(connection.db, {
      migrationsFolder: 'src/infrastructure/persistence/drizzle/migrations',
      migrationsTable: 'marketing_migrations',
    })
    workspace = new WorkspaceService(new DrizzleWorkspaceRepository(connection.db), {
      lookup: async (input) =>
        ('ids' in input ? input.ids : []).map((id) => ({ id, name: 'Equipe', active: true })),
    })
  }, 30000)
  afterAll(async () => connection?.close())
  async function save(
    projectId: string,
    document: EditorialDocument,
    id: string = randomUUID(),
    baseRevisionId: string | null = null,
  ) {
    const result = await workspace.apply(owner, {
      schemaVersion: 1,
      projectId,
      operationId: randomUUID(),
      entityId: id,
      baseRevisionId,
      action: 'save',
      document,
    })
    if (result.status !== 'applied') throw new Error('Fixture conflitante')
    return result.item
  }
  async function fixture() {
    const project = await workspace.create(owner, {
      schemaVersion: 1,
      operationId: randomUUID(),
      id: randomUUID(),
      name: 'Ciclo de análise',
      product: 'Revisão',
    })
    const evidence = await save(project.id, {
      schemaVersion: 1,
      kind: 'evidence',
      title: 'Observação',
      body: '20 salvamentos observados em 48 horas; conversão não medida.',
      classification: 'fact',
      validity: 'historical',
      product: 'Revisão',
      tags: [],
      source: { label: 'Coleta de revisão' },
    })
    const analysis = await save(project.id, {
      schemaVersion: 1,
      kind: 'analysis',
      title: 'Hipótese do ciclo',
      body: 'Amostra pequena; comparar o convite à prática.',
      objective: 'Mais salvamentos',
      evidenceIds: [evidence.id],
      hypothesis: 'Um exemplo prático pode aumentar salvamentos.',
      proposedPieceId: null,
      analysisType: 'research',
    })
    const input = {
      schemaVersion: 1,
      operationId: randomUUID(),
      analysisId: analysis.id,
      expectedRevisionId: analysis.revisionId,
      title: 'Convite à prática',
      brief: 'Criar um convite concreto para uma atividade.',
      hypothesis: 'Um exemplo prático pode aumentar salvamentos.',
      criterion: 'Comparar salvamentos por visualização após 48 horas; registrar cobertura.',
      objective: 'Mais salvamentos',
      format: 'story',
      medium: 'image',
    }
    return { project, evidence, analysis, input }
  }
  test('uma transação preserva a análise exata, liga a pauta e permite repetir após resposta perdida', async () => {
    const f = await fixture()
    const [a, b] = await Promise.all([
      workspace.proposePiece(owner, f.project.id, f.input),
      workspace.proposePiece(owner, f.project.id, f.input),
    ])
    expect(a).toEqual(b)
    if (a.status !== 'applied') throw new Error('Conflito inesperado')
    const piece = a.items.find((item) => item.document.kind === 'piece')!,
      analysis = a.items.find((item) => item.document.kind === 'analysis')!
    expect(piece.document).toMatchObject({
      state: 'draft',
      evidenceIds: [f.evidence.id],
      originAnalysis: { entityId: f.analysis.id, revisionId: f.analysis.revisionId },
    })
    expect(piece.document.kind === 'piece' && piece.document.brief).toContain(f.input.criterion)
    expect(analysis.document).toMatchObject({
      proposedPieceId: piece.id,
      hypothesis: f.input.hypothesis,
    })
    expect(
      (await workspace.snapshot(owner, f.project.id)).items.filter(
        (item) => item.document.kind === 'piece',
      ),
    ).toHaveLength(1)
    expect(await workspace.proposePiece(owner, f.project.id, f.input)).toEqual(a)
    await rejects(
      workspace.proposePiece(owner, f.project.id, { ...f.input, title: 'Pedido diferente' }),
      { code: 'OPERATION_REUSED' },
    )
    await rejects(
      workspace.proposePiece(owner, f.project.id, {
        ...f.input,
        operationId: randomUUID(),
        expectedRevisionId: analysis.revisionId,
      }),
      { code: 'CONTEXT_CHANGED' },
    )
  })
  test('uma revisão posterior da análise não reescreve as fontes fornecidas à IA da nova peça', async () => {
    const f = await fixture(),
      result = await workspace.proposePiece(owner, f.project.id, f.input)
    if (result.status !== 'applied') throw new Error('Conflito inesperado')
    const analysis = result.items.find((item) => item.document.kind === 'analysis')!,
      component = result.items.find((item) => item.document.kind === 'component')!
    if (analysis.document.kind !== 'analysis') throw new Error('Fixture')
    await save(
      f.project.id,
      { ...analysis.document, body: 'Análise posterior alterada' },
      analysis.id,
      analysis.revisionId,
    )
    await save(
      f.project.id,
      { ...f.evidence.document, title: 'Observação posterior' },
      f.evidence.id,
      f.evidence.revisionId,
    )
    const context = await new DrizzleExecutionRepository(connection.db).context(
      owner.userId,
      contextRequestSchema.parse({
        schemaVersion: 1,
        projectId: f.project.id,
        entityId: component.id,
        revisionId: component.revisionId,
        intent: 'adjust',
        capability: 'copy',
        provider: 'codex',
        instruction: 'Escrever a legenda',
        selection: [],
        protectedIds: [],
        limits: {},
      }),
    )
    expect(context.context.basis?.map((row) => row.id)).toContain(f.analysis.revisionId)
    expect(context.context.basis?.map((row) => row.id)).toContain(f.evidence.revisionId)
    expect(
      context.context.basis?.find((row) => row.id === f.analysis.revisionId)?.document,
    ).toEqual(f.analysis.document)
  })
  test('análise desatualizada, conta sem permissão, origem externa e hipótese vazia não criam pauta', async () => {
    const f = await fixture(),
      stranger = { ...owner, userId: randomUUID() }
    await rejects(workspace.proposePiece(stranger, f.project.id, f.input), {
      code: 'OBJECT_INACCESSIBLE',
    })
    throws(() => workspace.proposePiece(owner, f.project.id, { ...f.input, hypothesis: '' }), {
      code: 'VALIDATION_ERROR',
    })
    const other = await fixture()
    await rejects(workspace.proposePiece(owner, other.project.id, f.input), {
      code: 'OBJECT_INACCESSIBLE',
    })
    await save(
      f.project.id,
      { ...f.analysis.document, title: 'Revisada por outra pessoa' },
      f.analysis.id,
      f.analysis.revisionId,
    )
    await rejects(workspace.proposePiece(owner, f.project.id, f.input), {
      code: 'CONTEXT_CHANGED',
    })
    expect(
      (await workspace.snapshot(owner, f.project.id)).items.filter(
        (item) => item.document.kind === 'piece',
      ),
    ).toHaveLength(0)
  })
  test('origem forjada de outro tipo é recusada também no caminho genérico de edição', async () => {
    const f = await fixture(),
      batch = createPieceBatch({
        projectId: f.project.id,
        title: 'Inválida',
        brief: 'Origem forjada',
        format: 'story',
        medium: 'image',
      })
    const piece = batch.changes[0]
    if (piece?.document?.kind !== 'piece') throw new Error('Fixture')
    piece.document.originAnalysis = { entityId: f.evidence.id, revisionId: f.evidence.revisionId }
    await rejects(workspace.applyBatch(owner, batch), {
      code: 'DEPENDENCY_MISSING',
    })
    expect(
      (await workspace.snapshot(owner, f.project.id)).items.filter(
        (item) => item.document.kind === 'piece',
      ),
    ).toHaveLength(0)
  })
  test('análise e evidência criadas no mesmo lote conservam a revisão mesmo em ordem inversa', async () => {
    const f = await fixture(),
      evidenceId = randomUUID(),
      analysisId = randomUUID()
    if (f.analysis.document.kind !== 'analysis') throw new Error('Fixture')
    const result = await workspace.applyBatch(owner, {
      schemaVersion: 1,
      operationId: randomUUID(),
      projectId: f.project.id,
      changes: [
        {
          entityId: analysisId,
          baseRevisionId: null,
          action: 'save',
          document: { ...f.analysis.document, evidenceIds: [evidenceId], basis: [] },
        },
        {
          entityId: evidenceId,
          baseRevisionId: null,
          action: 'save',
          document: f.evidence.document,
        },
      ],
    })
    if (result.status !== 'applied') throw new Error('Conflito')
    const evidence = result.items.find((item) => item.id === evidenceId)!,
      analysis = result.items.find((item) => item.id === analysisId)!
    expect(analysis.document).toMatchObject({
      basis: [{ entityId: evidenceId, revisionId: evidence.revisionId }],
    })
    expect((await workspace.history(owner, f.project.id, analysisId))[0]?.document).toEqual(
      analysis.document,
    )
  })
})
