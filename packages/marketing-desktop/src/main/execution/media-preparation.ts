import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  type ExecutionRun,
  type MediaPreparation,
  preparedAssetIds,
} from '@sistemazero/marketing-contracts'
import { mediaInputArguments, mediaProcess } from '../media/media-process'
import { withOutputBudget } from '../media/output-budget'
import { prepareVideo } from '../media/prepare-video'
import { probeVideo } from '../media/probe-video'
import { prepareWaveform } from '../media/waveform'
import { downloadAsset } from '../sync/asset-download'
import type { ProductionResult } from './journal'
import type { ExecutionResources } from './supervisor'

export async function prepareMedia(
  run: ExecutionRun,
  resources: ExecutionResources,
  directory: string,
  signal: AbortSignal,
  progress: (message: string) => void,
): Promise<ProductionResult> {
  const source = run.context.source.document,
    manifest = run.context.assets?.find((asset) => asset.id === run.request.sourceAssetId)
  if (
    source.kind !== 'video' ||
    !manifest ||
    !(manifest.mime.startsWith('video/') || manifest.mime.startsWith('audio/'))
  )
    throw new Error('Selecione uma gravação vinculada ao vídeo')
  const started = Date.now()
  await downloadAsset(
    run.request.projectId,
    manifest.id,
    resources.assets,
    resources.transport,
    signal,
  )
  const original = await resources.assets.verify(manifest.id),
    metadata = await probeVideo(original.path, manifest.mime, signal)
  if (!metadata.durationMs) throw new Error('A gravação não tem duração válida')
  const durationMs = metadata.durationMs
  const reservedBytes = Math.min(2_000_000_000, Math.ceil(durationMs * 1200 + 32_000_000))
  const release = await resources.assets.reserve(reservedBytes)
  try {
    await mkdir(directory, { recursive: true })
    return await withOutputBudget<ProductionResult>(
      directory,
      ['presentation.mp4', 'thumbnail.png', 'waveform.wav', 'waveform.json'].map((file) =>
        path.join(directory, file),
      ),
      reservedBytes,
      signal,
      async (signal) => {
        const preparation: MediaPreparation = {
          schemaVersion: 1,
          sourceAssetId: manifest.id,
          sourceSha256: manifest.sha256,
          metadata,
          proxyAssetId: null,
          thumbnailAssetId: null,
          waveformAssetId: null,
        }
        if (manifest.mime.startsWith('video/')) {
          progress('Preparando uma prévia compatível com a equipe')
          const proxy = await prepareVideo(original.path, manifest.mime, directory, signal, true)
          preparation.proxyAssetId = (await resources.assets.importFile(proxy.file)).id
          const thumbnail = path.join(directory, 'thumbnail.png')
          await mediaProcess(
            'ffmpeg',
            [
              '-v',
              'error',
              '-y',
              ...mediaInputArguments(proxy.file, 'video/mp4'),
              '-map',
              '0:v:0',
              '-an',
              '-frames:v',
              '1',
              '-vf',
              'scale=640:-2',
              thumbnail,
            ],
            signal,
          )
          preparation.thumbnailAssetId = (await resources.assets.importFile(thumbnail)).id
        }
        if (metadata.hasAudio) {
          progress('Preparando a forma de onda do áudio')
          const waveform = await prepareWaveform(
            {
              file: original.path,
              mime: manifest.mime,
              assetId: manifest.id,
              sha256: manifest.sha256,
              durationMs,
            },
            directory,
            signal,
          )
          const file = path.join(directory, 'waveform.json')
          await writeFile(file, JSON.stringify(waveform))
          preparation.waveformAssetId = (await resources.assets.importFile(file)).id
        }
        signal.throwIfAborted()
        return {
          status: 'succeeded',
          text: 'Mídia preparada. O original e a montagem foram preservados.',
          assetIds: preparedAssetIds(preparation),
          mediaPreparation: preparation,
          video: {
            schemaVersion: 1,
            kind: 'video',
            summary: 'Prévia e referências da gravação preparadas para a equipe',
            variants: [
              {
                label: 'Mídia preparada',
                videoId: run.context.source.entityId,
                timeline: source.timeline,
                finalAssetId: null,
              },
            ],
          },
          mode: 'Preparação local',
          durationMs: Date.now() - started,
          inputTokens: null,
          outputTokens: null,
        }
      },
    )
  } finally {
    release()
  }
}
