import {
  batchOperationSchema,
  type EditorialBatch,
  type EditorialDocument,
  type ExecutionRun,
  type Revision,
  stableEditorialId,
} from '@sistemazero/marketing-contracts'
import { artBatch } from './art-proposal'
import { videoAdaptationBatch } from './video-adaptation'
import { videoBatch } from './video-proposal'
import { WorkspaceError } from './workspace-error'

export function frozenRevisions(run: ExecutionRun): Revision[] {
  return [
    ...new Map(
      [
        run.context.source,
        ...run.context.ancestors,
        ...run.context.selected,
        ...run.context.directions,
        ...run.context.evidence,
        ...run.context.memory,
      ].map((revision) => [revision.entityId, revision]),
    ).values(),
  ]
}
export function preserveProtected(before: EditorialDocument, after: EditorialDocument) {
  if (before.kind !== 'component' || after.kind !== 'component') return
  if (
    JSON.stringify(before.protectedText) !== JSON.stringify(after.protectedText) ||
    before.protectedText.some((text) => !after.body.includes(text))
  )
    throw new WorkspaceError(
      'PROTECTED_CONTENT',
      'O ajuste alterou um trecho protegido. A revisão anterior foi preservada.',
    )
}
export async function editorialBatch(
  run: ExecutionRun,
  variantIndex: number,
): Promise<EditorialBatch> {
  if (run.outcome?.status === 'succeeded' && run.outcome.video)
    return run.request.capability === 'video-adapt'
      ? videoAdaptationBatch(run, variantIndex)
      : videoBatch(run, variantIndex)
  if (run.outcome?.status === 'succeeded' && run.outcome.art)
    return artBatch(run, variantIndex, frozenRevisions(run))
  const proposal = run.outcome?.status === 'succeeded' ? run.outcome.editorial : undefined
  if (!proposal)
    throw new WorkspaceError(
      'INVALID_RESULT',
      'Este pedido não tem uma proposta editorial validada',
    )
  if (
    proposal.variants.length > run.request.limits.maxVariants ||
    (run.request.intent === 'adjust' && proposal.variants.length !== 1) ||
    (run.request.intent === 'adapt') !== (proposal.kind === 'adapt')
  )
    throw new WorkspaceError('INVALID_RESULT', 'O resultado não corresponde ao escopo solicitado')
  const namespace = `${run.request.projectId}:apply:${run.request.id}:${variantIndex}`
  const changes: EditorialBatch['changes'] = []
  const revisions = frozenRevisions(run),
    byId = new Map(revisions.map((revision) => [revision.entityId, revision]))
  const editable = new Set([
    run.context.source.entityId,
    ...run.context.selected.map((revision) => revision.entityId),
  ])
  if (proposal.kind === 'copy') {
    const variant = proposal.variants[variantIndex]
    if (!variant) throw new WorkspaceError('INVALID_RESULT', 'Alternativa inexistente')
    const changed = new Map<string, EditorialDocument>()
    for (const change of variant.changes) {
      const source = byId.get(change.entityId)
      if (
        !source ||
        !editable.has(change.entityId) ||
        run.context.protectedIds.includes(change.entityId)
      )
        throw new WorkspaceError(
          'PROTECTED_CONTENT',
          'O resultado tentou alterar um item fora da seleção',
        )
      const doc = changed.get(change.entityId) ?? source.document
      if (
        doc.kind === 'piece' &&
        doc.conversation &&
        (change.field === 'conversationOpening' || change.field === 'conversationOffer')
      )
        changed.set(change.entityId, {
          ...doc,
          conversation: {
            ...doc.conversation,
            [change.field === 'conversationOpening' ? 'opening' : 'offer']: change.value,
          },
        })
      else if (doc.kind === 'component' && (change.field === 'body' || change.field === 'title'))
        changed.set(change.entityId, {
          ...doc,
          [change.field]: change.value,
          ...(doc[change.field] !== change.value
            ? {
                assetIds: [],
                referenceAssetIds: [
                  ...new Set([
                    ...(doc.referenceAssetIds ?? []),
                    ...(!doc.composition ? doc.assetIds : []),
                  ]),
                ],
              }
            : {}),
        })
      else if (
        doc.kind === 'representation' &&
        ['caption', 'cta', 'alt', 'title'].includes(change.field)
      )
        changed.set(change.entityId, { ...doc, [change.field]: change.value })
      else throw new WorkspaceError('INVALID_RESULT', 'Campo não editável nesta peça')
    }
    for (const [entityId, document] of changed) {
      const source = byId.get(entityId)
      if (!source) throw new Error('Revisão de origem ausente')
      preserveProtected(source.document, document)
      const protectedTerms = run.context.directions.flatMap((revision) =>
        revision.document.kind === 'direction' ? revision.document.protectedTerms : [],
      )
      const originalDocument = source.document
      if (
        originalDocument.kind === 'component' &&
        document.kind === 'component' &&
        protectedTerms.some(
          (term) => originalDocument.body.includes(term) && !document.body.includes(term),
        )
      )
        throw new WorkspaceError('PROTECTED_CONTENT', 'Um termo protegido da direção foi removido')
      changes.push({ entityId, baseRevisionId: source.id, action: 'save', document })
    }
  } else {
    const variant = proposal.variants[variantIndex]
    if (!variant) throw new WorkspaceError('INVALID_RESULT', 'Alternativa inexistente')
    const representations = revisions.filter(
      (revision) => revision.document.kind === 'representation',
    )
    const source = representations.length === 1 ? representations[0] : undefined
    const piece = revisions.find((revision) => revision.document.kind === 'piece')
    if (source?.document.kind !== 'representation' || piece?.document.kind !== 'piece')
      throw new WorkspaceError('INVALID_RESULT', 'Selecione um formato da peça para adaptar')
    const originalComponents = revisions.filter(
      (revision) =>
        revision.document.kind === 'component' &&
        revision.document.representationId === source.entityId,
    )
    const protectedTerms = run.context.directions.flatMap((revision) =>
      revision.document.kind === 'direction' ? revision.document.protectedTerms : [],
    )
    // A derived format must carry the protected content even when the model omits
    // its provenance. Otherwise dropping sourceComponentId would bypass validation.
    for (const original of originalComponents) {
      if (original.document.kind !== 'component') continue
      const derived = variant.components.filter(
        (component) => component.sourceComponentId === original.entityId,
      )
      const required =
        original.document.protectedText.length > 0 ||
        run.context.protectedIds.includes(original.entityId) ||
        protectedTerms.some(
          (term) => original.document.kind === 'component' && original.document.body.includes(term),
        )
      if (required && derived.length !== 1)
        throw new WorkspaceError(
          'PROTECTED_CONTENT',
          'A adaptação deve conservar cada componente protegido e sua origem',
        )
      for (const component of derived) {
        if (
          run.context.protectedIds.includes(original.entityId) &&
          (component.body !== original.document.body || component.title !== original.document.title)
        )
          throw new WorkspaceError(
            'PROTECTED_CONTENT',
            'Um componente excluído do ajuste foi alterado na adaptação',
          )
        if (
          protectedTerms.some(
            (term) =>
              original.document.kind === 'component' &&
              original.document.body.includes(term) &&
              !component.body.includes(term),
          )
        )
          throw new WorkspaceError(
            'PROTECTED_CONTENT',
            'Um termo protegido da direção foi removido',
          )
      }
    }
    const representationId = await stableEditorialId(`${namespace}:representation`)
    const componentIds = await Promise.all(
      variant.components.map((_component, index) =>
        stableEditorialId(`${namespace}:component:${index}`),
      ),
    )
    changes.push({
      entityId: piece.entityId,
      baseRevisionId: piece.id,
      action: 'save',
      document: {
        ...piece.document,
        representationIds: [...piece.document.representationIds, representationId],
        state: 'draft',
      },
    })
    changes.push({
      entityId: representationId,
      baseRevisionId: null,
      action: 'save',
      document: {
        schemaVersion: 1,
        kind: 'representation',
        title: variant.title,
        pieceId: piece.entityId,
        format: variant.format,
        medium: variant.medium,
        componentIds,
        sourceRevisionId: source.id,
        caption: variant.caption,
        cta: variant.cta,
        alt: variant.alt,
      },
    })
    for (const [index, component] of variant.components.entries()) {
      const original = component.sourceComponentId
        ? byId.get(component.sourceComponentId)
        : undefined
      if (
        component.sourceComponentId &&
        (original?.document.kind !== 'component' ||
          original.document.representationId !== source.entityId)
      )
        throw new WorkspaceError(
          'INVALID_RESULT',
          'Referência de componente fora do formato de origem',
        )
      const entityId = componentIds[index]
      if (!entityId) throw new Error('Identidade de componente ausente')
      const document: EditorialDocument = {
        schemaVersion: 1,
        kind: 'component',
        title: component.title,
        representationId,
        componentType: component.componentType,
        body: component.body,
        assetIds: original?.document.kind === 'component' ? original.document.assetIds : [],
        protectedText:
          original?.document.kind === 'component' ? original.document.protectedText : [],
        sourceRevisionId: original?.id ?? null,
      }
      if (original) preserveProtected(original.document, document)
      changes.push({ entityId, baseRevisionId: null, action: 'save', document })
    }
  }
  return batchOperationSchema.parse({
    schemaVersion: 1,
    projectId: run.request.projectId,
    operationId: await stableEditorialId(`${namespace}:save`),
    changes,
  })
}
