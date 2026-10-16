import {
  type AssetManifest,
  type ExecutionRun,
  rasterExport,
  renderInputHash,
} from '@sistemazero/marketing-contracts'
import { WorkspaceError } from './workspace-error'

export async function validateRenderResult(run: ExecutionRun, assets: AssetManifest[]) {
  if (run.outcome?.status !== 'succeeded' || run.request.capability !== 'render') return
  const receipt = run.outcome.render,
    source = run.context.source.document
  const variants = run.outcome.video?.variants ?? run.outcome.art?.variants
  const output = assets.find((asset) => asset.id === receipt?.outputAssetId)
  const shape =
    source.kind === 'video'
      ? source.timeline
      : source.kind === 'component'
        ? (source.composition ??
          (run.request.imageFormat === 'jpeg'
            ? rasterExport(run.context.source, run.context.assets ?? [], run.request.sourceAssetId)
                .composition
            : undefined))
        : undefined
  if (
    !receipt ||
    !output ||
    !shape ||
    (source.kind === 'video' ? !run.outcome.video : !run.outcome.art) ||
    variants?.length !== 1 ||
    variants[0]?.finalAssetId !== receipt.outputAssetId ||
    receipt.sourceRevisionId !== run.context.source.id ||
    receipt.inputSha256 !==
      (await renderInputHash(
        run.context.source,
        run.context.assets ?? [],
        run.request.imageFormat,
        run.request.sourceAssetId,
      )) ||
    output.sha256 !== receipt.outputSha256 ||
    output.role !== 'final' ||
    output.mime !==
      (source.kind === 'video'
        ? 'video/mp4'
        : run.request.imageFormat === 'jpeg'
          ? 'image/jpeg'
          : 'image/png') ||
    output.width !== shape.width ||
    output.height !== shape.height ||
    (source.kind === 'video' &&
      (output.codec !== 'h264' ||
        Math.abs(
          (output.durationMs ?? 0) -
            (source.timeline.durationInFrames * 1000 * source.timeline.fps.denominator) /
              source.timeline.fps.numerator,
        ) > 100))
  )
    throw new WorkspaceError(
      'INVALID_RESULT',
      'O arquivo final não corresponde à revisão e à identidade do render',
    )
}

export function validateRecordingAssets(run: ExecutionRun, assets: AssetManifest[]) {
  if (run.outcome?.status !== 'succeeded') return
  if (run.outcome.mediaPreparation) {
    const preparation = run.outcome.mediaPreparation
    const source = run.context.assets?.find((asset) => asset.id === preparation.sourceAssetId)
    if (
      !source ||
      source.sha256 !== preparation.sourceSha256 ||
      !preparation.metadata.durationMs ||
      (source.durationMs !== null &&
        Math.abs(source.durationMs - preparation.metadata.durationMs) > 100)
    )
      throw new WorkspaceError(
        'INVALID_RESULT',
        'Os metadados preparados não correspondem ao original',
      )
    for (const [id, role, mime] of [
      [preparation.proxyAssetId, 'proxy', 'video/mp4'],
      [preparation.thumbnailAssetId, 'thumbnail', 'image/png'],
      [preparation.waveformAssetId, 'waveform', 'application/json'],
    ]) {
      if (!id) continue
      const asset = assets.find((asset) => asset.id === id)
      if (
        !asset ||
        asset.role !== role ||
        asset.mime !== mime ||
        asset.sourceAssetId !== source.id ||
        (role === 'proxy' &&
          Math.abs((asset.durationMs ?? 0) - preparation.metadata.durationMs) > 100)
      )
        throw new WorkspaceError(
          'INVALID_RESULT',
          'Um arquivo preparado não corresponde à gravação original',
        )
    }
    if (
      source.mime.startsWith('video/') &&
      (!preparation.proxyAssetId || !preparation.thumbnailAssetId)
    )
      throw new WorkspaceError(
        'INVALID_RESULT',
        'A preparação do vídeo precisa de prévia e miniatura',
      )
  }
  for (const recording of run.outcome.recordingAnalysis ?? []) {
    for (const sample of recording.samples) {
      const image = assets.find((asset) => asset.id === sample.assetId)
      if (
        image?.role !== 'thumbnail' ||
        !image.mime.startsWith('image/') ||
        image.sourceAssetId !== recording.assetId
      )
        throw new WorkspaceError(
          'INVALID_RESULT',
          'Uma imagem de análise não corresponde à gravação original',
        )
    }
  }
}
