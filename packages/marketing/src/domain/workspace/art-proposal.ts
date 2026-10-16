import {
  artAssetIds,
  batchOperationSchema,
  CDC_ART_LABELS,
  canonicalJson,
  type ExecutionRun,
  type Revision,
  stableEditorialId,
} from '@sistemazero/marketing-contracts'
import { references } from './references'
import { WorkspaceError } from './workspace-error'
export async function artBatch(run: ExecutionRun, index: number, revisions: Revision[]) {
  const proposal = run.outcome?.status === 'succeeded' ? run.outcome.art : undefined,
    variant = proposal?.variants[index]
  if (!proposal || !variant || proposal.variants.length > run.request.limits.maxVariants)
    throw new WorkspaceError('INVALID_RESULT', 'Proposta visual inválida')
  if (!['image', 'image-edit', 'layout', 'render', 'capture'].includes(run.request.capability))
    throw new WorkspaceError('INVALID_RESULT', 'Este pedido não autoriza alterar a arte')
  if (run.request.intent === 'adapt')
    throw new WorkspaceError(
      'INVALID_RESULT',
      'Adapte primeiro o formato e depois produza a nova arte',
    )
  if (run.request.intent === 'adjust' && proposal.variants.length !== 1)
    throw new WorkspaceError('INVALID_RESULT', 'O ajuste precisa de uma única proposta')
  const source = revisions.find((revision) => revision.entityId === variant.componentId)
  if (
    source?.document.kind !== 'component' ||
    run.context.protectedIds.includes(source.entityId) ||
    ![
      run.context.source.entityId,
      ...run.context.selected.map((revision) => revision.entityId),
    ].includes(source.entityId)
  )
    throw new WorkspaceError('PROTECTED_CONTENT', 'A arte está fora do escopo editável')
  if (
    run.request.capability === 'render' &&
    variant.alt !== (source.document.alt ?? source.document.body.slice(0, 4000))
  )
    throw new WorkspaceError(
      'INVALID_RESULT',
      'A exportação deve conservar a descrição alternativa',
    )
  if (!variant.composition) {
    if (
      !['image-edit', 'render'].includes(run.request.capability) ||
      source.document.composition ||
      !variant.finalAssetId ||
      run.outcome?.status !== 'succeeded' ||
      !run.outcome.assetIds.includes(variant.finalAssetId)
    )
      throw new WorkspaceError(
        'INVALID_RESULT',
        'Uma edição raster exige imagem de origem sem montagem e uma saída confirmada',
      )
    return batchOperationSchema.parse({
      schemaVersion: 1,
      operationId: await stableEditorialId(
        `${run.request.projectId}:art:${run.request.id}:${index}`,
      ),
      projectId: run.request.projectId,
      changes: [
        {
          entityId: source.entityId,
          baseRevisionId: source.id,
          action: 'save',
          document: { ...source.document, assetIds: [variant.finalAssetId], alt: variant.alt },
        },
      ],
    })
  }
  const allowedLabels = new Set(
    source.document.composition?.layers.flatMap((layer) =>
      layer.kind === 'text' && layer.source === 'literal' ? [layer.text] : [],
    ) ?? [],
  )
  const selectedRecipe = run.request.capability === 'layout' ? run.request.artRecipeId : undefined
  if (selectedRecipe) {
    if (variant.composition.designRecipeId !== selectedRecipe)
      throw new WorkspaceError('INVALID_RESULT', 'A montagem não corresponde à receita escolhida')
    for (const label of CDC_ART_LABELS) allowedLabels.add(label)
    if (
      CDC_ART_LABELS.some(
        (text) =>
          variant.composition?.layers.filter(
            (layer) =>
              layer.kind === 'text' &&
              layer.source === 'literal' &&
              layer.text === text &&
              layer.protected,
          ).length !== 1,
      )
    )
      throw new WorkspaceError(
        'PROTECTED_CONTENT',
        'A receita precisa conservar sua identificação protegida',
      )
  } else if (variant.composition.designRecipeId !== source.document.composition?.designRecipeId) {
    throw new WorkspaceError('INVALID_RESULT', 'Escolha a receita antes de mudar sua identificação')
  }
  if (
    variant.composition.layers.some(
      (layer) =>
        layer.kind === 'text' && layer.source === 'literal' && !allowedLabels.has(layer.text),
    )
  )
    throw new WorkspaceError(
      'PROTECTED_CONTENT',
      'Um ajuste visual não pode introduzir texto fora da copy',
    )
  if (
    run.request.capability === 'render' &&
    (!variant.finalAssetId ||
      canonicalJson(variant.composition) !== canonicalJson(source.document.composition ?? null))
  )
    throw new WorkspaceError(
      'INVALID_RESULT',
      'O render precisa corresponder à composição selecionada',
    )
  if (run.request.capability !== 'render' && variant.finalAssetId)
    throw new WorkspaceError('INVALID_RESULT', 'A arte final exige render da composição confirmada')
  for (const layer of source.document.composition?.layers ?? []) {
    if (
      layer.protected &&
      canonicalJson(layer) !==
        canonicalJson(
          variant.composition.layers.find((candidate) => candidate.id === layer.id) ?? null,
        )
    )
      throw new WorkspaceError('PROTECTED_CONTENT', 'Uma camada protegida foi modificada')
  }
  const paragraphs = source.document.body.split(/\n\s*\n/),
    coverage = new Map<number, number>()
  for (const layer of variant.composition.layers) {
    if (layer.kind !== 'text' || layer.source !== 'body') continue
    for (const index of layer.paragraphs.length
      ? layer.paragraphs
      : paragraphs.map((_text, index) => index))
      coverage.set(index, (coverage.get(index) ?? 0) + 1)
  }
  if (
    source.document.body.trim() &&
    (paragraphs.some((_text, index) => coverage.get(index) !== 1) ||
      [...coverage.keys()].some((index) => index >= paragraphs.length))
  )
    throw new WorkspaceError(
      'PROTECTED_CONTENT',
      'A montagem deve apresentar toda a copy, uma vez, sem omitir nem duplicar parágrafos',
    )
  const originalAssets = new Set(
    revisions.flatMap((revision) => references(revision.document).assets),
  )
  const createdAssets = new Set(run.outcome?.status === 'succeeded' ? run.outcome.assetIds : [])
  if (
    artAssetIds(variant.composition).some((id) => !originalAssets.has(id) && !createdAssets.has(id))
  )
    throw new WorkspaceError(
      'INVALID_RESULT',
      'A composição usa um arquivo fora das referências do pedido',
    )
  if (variant.finalAssetId && !createdAssets.has(variant.finalAssetId))
    throw new WorkspaceError('INVALID_RESULT', 'A saída final não foi produzida por este pedido')
  return batchOperationSchema.parse({
    schemaVersion: 1,
    operationId: await stableEditorialId(`${run.request.projectId}:art:${run.request.id}:${index}`),
    projectId: run.request.projectId,
    changes: [
      {
        entityId: source.entityId,
        baseRevisionId: source.id,
        action: 'save',
        document: {
          ...source.document,
          composition: variant.composition,
          alt: variant.alt,
          assetIds: variant.finalAssetId ? [variant.finalAssetId] : [],
        },
      },
    ],
  })
}
