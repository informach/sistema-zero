import { createHash } from 'node:crypto'
import {
  artAssetIds,
  canonicalJson,
  captionsForClip,
  type VideoProject,
} from '@sistemazero/marketing-contracts'
import { z } from 'zod'

export const chunkContextSchema = z
  .object({
    directory: z.string().min(1),
    maximumBytes: z.number().int().positive().max(6_000_000_000),
    engineSha256: z.string().regex(/^[a-f0-9]{64}$/),
    assetHashes: z.record(z.string().uuid(), z.string().regex(/^[a-f0-9]{64}$/)),
  })
  .strict()
export type ChunkContext = z.infer<typeof chunkContextSchema>
export type TimelineChunk = { key: string; from: number; to: number }
export type ChunkProgress = {
  rendered: number
  reused: number
  total: number
  audioReused?: boolean
}
export const chunkProgressSchema = z
  .object({
    rendered: z.number().int().nonnegative(),
    reused: z.number().int().nonnegative(),
    total: z.number().int().positive(),
    audioReused: z.boolean().optional(),
  })
  .strict()
  .refine((value) => value.rendered + value.reused <= value.total)

/** Identity follows the versioned, pure timeline engine, never temporary media URLs. */
export function timelineChunks(timeline: VideoProject, context: ChunkContext) {
  const fps = timeline.fps.numerator / timeline.fps.denominator,
    framesPerChunk = Math.max(1, Math.round(fps * 5), Math.ceil(timeline.durationInFrames / 240)),
    chunks: TimelineChunk[] = []
  const fonts = [
    ...new Set([
      ...(timeline.fontAssetId ? [timeline.fontAssetId] : []),
      ...timeline.clips.flatMap((clip) =>
        clip.art?.composition.fontAssetId ? [clip.art.composition.fontAssetId] : [],
      ),
    ]),
  ].sort()
  const captionTracks = timeline.tracks.filter((track) => track.kind === 'captions')
  for (let from = 0; from < timeline.durationInFrames; from += framesPerChunk) {
    const to = Math.min(from + framesPerChunk, timeline.durationInFrames) - 1,
      intersects = (start: number, duration: number) => start <= to && start + duration > from,
      clips = timeline.clips.filter((clip) => intersects(clip.startFrame, clip.durationInFrames)),
      visual = clips.filter((clip) => clip.kind !== 'audio'),
      trackIds = new Set(visual.map((clip) => clip.trackId)),
      ids = [
        ...new Set([
          ...fonts,
          ...visual.flatMap((clip) => (clip.assetId ? [clip.assetId] : [])),
          ...visual.flatMap((clip) => (clip.art ? artAssetIds(clip.art.composition) : [])),
        ]),
      ].sort(),
      assets = ids.map((id) => {
        const hash = context.assetHashes[id]
        if (!hash) throw new Error('Uma dependência do trecho não foi verificada')
        return { id, hash }
      }),
      captions =
        captionTracks.length && captionTracks.every((track) => track.muted)
          ? []
          : clips
              .filter(
                (clip) =>
                  (clip.kind === 'video' || clip.kind === 'audio') &&
                  (clip.showCaptions ?? clip.kind === 'video'),
              )
              .flatMap((clip) =>
                captionsForClip(timeline, clip)
                  .filter((caption) => intersects(caption.from, caption.durationInFrames))
                  .map((caption) => ({ clipId: clip.id, ...caption })),
              )
    const key = createHash('sha256')
      .update(
        canonicalJson({
          version: 'timeline-chunks-v2',
          engine: context.engineSha256,
          // Changing any encoding option requires a new version above (worker hash also changes).
          from,
          to,
          framesPerChunk,
          fps: timeline.fps,
          duration: timeline.durationInFrames,
          width: timeline.width,
          height: timeline.height,
          recipeVersion: timeline.recipeVersion,
          background: timeline.background,
          accent: timeline.accent,
          fontAssetId: timeline.fontAssetId,
          fonts,
          assets,
          tracks: timeline.tracks
            .filter((track) => trackIds.has(track.id))
            .map(({ id, kind }) => ({ id, kind })),
          clips: visual.map(({ volume: _volume, ...clip }) => clip),
          captions,
        }),
      )
      .digest('hex')
    chunks.push({ key, from, to })
  }
  return { framesPerChunk, chunks }
}

/** One continuous audio render, reused independently of captions, text and graphics. */
export function timelineAudioKey(timeline: VideoProject, context: ChunkContext) {
  const clips = timeline.clips
      .filter((clip) => clip.kind === 'audio' || clip.kind === 'video')
      .map((clip) => {
        const sha256 = clip.assetId ? context.assetHashes[clip.assetId] : undefined
        if (!sha256) throw new Error('Uma dependência de áudio não foi verificada')
        return {
          id: clip.id,
          trackId: clip.trackId,
          assetId: clip.assetId,
          sha256,
          startFrame: clip.startFrame,
          durationInFrames: clip.durationInFrames,
          sourceStartMs: clip.sourceStartMs,
          playbackRate: clip.playbackRate,
          volume: clip.volume,
          fadeInFrames: clip.fadeInFrames,
          fadeOutFrames: clip.fadeOutFrames,
        }
      }),
    tracks = new Set(clips.map((clip) => clip.trackId))
  return createHash('sha256')
    .update(
      canonicalJson({
        version: 'timeline-audio-v1',
        engine: context.engineSha256,
        fps: timeline.fps,
        durationInFrames: timeline.durationInFrames,
        clips,
        tracks: timeline.tracks.filter((track) => tracks.has(track.id)),
      }),
    )
    .digest('hex')
}
