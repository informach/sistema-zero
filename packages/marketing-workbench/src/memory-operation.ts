import {
  type EditorialOperation,
  type ExecutionRun,
  operationSchema,
  stableEditorialId,
} from '@sistemazero/marketing-contracts'
export async function memoryOperation(
  run: ExecutionRun,
  analysisType: 'summary' | 'decision',
): Promise<EditorialOperation> {
  if (run.outcome?.status !== 'succeeded' || !run.outcome.text.trim())
    throw new Error('Resultado confirmado indisponível')
  const basis = [
    ...new Map(
      [
        run.context.source,
        ...run.context.ancestors,
        ...run.context.selected,
        ...run.context.directions,
        ...run.context.evidence,
      ]
        .filter((revision) => revision.document.kind !== 'analysis')
        .map((revision) => [revision.entityId, revision]),
    ).values(),
  ]
  const namespace = `${run.request.projectId}:${run.request.id}:${analysisType}`
  return operationSchema.parse({
    schemaVersion: 1,
    operationId: await stableEditorialId(`${namespace}:save`),
    projectId: run.request.projectId,
    entityId: await stableEditorialId(namespace),
    baseRevisionId: null,
    action: 'save',
    document: {
      schemaVersion: 1,
      kind: 'analysis',
      title:
        `${analysisType === 'summary' ? 'Resumo' : 'Decisão'}: ${run.context.source.document.title}`.slice(
          0,
          300,
        ),
      body: run.outcome.text,
      objective: run.request.instruction.slice(0, 2000),
      analysisType,
      evidenceIds: basis
        .filter((revision) => revision.document.kind === 'evidence')
        .map((revision) => revision.entityId),
      basis: basis.map((revision) => ({ entityId: revision.entityId, revisionId: revision.id })),
      hypothesis: '',
      proposedPieceId: null,
    },
  })
}
