import { type Caption, parseSrt, serializeSrt } from '@remotion/captions'
import {
  captionSchema,
  captionsForClip,
  hashSchema,
  idSchema,
  stableEditorialId,
  type VideoProject,
} from '@sistemazero/marketing-contracts'
import { z } from 'zod'

export async function importSrtCaptions(
  input: string,
  source: { assetId: string; durationMs: number; srtSha256: string },
) {
  idSchema.parse(source.assetId)
  hashSchema.parse(source.srtSha256)
  z.number().positive().max(86400000).parse(source.durationMs)
  if (new TextEncoder().encode(input).byteLength > 2_000_000)
    throw new Error('A legenda excede 2 MB')
  const { captions } = parseSrt({ input, strict: true })
  if (captions.some((caption) => caption.endMs > source.durationMs + 1))
    throw new Error('A legenda contém um trecho além da duração do original')
  return z
    .array(captionSchema)
    .min(1)
    .max(10000)
    .parse(
      await Promise.all(
        captions.map(async (caption, index) => ({
          ...caption,
          id: await stableEditorialId(`srt:${source.assetId}:${source.srtSha256}:${index}`),
          assetId: source.assetId,
          corrected: false,
        })),
      ),
    )
}
export function timelineWebVtt(timeline: VideoProject) {
  const tracks = timeline.tracks.filter((track) => track.kind === 'captions')
  if (tracks.length && tracks.every((track) => track.muted)) return 'WEBVTT\n\n'
  const timestamp = (ms: number) => {
    const value = Math.max(0, Math.round(ms))
    return `${String(Math.floor(value / 3600000)).padStart(2, '0')}:${String(Math.floor(value / 60000) % 60).padStart(2, '0')}:${String(Math.floor(value / 1000) % 60).padStart(2, '0')}.${String(value % 1000).padStart(3, '0')}`
  }
  const fps = timeline.fps.numerator / timeline.fps.denominator
  const clips = timeline.clips.filter(
    (clip) =>
      ['video', 'audio'].includes(clip.kind) && (clip.showCaptions ?? clip.kind === 'video'),
  )
  const captions = clips
    .flatMap((clip) => captionsForClip(timeline, clip))
    .sort((a, b) => a.from - b.from)
  return `WEBVTT\n\n${captions.map((caption, index) => `${index + 1}\n${timestamp((caption.from * 1000) / fps)} --> ${timestamp(((caption.from + caption.durationInFrames) * 1000) / fps)}\n${caption.text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}\n`).join('\n')}`
}
export function exportSourceSrt(captions: VideoProject['captions']) {
  if (new Set(captions.map((caption) => caption.assetId)).size > 1)
    throw new Error('Exporte separadamente as legendas de cada gravação original')
  const lines: Caption[][] = captions.map((caption) => [
    {
      text: caption.text,
      startMs: caption.startMs,
      endMs: caption.endMs,
      timestampMs: caption.timestampMs ?? null,
      confidence: caption.confidence ?? null,
    },
  ])
  return serializeSrt({ lines })
}
