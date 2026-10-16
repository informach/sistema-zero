import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { type ExecutionRun, recordingAnalysisSchema } from '@sistemazero/marketing-contracts'
import { FileIntegrityError } from '../assets'
import { analyzeRecording } from '../media/analyze-recording'
import { probeVideo } from '../media/probe-video'
import { downloadAsset } from '../sync/asset-download'
import type { ProductionResult } from './journal'
import type { ExecutionResources } from './supervisor'

export async function recordingContext(
  run: ExecutionRun,
  resources: ExecutionResources,
  directory: string,
  signal: AbortSignal,
  progress: (message: string) => void,
) {
  const document = run.context.source.document
  if (document.kind !== 'video') throw new Error('Selecione uma montagem de vídeo')
  const originals = new Set([
    ...document.timeline.clips.flatMap((clip) => (clip.assetId ? [clip.assetId] : [])),
    ...(document.referenceAssetIds ?? []),
  ])
  const candidates = (run.context.assets ?? []).filter(
    (asset) =>
      originals.has(asset.id) &&
      (asset.mime.startsWith('video/') || asset.mime.startsWith('audio/')),
  )
  if (
    run.request.sourceAssetId &&
    !candidates.some((candidate) => candidate.id === run.request.sourceAssetId)
  )
    throw new Error('A gravação selecionada precisa estar vinculada à montagem')
  const focused = new Set(
    (run.request.sourceAssetId
      ? candidates.filter((candidate) => candidate.id === run.request.sourceAssetId)
      : candidates.slice(0, 3)
    ).map((candidate) => candidate.id),
  )
  const observations: NonNullable<ProductionResult['recordingAnalysis']> = [],
    images: string[] = []
  const cache = path.join(resources.directory, 'recording-analysis')
  await mkdir(cache, { recursive: true })
  const release = await resources.assets.reserve(focused.size * 16 * 1024 * 1024)
  try {
    for (const candidate of candidates) {
      signal.throwIfAborted()
      const inspect = focused.has(candidate.id)
      const scope = inspect
        ? candidate.mime.startsWith('video/')
          ? 'audio-and-frames'
          : 'audio'
        : 'metadata'
      const saved = path.join(cache, `${candidate.id}-${scope}.json`)
      let cached: NonNullable<ProductionResult['recordingAnalysis']>[number] | undefined
      try {
        if ((await stat(saved)).size <= 2_000_000) {
          const parsed = recordingAnalysisSchema.safeParse(
            JSON.parse(await readFile(saved, 'utf8')),
          )
          if (
            parsed.success &&
            parsed.data.assetId === candidate.id &&
            parsed.data.sha256 === candidate.sha256 &&
            parsed.data.scope === scope
          )
            cached = parsed.data
        }
      } catch (error) {
        if (
          !(
            error instanceof SyntaxError ||
            (error instanceof Error && 'code' in error && error.code === 'ENOENT')
          )
        )
          throw error
      }
      if (cached) {
        const present = new Set(resources.assets.list().map((asset) => asset.id)),
          paths: string[] = []
        let usable = true
        for (const sample of cached.samples) {
          if (!present.has(sample.assetId)) {
            usable = false
            break
          }
          try {
            paths.push((await resources.assets.verify(sample.assetId)).path)
          } catch (error) {
            if (!(error instanceof FileIntegrityError)) throw error
            usable = false
            break
          }
        }
        if (usable) {
          observations.push(cached)
          images.push(...paths)
          continue
        }
      }
      progress(
        `${inspect ? 'Analisando pausas e referências' : 'Conferindo metadados'} de ${candidate.name}`,
      )
      await downloadAsset(
        run.request.projectId,
        candidate.id,
        resources.assets,
        resources.transport,
        signal,
      )
      const original = await resources.assets.verify(candidate.id)
      const analysis = inspect
        ? await analyzeRecording(
            original.path,
            candidate.mime,
            path.join(directory, candidate.id),
            signal,
            true,
          )
        : {
            metadata: await probeVideo(original.path, candidate.mime, signal),
            silence: [],
            frames: [],
          }
      const samples: NonNullable<ProductionResult['recordingAnalysis']>[number]['samples'] = []
      for (const frame of analysis.frames) {
        const asset = await resources.assets.importFile(frame.file)
        samples.push({ assetId: asset.id, atMs: frame.atMs })
        images.push((await resources.assets.verify(asset.id)).path)
      }
      const observation = recordingAnalysisSchema.parse({
        version: 'ffmpeg-remotion-4.0.535-v1',
        scope,
        metadata: analysis.metadata,
        assetId: candidate.id,
        sha256: candidate.sha256,
        silence: analysis.silence,
        samples,
      })
      observations.push(observation)
      await writeFile(`${saved}.tmp`, JSON.stringify(observation))
      await rename(`${saved}.tmp`, saved)
    }
    return { observations, images }
  } finally {
    release()
  }
}
