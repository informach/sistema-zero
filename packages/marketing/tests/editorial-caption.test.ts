import { expect, test } from 'bun:test'
import { rejects } from 'node:assert/strict'
import { createPieceBatch, editorialCaption, runViewSchema } from '@sistemazero/marketing-contracts'
import { editorialBatch } from '../src/domain/workspace/editorial-proposal'

function fixture() {
  const projectId = crypto.randomUUID(),
    actor = crypto.randomUUID()
  const batch = createPieceBatch({
    projectId,
    title: 'Legenda',
    brief: '',
    format: 'feed',
    medium: 'text',
  })
  const revisions = batch.changes.map((change) => ({
    id: crypto.randomUUID(),
    projectId,
    entityId: change.entityId,
    parentRevisionId: null,
    createdBy: actor,
    createdAt: new Date().toISOString(),
    document: change.document,
  }))
  const representation = revisions.find((revision) => revision.document?.kind === 'representation')
  const caption = revisions.find((revision) => revision.document?.kind === 'component')
  const piece = revisions.find((revision) => revision.document?.kind === 'piece')
  if (
    representation?.document?.kind !== 'representation' ||
    caption?.document?.kind !== 'component' ||
    !piece
  )
    throw new Error('Fixture inválida')
  caption.document.componentType = 'caption'
  caption.document.body = 'Legenda de origem.'
  representation.document.caption = 'Campo legado.'
  return runViewSchema.parse({
    request: {
      schemaVersion: 1,
      operationId: crypto.randomUUID(),
      id: crypto.randomUUID(),
      projectId,
      entityId: representation.entityId,
      revisionId: representation.id,
      intent: 'adjust',
      capability: 'copy',
      provider: 'codex',
      instruction: 'Melhore a legenda',
      selection: [],
      protectedIds: [],
      contextHash: 'a'.repeat(64),
      limits: {},
    },
    context: {
      schemaVersion: 1,
      source: representation,
      selected: [caption],
      ancestors: [piece],
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
      text: 'Legenda revisada',
      assetIds: [],
      mode: 'teste de domínio',
      durationMs: 1,
      inputTokens: null,
      outputTokens: null,
      editorial: {
        schemaVersion: 1,
        kind: 'copy',
        summary: 'Ajuste da legenda',
        variants: [
          {
            label: 'Revisada',
            changes: [
              { entityId: representation.entityId, field: 'caption', value: 'Texto revisto.' },
            ],
          },
        ],
      },
    },
  })
}
test('pedido de IA para legenda altera sua revisão canônica e respeita seleção, proteção e ambiguidades', async () => {
  const run = fixture(),
    caption = run.context.selected[0],
    representation = run.context.source.document
  if (!caption || representation.kind !== 'representation') throw new Error('Fixture inválida')
  expect(editorialCaption(representation, run.context.selected)).toBe('Legenda de origem.')
  const applied = await editorialBatch(run, 0)
  expect(applied.changes).toHaveLength(1)
  expect(applied.changes[0]).toMatchObject({
    entityId: caption.entityId,
    baseRevisionId: caption.id,
    document: { body: 'Texto revisto.' },
  })
  await rejects(
    editorialBatch({ ...run, context: { ...run.context, protectedIds: [caption.entityId] } }, 0),
    /protegida/,
  )
  await rejects(
    editorialBatch({ ...run, context: { ...run.context, selected: [] } }, 0),
    /Selecione a legenda/,
  )
  if (
    run.outcome?.status !== 'succeeded' ||
    run.outcome.editorial?.kind !== 'copy' ||
    !run.outcome.editorial.variants[0]
  )
    throw new Error('Proposta ausente')
  run.outcome.editorial.variants[0].changes.push({
    entityId: caption.entityId,
    field: 'body',
    value: 'Outra proposta.',
  })
  await rejects(editorialBatch(run, 0), /duas alterações/)
  if (caption.document.kind !== 'component') throw new Error('Legenda ausente')
  expect(
    editorialCaption(representation, [{ ...caption, document: { ...caption.document, body: '' } }]),
  ).toBe('')
  expect(editorialCaption({ ...representation, componentIds: [] }, [])).toBe('Campo legado.')
})
