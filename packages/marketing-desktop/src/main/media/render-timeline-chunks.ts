import { unlink } from 'node:fs/promises'
import path from 'node:path'
import {
  combineChunks,
  type makeCancelSignal,
  renderMedia,
  type selectComposition,
} from '@remotion/renderer'
import type { TimelineProps } from '@sistemazero/marketing-production/data'
import { mediaProcess } from './media-process'
import { withOutputBudget } from './output-budget'
import { RenderChunkCache } from './render-chunk-cache'
import {
  type ChunkContext,
  type ChunkProgress,
  timelineAudioKey,
  timelineChunks,
} from './timeline-chunks'

/** Visual chunks and a continuous Remotion audio mix have independent content identities. */
export async function renderTimelineChunks(input: {
  props: TimelineProps
  composition: Awaited<ReturnType<typeof selectComposition>>
  serveUrl: string
  outputLocation: string
  context: ChunkContext
  cancellation: ReturnType<typeof makeCancelSignal>
  signal: AbortSignal
  progress: (value: ChunkProgress) => void
}) {
  const { props, composition, serveUrl, outputLocation, context, cancellation, signal, progress } =
      input,
    cache = new RenderChunkCache(context.directory),
    plan = timelineChunks(props.timeline, context),
    audioKey = timelineAudioKey(props.timeline, context),
    report: ChunkProgress = { total: plan.chunks.length, rendered: 0, reused: 0 },
    silent = path.resolve(path.dirname(outputLocation), 'timeline-silent.mp4'),
    options = {
      composition,
      serveUrl,
      inputProps: props,
      concurrency: 2,
      cancelSignal: cancellation.cancelSignal,
      offthreadVideoCacheSizeInBytes: 128 * 1024 * 1024,
      mediaCacheSizeInBytes: 128 * 1024 * 1024,
    }
  await cache.initialize()
  if (path.dirname(silent) !== path.resolve(path.dirname(outputLocation)))
    throw new Error('Intermediário fora do trabalho')
  const budgetFiles = [
    outputLocation,
    silent,
    cache.files(audioKey, 'audio').media,
    cache.files(audioKey, 'audio', true).media,
    ...plan.chunks.flatMap(({ key }) => [
      cache.files(key, 'video').media,
      cache.files(key, 'video', true).media,
    ]),
  ]
  const failures: unknown[] = []
  try {
    await withOutputBudget(
      cache.directory,
      budgetFiles,
      context.maximumBytes,
      signal,
      async (bounded) => {
        const abort = () => cancellation.cancel()
        bounded.addEventListener('abort', abort, { once: true })
        if (bounded.aborted) abort()
        try {
          const videoFiles: string[] = []
          for (const chunk of plan.chunks) {
            bounded.throwIfAborted()
            let file = await cache.get(chunk.key, 'video', bounded)
            if (file) report.reused++
            else {
              file = await cache.create(chunk.key, 'video', bounded, async (output) => {
                await renderMedia({
                  ...options,
                  codec: 'h264-ts',
                  muted: true,
                  colorSpace: 'bt709',
                  imageFormat: 'png',
                  preferLossless: false,
                  frameRange: [chunk.from, chunk.to],
                  compositionStart: 0,
                  numberOfGifLoops: null,
                  outputLocation: output,
                })
              })
              report.rendered++
            }
            videoFiles.push(file)
            progress({ ...report })
          }
          let audio = await cache.get(audioKey, 'audio', bounded)
          report.audioReused = Boolean(audio)
          if (!audio)
            audio = await cache.create(audioKey, 'audio', bounded, async (output) => {
              await renderMedia({
                ...options,
                codec: 'aac',
                audioCodec: 'aac',
                sampleRate: 48000,
                enforceAudioTrack: true,
                outputLocation: output,
              })
            })
          progress({ ...report })
          bounded.throwIfAborted()
          await combineChunks({
            videoFiles,
            audioFiles: [],
            outputLocation: silent,
            codec: 'h264',
            fps: composition.fps,
            framesPerChunk: plan.framesPerChunk,
            compositionDurationInFrames: composition.durationInFrames,
            preferLossless: false,
            cancelSignal: cancellation.cancelSignal,
          })
          // Packaging only: Remotion already evaluated all cuts, fades, rates and mix.
          // M4A retains AAC priming metadata. Do not split, offset or re-encode its audio.
          await mediaProcess(
            'ffmpeg',
            [
              '-v',
              'error',
              '-y',
              '-i',
              silent,
              '-i',
              audio,
              '-map',
              '0:v:0',
              '-map',
              '1:a:0',
              '-c',
              'copy',
              '-r',
              String(composition.fps),
              '-video_track_timescale',
              '90000',
              '-movflags',
              '+faststart',
              outputLocation,
            ],
            bounded,
          )
        } finally {
          bounded.removeEventListener('abort', abort)
        }
      },
    )
  } catch (error) {
    failures.push(error)
  }
  try {
    // A fixed, regenerable intermediate inside this job; never the final or a source asset.
    try {
      await unlink(silent)
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
    }
    await cache.prune()
  } catch (error) {
    failures.push(error)
  }
  if (failures.length === 1) throw failures[0]
  if (failures.length)
    throw new AggregateError(failures, 'O render e a limpeza dos intermediários falharam')
}
