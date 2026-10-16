import {
  batchOperationSchema,
  type EditorialBatch,
  type ExecutionRun,
  stableEditorialId,
} from '@sistemazero/marketing-contracts'
export async function researchBatch(run: ExecutionRun): Promise<EditorialBatch> {
  if (run.outcome?.status !== 'succeeded' || !run.outcome.research)
    throw new Error('Pesquisa confirmada indisponível')
  const { result, searchedAt } = run.outcome.research,
    projectId = run.request.projectId,
    namespace = `${projectId}:research:${run.request.id}`
  const evidenceIds = await Promise.all(
    result.findings.map((_finding, index) => stableEditorialId(`${namespace}:finding:${index}`)),
  )
  const changes: EditorialBatch['changes'] = result.findings.map((finding, index) => {
    const id = evidenceIds[index],
      url = finding.sourceUrls[0],
      source = result.sources.find((source) => source.url === url)
    if (!id || !url || !source) throw new Error('Fonte da pesquisa ausente')
    return {
      entityId: id,
      action: 'save',
      baseRevisionId: null,
      document: {
        schemaVersion: 1,
        kind: 'evidence',
        title: finding.claim.slice(0, 300),
        body: [
          finding.claim,
          ...(finding.quote ? [`Citação atribuída à fonte: ${finding.quote}`] : []),
          ...finding.sourceUrls.slice(1),
        ].join('\n\n'),
        classification: finding.classification,
        source: {
          label: source.title,
          url,
          observedAt: searchedAt,
          sourceKey: `research:${run.request.id}:${index}`,
        },
        product: '',
        validity: 'unverified',
        tags: ['pesquisa-assistida'],
      },
    }
  })
  const basis = [
    run.context.source,
    ...run.context.ancestors,
    ...run.context.selected,
    ...run.context.directions,
    ...run.context.evidence,
  ].map((revision) => ({ entityId: revision.entityId, revisionId: revision.id }))
  changes.push({
    entityId: await stableEditorialId(`${namespace}:analysis`),
    action: 'save',
    baseRevisionId: null,
    document: {
      schemaVersion: 1,
      kind: 'analysis',
      title: result.title,
      body: result.summary,
      objective: run.request.instruction.slice(0, 2000),
      evidenceIds,
      hypothesis: result.hypothesis,
      proposedPieceId: null,
      analysisType: 'research',
      basis,
    },
  })
  if (result.proposedDirection)
    changes.push({
      entityId: await stableEditorialId(`${namespace}:direction`),
      action: 'save',
      baseRevisionId: null,
      document: {
        schemaVersion: 1,
        kind: 'direction',
        title: `Proposta: ${result.title}`.slice(0, 300),
        body: result.proposedDirection,
        objective: run.request.instruction.slice(0, 2000),
        audience: '',
        voice: '',
        protectedTerms: [],
        referenceIds: evidenceIds,
        status: 'draft',
      },
    })
  return batchOperationSchema.parse({
    schemaVersion: 1,
    projectId,
    operationId: await stableEditorialId(`${namespace}:save`),
    changes,
  })
}
