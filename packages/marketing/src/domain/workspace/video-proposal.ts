import {
  type AssetManifest,
  artText,
  batchOperationSchema,
  canonicalJson,
  type ExecutionRun,
  preparedAssetIds,
  stableEditorialId,
  videoAssetIds,
} from '@sistemazero/marketing-contracts'
import { validateCompositionResult } from './composition-result'
import { WorkspaceError } from './workspace-error'

export async function videoBatch(run: ExecutionRun, index: number, produced: AssetManifest[] = []) {
  const outcome = run.outcome?.status === 'succeeded' ? run.outcome : undefined
  const proposal = outcome?.video,
    variant = proposal?.variants[index],
    source = run.context.source
  if (
    !proposal ||
    !variant ||
    source.document.kind !== 'video' ||
    variant.videoId !== source.entityId ||
    !['video-edit', 'composition', 'render', 'transcribe', 'prepare-media'].includes(
      run.request.capability,
    ) ||
    run.request.intent === 'adapt' ||
    proposal.variants.length > run.request.limits.maxVariants ||
    (run.request.intent === 'adjust' && proposal.variants.length !== 1)
  )
    throw new WorkspaceError('INVALID_RESULT', 'A proposta não corresponde ao pedido de vídeo')
  if (run.context.protectedIds.includes(source.entityId))
    throw new WorkspaceError('PROTECTED_CONTENT', 'Este vídeo está protegido')
  const original = source.document.timeline,
    next = variant.timeline
  if (run.request.videoTarget) {
    const { clipId, part } = run.request.videoTarget
    const selected = next.clips.find((clip) => clip.id === clipId)
    if (!selected)
      throw new WorkspaceError('INVALID_RESULT', 'A cena selecionada deve permanecer na montagem')
    const outside = (timeline: typeof original) => ({
      ...timeline,
      clips: timeline.clips.filter((clip) => clip.id !== clipId),
    })
    if (canonicalJson(outside(original)) !== canonicalJson(outside(next)))
      throw new WorkspaceError('INVALID_RESULT', 'O pedido só permite alterar a cena selecionada')
    const before = original.clips.find((clip) => clip.id === clipId)
    if (!before) throw new WorkspaceError('INVALID_RESULT', 'A cena de origem não existe')
    const excluded =
      part === 'text'
        ? new Set(['text', 'listItems'])
        : new Set(['effect', 'counter', 'listItems', 'fadeInFrames', 'fadeOutFrames'])
    const retain = (clip: typeof selected) =>
      Object.fromEntries(Object.entries(clip).filter(([key]) => !excluded.has(key)))
    if (
      run.request.capability !== 'composition' &&
      part !== 'scene' &&
      canonicalJson(retain(before)) !== canonicalJson(retain(selected))
    )
      throw new WorkspaceError(
        'INVALID_RESULT',
        'O pedido alterou mais que o texto ou efeito selecionado',
      )
  }
  if (run.request.capability === 'transcribe') {
    const { captions: _old, ...before } = original,
      { captions: _next, ...after } = next
    const outside = (captions: typeof original.captions) =>
      captions.filter((caption) => caption.assetId !== run.request.sourceAssetId)
    if (
      canonicalJson(before) !== canonicalJson(after) ||
      canonicalJson(outside(original.captions)) !== canonicalJson(outside(next.captions))
    )
      throw new WorkspaceError(
        'INVALID_RESULT',
        'A transcrição só pode atualizar as legendas da gravação selecionada',
      )
  }
  if (run.request.capability === 'render') {
    if (
      !variant.finalAssetId ||
      !outcome?.assetIds.includes(variant.finalAssetId) ||
      canonicalJson(original) !== canonicalJson(next)
    )
      throw new WorkspaceError(
        'INVALID_RESULT',
        'O render precisa corresponder à montagem selecionada',
      )
  } else if (variant.finalAssetId) {
    throw new WorkspaceError(
      'INVALID_RESULT',
      'Um ajuste da montagem não pode reutilizar o arquivo final',
    )
  }
  const manifests = new Map((run.context.assets ?? []).map((asset) => [asset.id, asset]))
  for (const asset of await validateCompositionResult(run, next, produced))
    manifests.set(asset.id, asset)
  const preparations = [...(source.document.preparations ?? [])]
  const preparation = outcome?.mediaPreparation
  if (run.request.capability === 'prepare-media') {
    const originalAsset = manifests.get(preparation?.sourceAssetId ?? '')
    if (
      !preparation ||
      !originalAsset ||
      preparation.sourceAssetId !== run.request.sourceAssetId ||
      preparation.sourceSha256 !== originalAsset.sha256 ||
      canonicalJson(original) !== canonicalJson(next) ||
      preparedAssetIds(preparation).some((id) => !outcome?.assetIds.includes(id))
    )
      throw new WorkspaceError(
        'INVALID_RESULT',
        'A preparação não corresponde à gravação e à montagem selecionadas',
      )
    const index = preparations.findIndex((item) => item.sourceAssetId === preparation.sourceAssetId)
    if (index === -1) preparations.push(preparation)
    else preparations[index] = preparation
  }
  for (const prepared of preparations) {
    const asset = manifests.get(prepared.sourceAssetId)
    if (!asset || asset.sha256 !== prepared.sourceSha256)
      throw new WorkspaceError('INVALID_RESULT', 'A prévia preparada não corresponde ao original')
    manifests.set(asset.id, { ...asset, ...prepared.metadata })
  }
  const inspected = new Set<string>()
  for (const recording of outcome?.recordingAnalysis ?? []) {
    const manifest = manifests.get(recording.assetId)
    if (
      !manifest ||
      inspected.has(recording.assetId) ||
      !(manifest.mime.startsWith('video/') || manifest.mime.startsWith('audio/')) ||
      (recording.scope === 'metadata' &&
        (recording.samples.length > 0 || recording.silence.length > 0)) ||
      (recording.scope === 'audio' && recording.samples.length > 0) ||
      !['video-edit', 'render', 'transcribe'].includes(run.request.capability) ||
      manifest.sha256 !== recording.sha256 ||
      (run.request.capability !== 'video-edit' &&
        (recording.samples.length > 0 || recording.silence.length > 0))
    )
      throw new WorkspaceError(
        'INVALID_RESULT',
        'A análise de gravação não corresponde às mídias do pedido',
      )
    inspected.add(recording.assetId)
    const durationMs = recording.metadata.durationMs ?? manifest.durationMs
    if (
      !durationMs ||
      (manifest.durationMs !== null && Math.abs(durationMs - manifest.durationMs) > 100)
    )
      throw new WorkspaceError(
        'INVALID_RESULT',
        'A duração inspecionada não corresponde à gravação',
      )
    // Inspection is immutable evidence of this execution, not a rewrite of the original manifest.
    manifests.set(manifest.id, { ...manifest, ...recording.metadata, durationMs })
    if (
      recording.silence.some(
        (interval) => interval.endMs <= interval.startMs || interval.endMs > durationMs + 100,
      ) ||
      recording.samples.some(
        (sample) => !outcome?.assetIds.includes(sample.assetId) || sample.atMs > durationMs,
      )
    )
      throw new WorkspaceError(
        'INVALID_RESULT',
        'A análise de gravação não corresponde às mídias do pedido',
      )
  }
  if (videoAssetIds(next).some((id) => !manifests.has(id)))
    throw new WorkspaceError(
      'INVALID_RESULT',
      'A proposta usa uma mídia fora do contexto confirmado',
    )
  for (const clip of original.clips.filter((clip) => clip.protected)) {
    const track = original.tracks.find((track) => track.id === clip.trackId)
    if (
      canonicalJson(clip) !==
        canonicalJson(next.clips.find((item) => item.id === clip.id) ?? null) ||
      canonicalJson(track ?? null) !==
        canonicalJson(next.tracks.find((item) => item.id === clip.trackId) ?? null) ||
      canonicalJson(original.fps) !== canonicalJson(next.fps) ||
      original.width !== next.width ||
      original.height !== next.height ||
      original.fontAssetId !== next.fontAssetId
    )
      throw new WorkspaceError('PROTECTED_CONTENT', 'A proposta alterou uma cena ou fala protegida')
  }
  for (const caption of original.captions.filter((caption) => caption.corrected)) {
    const replacement = next.captions.find((item) => item.id === caption.id)
    if (
      run.request.capability === 'video-edit' &&
      run.request.reviseCaptions &&
      replacement?.assetId === caption.assetId &&
      replacement.corrected
    )
      continue
    if (
      !replacement ||
      canonicalJson({
        ...caption,
        timestampMs: caption.timestampMs ?? null,
        confidence: caption.confidence ?? null,
      }) !==
        canonicalJson({
          ...replacement,
          timestampMs: replacement.timestampMs ?? null,
          confidence: replacement.confidence ?? null,
        })
    )
      throw new WorkspaceError('PROTECTED_CONTENT', 'A legenda já corrigida precisa ser preservada')
  }
  for (const clip of original.clips.filter((clip) => clip.art)) {
    if (run.request.capability === 'composition' && clip.id === run.request.videoTarget?.clipId)
      continue
    const before = clip.art,
      after = next.clips.find((item) => item.id === clip.id)?.art
    if (!before) continue
    if (
      before.protectedText.length &&
      (!after ||
        canonicalJson(before.protectedText) !== canonicalJson(after.protectedText) ||
        before.protectedText.some((text) => !after.body.includes(text)))
    )
      throw new WorkspaceError('PROTECTED_CONTENT', 'A copy protegida da cena deve permanecer')
    for (const layer of before.composition.layers.filter((layer) => layer.protected)) {
      if (
        !after ||
        canonicalJson(layer) !==
          canonicalJson(after.composition.layers.find((item) => item.id === layer.id) ?? null) ||
        (layer.kind === 'text' && artText(layer, before) !== artText(layer, after)) ||
        before.composition.fontAssetId !== after.composition.fontAssetId ||
        before.composition.width !== after.composition.width ||
        before.composition.height !== after.composition.height
      )
        throw new WorkspaceError('PROTECTED_CONTENT', 'Uma camada protegida da arte foi alterada')
    }
  }
  for (const clip of next.clips) {
    if (clip.kind === 'text') continue
    if (clip.kind === 'art' && clip.art) {
      if (!original.clips.some((item) => item.art?.sourceRevisionId === clip.art?.sourceRevisionId))
        throw new WorkspaceError('INVALID_RESULT', 'A origem da arte não pertence à montagem')
      for (const layer of clip.art.composition.layers) {
        if (layer.kind === 'image' && !manifests.get(layer.assetId)?.mime.startsWith('image/'))
          throw new WorkspaceError('INVALID_RESULT', 'A camada da arte exige uma imagem confirmada')
      }
      if (
        clip.art.composition.fontAssetId &&
        manifests.get(clip.art.composition.fontAssetId)?.mime !== 'font/woff2'
      )
        throw new WorkspaceError('INVALID_RESULT', 'A fonte da arte precisa ser WOFF2 confirmada')
      continue
    }
    const asset = clip.assetId ? manifests.get(clip.assetId) : undefined
    if (
      !asset ||
      !(
        asset.mime.startsWith(`${clip.kind}/`) ||
        (clip.kind === 'audio' && asset.mime.startsWith('video/') && asset.hasAudio === true)
      )
    )
      throw new WorkspaceError('INVALID_RESULT', 'O tipo da cena não corresponde ao arquivo')
    if (
      clip.kind !== 'image' &&
      (asset.durationMs === null ||
        clip.sourceStartMs +
          ((clip.durationInFrames * 1000 * next.fps.denominator) / next.fps.numerator) *
            clip.playbackRate >
          asset.durationMs + 1)
    )
      throw new WorkspaceError('INVALID_RESULT', 'O corte ultrapassa a duração da gravação')
  }
  for (const caption of next.captions) {
    const asset = manifests.get(caption.assetId)
    if (!asset?.durationMs || caption.endMs > asset.durationMs + 1)
      throw new WorkspaceError('INVALID_RESULT', 'A legenda ultrapassa a duração da gravação')
  }
  if (next.fontAssetId && manifests.get(next.fontAssetId)?.mime !== 'font/woff2')
    throw new WorkspaceError('INVALID_RESULT', 'A fonte precisa ser um arquivo WOFF2 confirmado')
  return batchOperationSchema.parse({
    schemaVersion: 1,
    operationId: await stableEditorialId(
      `${run.request.projectId}:video:${run.request.id}:${index}`,
    ),
    projectId: run.request.projectId,
    changes: [
      {
        entityId: source.entityId,
        baseRevisionId: source.id,
        action: 'save',
        document: {
          ...source.document,
          timeline: next,
          assetIds:
            run.request.capability === 'prepare-media'
              ? (source.document.assetIds ?? [])
              : variant.finalAssetId
                ? [variant.finalAssetId]
                : [],
          ...(preparations.length ? { preparations } : {}),
        },
      },
    ],
  })
}
