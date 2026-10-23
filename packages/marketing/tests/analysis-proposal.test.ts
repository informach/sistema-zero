import { expect, test } from 'bun:test'
import { rejects } from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { runViewSchema } from '@sistemazero/marketing-contracts'
import { editorialBatch } from '../src/domain/workspace/editorial-proposal'

function fixture() {
  const projectId = randomUUID(),
    entityId = randomUUID(),
    actor = randomUUID(),
    evidenceId = randomUUID()
  return runViewSchema.parse({
    request: {
      schemaVersion: 1,
      operationId: randomUUID(),
      id: randomUUID(),
      projectId,
      entityId,
      revisionId: randomUUID(),
      intent: 'adjust',
      capability: 'copy',
      provider: 'codex',
      instruction: 'Analise a coleta',
      selection: [],
      protectedIds: [],
      contextHash: 'a'.repeat(64),
      limits: {},
    },
    context: {
      schemaVersion: 1,
      source: {
        id: randomUUID(),
        projectId,
        entityId,
        parentRevisionId: null,
        createdBy: actor,
        createdAt: new Date().toISOString(),
        document: {
          schemaVersion: 1,
          kind: 'analysis',
          title: 'Resultados',
          body: 'Análise pendente.',
          objective: 'Definir próximo experimento',
          hypothesis: '',
          evidenceIds: [evidenceId],
          proposedPieceId: null,
          analysisType: 'research',
          basis: [{ entityId: randomUUID(), revisionId: randomUUID() }],
        },
      },
      selected: [],
      ancestors: [],
      directions: [],
      evidence: [],
      protectedIds: [],
    },
    state: 'succeeded',
    epoch: 1,
    createdBy: actor,
    createdAt: new Date().toISOString(),
    attempt: null,
    leaseExpired: false,
    outcome: {
      status: 'succeeded',
      text: 'Análise',
      assetIds: [],
      mode: 'fixture',
      durationMs: 1,
      inputTokens: null,
      outputTokens: null,
      editorial: {
        schemaVersion: 1,
        kind: 'copy',
        summary: 'Análise da coleta',
        variants: [
          {
            label: 'Próximo experimento',
            changes: [
              {
                entityId,
                field: 'body',
                value:
                  '36 salvamentos / 1200 visualizações = 3%. Comentários ausentes. Não há evidência de causalidade.',
              },
              {
                entityId,
                field: 'hypothesis',
                value:
                  'Uma demonstração curta pode aumentar a razão de salvamentos por visualização.',
              },
            ],
          },
        ],
      },
    },
  })
}
test('análise estruturada altera texto e hipótese preservando origem, objetivo e vínculo de pauta', async () => {
  const run = fixture()
  if (run.context.source.document.kind !== 'analysis') throw new Error('Análise ausente')
  const batch = await editorialBatch(run, 0)
  const change = batch.changes[0]
  expect(change?.baseRevisionId).toBe(run.context.source.id)
  expect(change?.document).toEqual({
    ...run.context.source.document,
    body: '36 salvamentos / 1200 visualizações = 3%. Comentários ausentes. Não há evidência de causalidade.',
    hypothesis: 'Uma demonstração curta pode aumentar a razão de salvamentos por visualização.',
  })
})
test('análise protegida ou evidência fora da seleção não recebe alteração da IA', async () => {
  const run = fixture()
  run.context.protectedIds = [run.context.source.entityId]
  await rejects(() => editorialBatch(run, 0), /fora da seleção/)
  run.context.protectedIds = []
  if (run.outcome?.status !== 'succeeded' || run.outcome.editorial?.kind !== 'copy')
    throw new Error('Fixture inválida')
  const change = run.outcome.editorial.variants[0]?.changes[0]
  if (!change) throw new Error('Mudança ausente')
  change.entityId = randomUUID()
  await rejects(() => editorialBatch(run, 0), /fora da seleção/)
})
test('campos de outro documento não podem ser introduzidos na análise', async () => {
  const run = fixture()
  if (run.outcome?.status !== 'succeeded' || run.outcome.editorial?.kind !== 'copy')
    throw new Error('Fixture inválida')
  const change = run.outcome.editorial.variants[0]?.changes[0]
  if (!change) throw new Error('Mudança ausente')
  change.field = 'caption'
  await rejects(() => editorialBatch(run, 0), /Campo não editável/)
})
