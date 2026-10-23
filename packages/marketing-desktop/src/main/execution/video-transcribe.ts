import { readFile, stat } from 'node:fs/promises'
import { type ExecutionRun, mediaInspectionSchema } from '@sistemazero/marketing-contracts'
import { importSrtCaptions } from '@sistemazero/marketing-production/data'
import { probeVideo } from '../media/probe-video'
import { speechDirectory } from '../media/speech-engine'
import { transcribeLocal } from '../media/transcribe'
import { downloadAsset } from '../sync/asset-download'
import type { ProductionResult } from './journal'
import type { ExecutionResources } from './supervisor'

export async function transcribeVideo(
  run: ExecutionRun,
  resources: ExecutionResources,
  directory: string,
  signal: AbortSignal,
  progress: (message: string) => void,
): Promise<ProductionResult> {
  const source = run.context.source.document
  if (source.kind !== 'video') throw new Error('Selecione uma montagem de vídeo')
  const media = run.context.assets?.find((asset) => asset.id === run.request.sourceAssetId)
  if (
    !media ||
    !['video/', 'audio/'].some((prefix) => media.mime.startsWith(prefix)) ||
    (!run.request.captionSourceAssetId && media.hasAudio === false)
  )
    throw new Error('Selecione uma gravação com áudio confirmado para transcrever')
  let localOriginal: string | undefined
  const ensureOriginal = async () => {
    if (!localOriginal) {
      await downloadAsset(
        run.request.projectId,
        media.id,
        resources.assets,
        resources.transport,
        signal,
      )
      localOriginal = (await resources.assets.verify(media.id)).path
    }
    return localOriginal
  }
  const metadata =
    run.request.captionSourceAssetId && media.durationMs
      ? mediaInspectionSchema.strip().parse(media)
      : await probeVideo(await ensureOriginal(), media.mime, signal)
  const durationMs = metadata.durationMs
  if (!durationMs) throw new Error('A gravação precisa de uma duração válida')
  const started = Date.now(),
    release = await resources.assets.reserve(
      run.request.captionSourceAssetId ? 4_000_000 : Math.ceil(durationMs * 32 + 16 * 1024 * 1024),
    )
  try {
    const captions = await (async () => {
      if (!run.request.captionSourceAssetId) {
        const file = await ensureOriginal()
        return transcribeLocal(
          {
            file,
            mime: media.mime,
            assetId: media.id,
            sha256: media.sha256,
            durationMs,
          },
          await speechDirectory(),
          directory,
          signal,
          progress,
        )
      }
      const srt = run.context.assets?.find((asset) => asset.id === run.request.captionSourceAssetId)
      if (srt?.mime !== 'text/plain' || srt.size > 2_000_000)
        throw new Error('Selecione um arquivo SRT de até 2 MB vinculado ao vídeo')
      await downloadAsset(
        run.request.projectId,
        srt.id,
        resources.assets,
        resources.transport,
        signal,
      )
      const local = await resources.assets.verify(srt.id)
      if ((await stat(local.path)).size > 2_000_000) throw new Error('O SRT excede 2 MB')
      return importSrtCaptions(
        new TextDecoder('utf-8', { fatal: true }).decode(await readFile(local.path)),
        { assetId: media.id, durationMs, srtSha256: srt.sha256 },
      )
    })()
    const protectedCaptions = source.timeline.captions.filter(
      (caption) => caption.assetId === media.id && caption.corrected,
    )
    const merged = [
      ...source.timeline.captions.filter((caption) => caption.assetId !== media.id),
      ...protectedCaptions,
      ...captions.filter(
        (caption) =>
          !protectedCaptions.some(
            (old) => caption.startMs < old.endMs && caption.endMs > old.startMs,
          ),
      ),
    ]
    return {
      status: 'succeeded',
      text: 'Legendas prontas para conferir.',
      mode: run.request.captionSourceAssetId ? 'Legendas SRT' : 'Whisper.cpp local',
      assetIds: [],
      recordingAnalysis: [
        {
          version: 'ffmpeg-remotion-4.0.535-v1',
          assetId: media.id,
          sha256: media.sha256,
          metadata,
          silence: [],
          samples: [],
        },
      ],
      durationMs: Date.now() - started,
      inputTokens: null,
      outputTokens: null,
      video: {
        schemaVersion: 1,
        kind: 'video',
        summary: 'Legendas vinculadas ao tempo original; correções anteriores preservadas',
        variants: [
          {
            label: 'Transcrição',
            videoId: run.context.source.entityId,
            timeline: { ...source.timeline, captions: merged },
            finalAssetId: null,
          },
        ],
      },
    }
  } finally {
    release()
  }
}
