import {
  demonstrationSources,
  type ExecutionRun,
  videoAssetIds,
} from '@sistemazero/marketing-contracts'
import { inspectDemonstrationImage } from '../media/demonstration-image'
import { probeVideo } from '../media/probe-video'
import { renderReceipt } from '../media/render-identity'
import { renderTimeline } from '../media/render-timeline'
import { downloadAsset } from '../sync/asset-download'
import type { ProductionResult } from './journal'
import type { ExecutionResources } from './supervisor'

export async function exportVideo(
  run: ExecutionRun,
  resources: ExecutionResources,
  directory: string,
  signal: AbortSignal,
  progress: (message: string) => void,
): Promise<ProductionResult> {
  const document = run.context.source.document
  if (document.kind !== 'video') throw new Error('Selecione uma montagem de vídeo')
  const started = Date.now(),
    assets: Record<string, string> = {}
  const inspections: NonNullable<ProductionResult['recordingAnalysis']> = []
  const sources = demonstrationSources(document.timeline)
  for (const id of videoAssetIds(document.timeline)) {
    const metadata = run.context.assets?.find((asset) => asset.id === id)
    if (!metadata) throw new Error('Uma mídia da montagem não está no contexto confirmado')
    if (['smpte2084', 'arib-std-b67'].includes(metadata.colorTransfer ?? ''))
      throw new Error(
        'A conversão de vídeo HDR ainda não está disponível; preserve o original e prepare uma cópia SDR',
      )
    progress('Carregando as mídias desta revisão')
    const downloaded = await downloadAsset(
      run.request.projectId,
      id,
      resources.assets,
      resources.transport,
      signal,
    )
    assets[id] = downloaded.url
    const references = sources.filter((source) => source.assetId === id)
    const source = references[0]
    if (source) {
      if (
        references.some(
          (reference) =>
            downloaded.sha256 !== reference.sha256 ||
            reference.width !== source.width ||
            reference.height !== source.height,
        )
      )
        throw new Error('A imagem de demonstração diverge da fonte confirmada')
      await inspectDemonstrationImage(
        (await resources.assets.verify(id)).path,
        downloaded.mime,
        source,
      )
    }
    if (metadata.mime.startsWith('video/') || metadata.mime.startsWith('audio/')) {
      const inspected = await probeVideo(
        (await resources.assets.verify(id)).path,
        metadata.mime,
        signal,
      )
      if (['smpte2084', 'arib-std-b67'].includes(inspected.colorTransfer ?? ''))
        throw new Error('A gravação é HDR e requer uma cópia SDR para este render')
      inspections.push({
        version: 'ffmpeg-remotion-4.0.535-v1',
        assetId: id,
        sha256: metadata.sha256,
        metadata: inspected,
        silence: [],
        samples: [],
      })
    }
  }
  progress('Exportando vídeo no computador')
  const output = await renderTimeline(
    { timeline: document.timeline, assets },
    resources,
    directory,
    signal,
  )
  return {
    status: 'succeeded',
    text: 'Vídeo exportado desta revisão.',
    mode: 'Remotion local',
    assetIds: [output.id],
    render: await renderReceipt(run, output),
    recordingAnalysis: inspections,
    durationMs: Date.now() - started,
    inputTokens: null,
    outputTokens: null,
    video: {
      schemaVersion: 1,
      kind: 'video',
      summary: 'MP4 da montagem atual',
      variants: [
        {
          label: 'Vídeo final',
          videoId: run.context.source.entityId,
          timeline: document.timeline,
          finalAssetId: output.id,
        },
      ],
    },
  }
}
