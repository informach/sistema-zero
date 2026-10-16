import { type ExecutionRun, videoPlaybackAssetIds } from '@sistemazero/marketing-contracts'
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
  for (const id of videoPlaybackAssetIds(document.timeline)) {
    const metadata = run.context.assets?.find((asset) => asset.id === id)
    if (!metadata) throw new Error('Uma mídia da montagem não está no contexto confirmado')
    if (['smpte2084', 'arib-std-b67'].includes(metadata.colorTransfer ?? ''))
      throw new Error(
        'A conversão de vídeo HDR ainda não está disponível; preserve o original e prepare uma cópia SDR',
      )
    progress('Carregando as mídias desta revisão')
    assets[id] = (
      await downloadAsset(run.request.projectId, id, resources.assets, resources.transport, signal)
    ).url
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
  let reused = 0
  let audioReused = false
  const output = await renderTimeline(
    { timeline: document.timeline, assets },
    resources,
    directory,
    signal,
    (value) => {
      reused = value.reused
      audioReused = value.audioReused ?? false
      progress(
        `Preparando vídeo: ${value.rendered + value.reused}/${value.total} trechos; ${value.reused} reaproveitados${value.audioReused === undefined ? '' : value.audioReused ? '; áudio reaproveitado' : '; áudio preparado'}`,
      )
    },
  )
  return {
    status: 'succeeded',
    text: `Vídeo exportado desta revisão.${reused ? ` ${reused} trechos preservados foram reaproveitados.` : ''}${audioReused ? ' A faixa de áudio também foi reaproveitada.' : ''}`,
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
