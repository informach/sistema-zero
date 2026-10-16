import type {
  ExecutionContext,
  ExecutionOutcome,
  ExecutionRequest,
} from '@sistemazero/marketing-contracts'
import {
  compositionSceneInput,
  rasterExport,
  videoAssetIds,
} from '@sistemazero/marketing-contracts'
import { references } from './references'
import { WorkspaceError } from './workspace-error'

export function validateVisualRequest(request: ExecutionRequest, context: ExecutionContext) {
  const source = context.source.document
  if (request.imageFormat && (request.capability !== 'render' || source.kind !== 'component'))
    throw new WorkspaceError(
      'INVALID_OPERATION',
      'O formato de imagem pertence à exportação da arte',
    )
  if (
    request.videoTarget &&
    (!['video-edit', 'composition'].includes(request.capability) ||
      source.kind !== 'video' ||
      !source.timeline.clips.some((clip) => clip.id === request.videoTarget?.clipId))
  )
    throw new WorkspaceError('INVALID_OPERATION', 'O alvo da edição não pertence a esta montagem')
  if (request.reviseCaptions && request.capability !== 'video-edit')
    throw new WorkspaceError(
      'INVALID_OPERATION',
      'A revisão de legendas pertence à edição de vídeo',
    )
  if (request.captionSourceAssetId && request.capability !== 'transcribe')
    throw new WorkspaceError('INVALID_OPERATION', 'O SRT pertence ao pedido de legendas')
  if (request.capability === 'video-adapt') {
    if (
      source.kind !== 'component' ||
      request.intent !== 'adapt' ||
      request.imageRegion ||
      request.visualLayerId ||
      request.artRecipeId
    )
      throw new WorkspaceError('INVALID_OPERATION', 'Selecione uma arte para transformar em vídeo')
    if (context.protectedIds.includes(context.source.entityId))
      throw new WorkspaceError('PROTECTED_CONTENT', 'Esta arte está protegida')
    if (!source.composition) {
      const images = (context.assets ?? []).filter(
        (asset) => source.assetIds.includes(asset.id) && asset.mime.startsWith('image/'),
      )
      const image = request.sourceAssetId
        ? images.find((asset) => asset.id === request.sourceAssetId)
        : images.length === 1
          ? images[0]
          : undefined
      if (!image?.width || !image.height)
        throw new WorkspaceError(
          'INVALID_OPERATION',
          'Selecione um arquivo final de imagem confirmado ou crie a montagem antes de animar',
        )
    }
    return
  }
  if (
    ['video-edit', 'composition', 'transcribe', 'prepare-media'].includes(request.capability) ||
    (request.capability === 'render' && source.kind === 'video')
  ) {
    if (source.kind !== 'video' || request.intent === 'adapt')
      throw new WorkspaceError(
        'INVALID_OPERATION',
        'Selecione uma montagem de vídeo para este pedido',
      )
    if (context.protectedIds.includes(context.source.entityId))
      throw new WorkspaceError('PROTECTED_CONTENT', 'Este vídeo está protegido')
    if (request.imageRegion || request.visualLayerId || request.artRecipeId)
      throw new WorkspaceError(
        'INVALID_OPERATION',
        'Este pedido de vídeo não aceita opções de edição de imagem',
      )
    if (!['video-edit', 'composition'].includes(request.capability) && request.intent !== 'adjust')
      throw new WorkspaceError('INVALID_OPERATION', 'Render e transcrição usam a montagem atual')
    if (request.capability === 'composition') {
      const clip = source.timeline.clips.find((item) => item.id === request.videoTarget?.clipId)
      if (
        !clip ||
        request.sourceAssetId ||
        request.captionSourceAssetId ||
        request.reviseCaptions ||
        (request.videoTarget?.part === 'text' && !clip.generated)
      )
        throw new WorkspaceError(
          'INVALID_OPERATION',
          'Escolha uma cena gráfica para criar ou ajustar a animação',
        )
      try {
        compositionSceneInput(source.timeline, clip)
      } catch (error) {
        throw new WorkspaceError(
          'INVALID_OPERATION',
          error instanceof Error ? error.message : 'Cena inválida',
        )
      }
    }
    const allowed = new Set([
      ...videoAssetIds(source.timeline),
      ...(source.referenceAssetIds ?? []),
    ])
    if (request.sourceAssetId || ['transcribe', 'prepare-media'].includes(request.capability)) {
      const asset = context.assets?.find(
        (asset) => asset.id === request.sourceAssetId && allowed.has(asset.id),
      )
      if (!asset || !(asset.mime.startsWith('video/') || asset.mime.startsWith('audio/')))
        throw new WorkspaceError('INVALID_OPERATION', 'Selecione uma gravação vinculada à montagem')
    }
    if (request.captionSourceAssetId) {
      const srt = context.assets?.find(
        (asset) => asset.id === request.captionSourceAssetId && allowed.has(asset.id),
      )
      if (srt?.mime !== 'text/plain' || srt.size > 2_000_000)
        throw new WorkspaceError('INVALID_OPERATION', 'Selecione um SRT confirmado de até 2 MB')
    }
    return
  }
  if (request.artRecipeId && request.capability !== 'layout')
    throw new WorkspaceError('INVALID_OPERATION', 'A receita visual pertence ao pedido de montagem')
  if (request.imageRegion && request.capability !== 'image-edit')
    throw new WorkspaceError(
      'INVALID_OPERATION',
      'Uma região só pode ser usada para editar uma imagem existente',
    )
  if (!['image', 'image-edit', 'layout', 'render', 'capture'].includes(request.capability)) return
  if (source.kind !== 'component')
    throw new WorkspaceError('INVALID_OPERATION', 'Selecione um componente para trabalhar na arte')
  if (request.intent === 'adapt')
    throw new WorkspaceError(
      'INVALID_OPERATION',
      'Adapte primeiro a copy para o novo formato e depois produza a arte',
    )
  if (request.capability === 'render' && request.intent !== 'adjust')
    throw new WorkspaceError(
      'INVALID_OPERATION',
      'Renderize a composição atual com um pedido de ajuste',
    )
  if (request.capability === 'render' && !source.composition) {
    if (request.imageFormat !== 'jpeg')
      throw new WorkspaceError(
        'INVALID_OPERATION',
        'Uma arte sem montagem pode ser convertida para JPEG; o original permanece no histórico',
      )
    try {
      rasterExport(context.source, context.assets ?? [], request.sourceAssetId)
    } catch (error) {
      throw new WorkspaceError(
        'INVALID_OPERATION',
        error instanceof Error ? error.message : 'Imagem de origem inválida',
      )
    }
  }
  if (context.protectedIds.includes(context.source.entityId))
    throw new WorkspaceError('PROTECTED_CONTENT', 'Este componente está protegido')
  if (request.capability === 'capture') {
    const allowed = new Set(
      [context.source, ...context.selected, ...context.evidence].flatMap(
        (revision) => references(revision.document).assets,
      ),
    )
    if (
      !request.sourceAssetId ||
      !allowed.has(request.sourceAssetId) ||
      request.intent !== 'adjust'
    )
      throw new WorkspaceError(
        'INVALID_OPERATION',
        'Selecione um projeto Studio vinculado à peça e use Ajustar para capturar',
      )
  }
  if (['image', 'image-edit', 'capture'].includes(request.capability)) {
    const layers = source.composition?.layers.filter((layer) => layer.kind === 'image') ?? []
    const selected = request.visualLayerId
      ? layers.find((layer) => layer.id === request.visualLayerId)
      : layers.length === 1
        ? layers[0]
        : undefined
    if ((request.visualLayerId && !selected) || (source.composition && !selected))
      throw new WorkspaceError(
        'INVALID_OPERATION',
        'Selecione uma camada de imagem existente na composição',
      )
    if (selected?.protected)
      throw new WorkspaceError('PROTECTED_CONTENT', 'Esta camada de imagem está protegida')
    if (request.capability === 'image-edit' && !selected) {
      const candidates = [...new Set([...source.assetIds, ...(source.referenceAssetIds ?? [])])]
      if (
        request.sourceAssetId
          ? !candidates.includes(request.sourceAssetId)
          : candidates.length !== 1
      )
        throw new WorkspaceError(
          'INVALID_OPERATION',
          'Selecione uma imagem de origem vinculada ao componente antes de editar',
        )
    }
  }
}

export function validateOutcomeCapability(request: ExecutionRequest, outcome: ExecutionOutcome) {
  if (outcome.status !== 'succeeded') return
  if (
    (outcome.art &&
      !['layout', 'image', 'image-edit', 'render', 'capture'].includes(request.capability)) ||
    (outcome.editorial && request.capability !== 'copy') ||
    (outcome.research && request.capability !== 'research') ||
    (outcome.capture && request.capability !== 'capture') ||
    (outcome.video &&
      ![
        'video-edit',
        'composition',
        'video-adapt',
        'transcribe',
        'render',
        'prepare-media',
      ].includes(request.capability)) ||
    (outcome.mediaPreparation && request.capability !== 'prepare-media') ||
    (outcome.recordingAnalysis &&
      (!outcome.video || !['video-edit', 'transcribe', 'render'].includes(request.capability))) ||
    (outcome.render && request.capability !== 'render') ||
    [outcome.art, outcome.editorial, outcome.research, outcome.video].filter(Boolean).length > 1
  )
    throw new WorkspaceError(
      'INVALID_RESULT',
      'O resultado altera um tipo de conteúdo não autorizado pelo pedido',
    )
  if (
    request.capability === 'capture' &&
    (!outcome.capture ||
      outcome.capture.sourceAssetId !== request.sourceAssetId ||
      !outcome.assetIds.includes(outcome.capture.assetId))
  )
    throw new WorkspaceError(
      'INVALID_RESULT',
      'A captura precisa identificar o original e a imagem produzida',
    )
  if (['layout', 'image', 'image-edit', 'capture'].includes(request.capability) && !outcome.art)
    throw new WorkspaceError(
      'INVALID_RESULT',
      'O resultado visual precisa de uma composição editável',
    )
  if (
    (['video-edit', 'composition', 'video-adapt', 'transcribe', 'prepare-media'].includes(
      request.capability,
    ) &&
      !outcome.video) ||
    (request.capability === 'composition' && !outcome.assetIds.length) ||
    (request.capability === 'prepare-media' &&
      (!outcome.mediaPreparation || !outcome.assetIds.length)) ||
    (request.capability === 'render' && ((!outcome.video && !outcome.art) || !outcome.render))
  )
    throw new WorkspaceError(
      'INVALID_RESULT',
      'O resultado precisa identificar a montagem produzida',
    )
}
