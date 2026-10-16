import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { type TimelineProps, timelinePropsSchema } from '@sistemazero/marketing-production/data'
import type { ExecutionResources } from '../execution/supervisor'
import { withOutputBudget } from './output-budget'
import { probeVideo } from './probe-video'
import { RenderChunkCache } from './render-chunk-cache'
import { verifiedRenderEngine } from './render-identity'
import { renderProcess } from './render-process'
import type { ChunkProgress } from './timeline-chunks'

export async function renderTimeline(
  props: TimelineProps,
  resources: Pick<ExecutionResources, 'assets'>,
  directory: string,
  signal: AbortSignal,
  progress?: (value: ChunkProgress) => void,
) {
  const value = timelinePropsSchema.parse(props)
  if (
    !value.timeline.clips.some(
      (clip) =>
        clip.kind === 'video' ||
        clip.kind === 'image' ||
        clip.kind === 'text' ||
        clip.kind === 'art',
    )
  )
    throw new Error('Adicione cenas à montagem antes de exportar')
  if (Object.values(value.assets).some((url) => !resources.assets.ownsUrl(url)))
    throw new Error('O render só aceita arquivos confirmados neste cache')
  const assetHashes: Record<string, string> = {}
  // A proof/import may map the timeline ID to a different local ID. Resolve by the
  // exact owned URL, then verify bytes; never trust a URL as content identity.
  const local = new Map(resources.assets.list().map((asset) => [asset.url, asset.id]))
  for (const [id, url] of Object.entries(value.assets)) {
    signal.throwIfAborted()
    const localId = local.get(url)
    if (!localId) throw new Error('Uma mídia da montagem não está no cache confirmado')
    assetHashes[id] = (await resources.assets.verify(localId)).asset.sha256
  }
  const engine = await verifiedRenderEngine(),
    cache = new RenderChunkCache(path.join(resources.assets.directory, 'render-cache-v1'))
  await cache.initialize()
  const seconds =
    (value.timeline.durationInFrames * value.timeline.fps.denominator) /
    value.timeline.fps.numerator
  const maximumBytes = Math.min(
      6_000_000_000,
      Math.ceil(seconds * value.timeline.width * value.timeline.height * 2 + 64 * 1024 * 1024),
    ),
    release = await resources.assets.reserve(maximumBytes)
  try {
    await mkdir(directory, { recursive: true })
    const input = path.join(directory, 'timeline-input.json'),
      output = path.join(directory, 'timeline.mp4'),
      chunksFile = path.join(directory, 'timeline-chunks.json')
    await writeFile(input, JSON.stringify(value))
    await writeFile(
      chunksFile,
      JSON.stringify({
        directory: cache.directory,
        maximumBytes,
        assetHashes,
        engineSha256: createHash('sha256').update(JSON.stringify(engine)).digest('hex'),
      }),
    )
    await withOutputBudget(directory, [output], 2_000_000_000, signal, (bounded) =>
      renderProcess(input, output, 'timeline', bounded, { file: chunksFile, progress }),
    )
    const metadata = await probeVideo(output, 'video/mp4', signal)
    if (
      metadata.width !== value.timeline.width ||
      metadata.height !== value.timeline.height ||
      metadata.codec !== 'h264' ||
      Math.abs((metadata.durationMs ?? 0) - seconds * 1000) > 100
    )
      throw new Error('A saída não corresponde à duração, dimensões ou codec da montagem')
    return await resources.assets.importFile(output, { signal })
  } finally {
    try {
      await cache.prune()
    } finally {
      release()
    }
  }
}
