import { z } from 'zod'
import { artAssetIds, artSchema } from './art'
import { idSchema } from './common'
import { demonstrationSchema, demonstrationSources } from './demonstration'
export const videoArtSchema = z
  .object({
    composition: artSchema,
    title: z.string().max(300),
    body: z.string().max(100000),
    protectedText: z.array(z.string().max(2000)).max(100),
    sourceRevisionId: idSchema,
  })
  .strict()
export const fpsSchema = z
  .object({
    numerator: z.number().int().min(1).max(60000),
    denominator: z.number().int().min(1).max(1001),
  })
  .strict()
  .refine(
    (v) => v.numerator / v.denominator >= 1 && v.numerator / v.denominator <= 120,
    'FPS fora do limite',
  )
export const clipSchema = z
  .object({
    id: idSchema,
    trackId: idSchema,
    assetId: idSchema.optional(),
    kind: z.enum(['video', 'audio', 'image', 'text', 'art']),
    art: videoArtSchema.optional(),
    demonstration: demonstrationSchema.optional(),
    startFrame: z.number().int().min(0).max(2160000),
    durationInFrames: z.number().int().min(1).max(2160000),
    sourceStartMs: z.number().min(0).max(86400000).default(0),
    playbackRate: z.number().min(0.25).max(4).default(1),
    volume: z.number().min(0).max(2).default(1),
    fadeInFrames: z.number().int().min(0).max(1800).default(0),
    fadeOutFrames: z.number().int().min(0).max(1800).default(0),
    fit: z.enum(['contain', 'cover']).default('cover'),
    text: z.string().max(2000).optional(),
    counter: z
      .object({
        from: z.number().finite().min(-1000000000).max(1000000000),
        to: z.number().finite().min(-1000000000).max(1000000000),
        decimals: z.number().int().min(0).max(3),
        prefix: z.string().max(20),
        suffix: z.string().max(20),
      })
      .strict()
      .optional(),
    listItems: z
      .array(z.object({ id: idSchema, text: z.string().trim().min(1).max(200) }).strict())
      .min(1)
      .max(8)
      .optional(),
    effect: z
      .enum(['none', 'fade', 'slide', 'zoom', 'lower-third', 'cta', 'highlight', 'counter', 'list'])
      .default('none'),
    position: z.enum(['center', 'top', 'bottom']).default('center'),
    protected: z.boolean().default(false),
    showCaptions: z.boolean().optional(),
  })
  .strict()
  .superRefine((clip, ctx) => {
    if (
      clip.demonstration &&
      (clip.kind !== 'image' ||
        clip.assetId !== clip.demonstration.sources[0]?.assetId ||
        clip.effect !== 'none' ||
        clip.fit !== 'contain')
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Demonstração exige imagem principal, contain e movimento da própria receita',
      })
    if (!['text', 'art'].includes(clip.kind) && !clip.assetId)
      ctx.addIssue({ code: 'custom', message: 'Mídia exige arquivo' })
    if ((clip.kind === 'art') !== Boolean(clip.art))
      ctx.addIssue({ code: 'custom', message: 'Cena de arte exige uma composição editável' })
    if (clip.art?.protectedText.some((text) => !clip.art?.body.includes(text)))
      ctx.addIssue({ code: 'custom', message: 'Uma fala protegida da arte foi removida' })
    if (clip.kind === 'text' && !clip.text?.trim())
      ctx.addIssue({ code: 'custom', message: 'Texto vazio' })
    if (
      clip.listItems &&
      new Set(clip.listItems.map((item) => item.id)).size !== clip.listItems.length
    )
      ctx.addIssue({ code: 'custom', message: 'Itens da lista têm IDs duplicados' })
    if (
      (clip.effect === 'counter') !== Boolean(clip.counter) ||
      (clip.effect === 'list') !== Boolean(clip.listItems)
    )
      ctx.addIssue({ code: 'custom', message: 'O efeito exige seus próprios parâmetros' })
    if (
      ['counter', 'list', 'lower-third', 'cta', 'highlight'].includes(clip.effect) &&
      clip.kind !== 'text'
    )
      ctx.addIssue({ code: 'custom', message: 'Este efeito pertence a uma cena de texto' })
    if (clip.fadeInFrames + clip.fadeOutFrames > clip.durationInFrames)
      ctx.addIssue({ code: 'custom', message: 'Fades excedem o clipe' })
  })
export const captionSchema = z
  .object({
    id: idSchema,
    assetId: idSchema,
    startMs: z.number().min(0),
    endMs: z.number().positive(),
    text: z.string().min(1).max(1000),
    corrected: z.boolean().default(false),
    timestampMs: z.number().nonnegative().nullable().optional(),
    confidence: z.number().min(0).max(1).nullable().optional(),
  })
  .strict()
  .refine((v) => v.endMs > v.startMs, 'Intervalo de legenda inválido')
export const videoSchema = z
  .object({
    schemaVersion: z.literal(1),
    recipeVersion: z.literal('marketing-timeline-v1'),
    width: z.number().int().min(240).max(3840).multipleOf(2),
    height: z.number().int().min(240).max(3840).multipleOf(2),
    fps: fpsSchema,
    durationInFrames: z.number().int().min(1).max(2160000),
    tracks: z
      .array(
        z
          .object({
            id: idSchema,
            kind: z.enum(['visual', 'audio', 'captions']),
            muted: z.boolean().default(false),
          })
          .strict(),
      )
      .min(1)
      .max(32),
    clips: z.array(clipSchema).max(500),
    captions: z.array(captionSchema).max(10000),
    background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    fontAssetId: idSchema.optional(),
  })
  .strict()
  .superRefine((video, ctx) => {
    const tracks = new Set(video.tracks.map((t) => t.id)),
      clips = new Set<string>(),
      captions = new Set<string>()
    if (tracks.size !== video.tracks.length)
      ctx.addIssue({ code: 'custom', message: 'Trilhas duplicadas' })
    for (const clip of video.clips) {
      if (
        clips.has(clip.id) ||
        !tracks.has(clip.trackId) ||
        clip.startFrame + clip.durationInFrames > video.durationInFrames
      )
        ctx.addIssue({ code: 'custom', message: 'Clipe duplicado, sem trilha ou fora da duração' })
      const track = video.tracks.find((t) => t.id === clip.trackId)
      if (
        track &&
        (track.kind === 'captions' || (clip.kind === 'audio') !== (track.kind === 'audio'))
      )
        ctx.addIssue({ code: 'custom', message: 'Tipo de clipe incompatível com a trilha' })
      clips.add(clip.id)
    }
    for (const caption of video.captions) {
      if (captions.has(caption.id)) ctx.addIssue({ code: 'custom', message: 'Legenda duplicada' })
      captions.add(caption.id)
    }
  })
export type VideoProject = z.infer<typeof videoSchema>
export type VideoClip = z.infer<typeof clipSchema>
export function counterText(clip: VideoClip, frame: number) {
  if (!clip.counter) return ''
  const progress = Math.max(0, Math.min(1, frame / Math.max(1, clip.durationInFrames - 1)))
  const { from, to, decimals, prefix, suffix } = clip.counter
  return `${prefix}${(from + (to - from) * progress).toFixed(decimals).replace('.', ',')}${suffix}`
}
export function videoAssetIds(video: VideoProject) {
  return [
    ...new Set([
      ...video.clips.flatMap((clip) => (clip.assetId ? [clip.assetId] : [])),
      ...demonstrationSources(video).map((source) => source.assetId),
      ...video.clips.flatMap((clip) => (clip.art ? artAssetIds(clip.art.composition) : [])),
      ...video.captions.map((caption) => caption.assetId),
      ...(video.fontAssetId ? [video.fontAssetId] : []),
    ]),
  ]
}
export function clipEnvelope(clip: VideoClip, frame: number) {
  if (frame < 0 || frame >= clip.durationInFrames) return 0
  const fadeIn = clip.fadeInFrames ? Math.min(1, frame / clip.fadeInFrames) : 1
  const fadeOut = clip.fadeOutFrames
    ? Math.min(1, (clip.durationInFrames - 1 - frame) / clip.fadeOutFrames)
    : 1
  return Math.max(0, Math.min(fadeIn, fadeOut))
}
export const timelineOperationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('remove'), clipId: idSchema }).strict(),
  z.object({ type: z.literal('replace'), clip: clipSchema }).strict(),
  z.object({ type: z.literal('insert'), clip: clipSchema }).strict(),
  z
    .object({
      type: z.literal('split'),
      clipId: idSchema,
      atFrame: z.number().int().positive(),
      newClipId: idSchema,
    })
    .strict(),
  z.object({ type: z.literal('captions'), captions: z.array(captionSchema).max(10000) }).strict(),
  z
    .object({
      type: z.literal('duration'),
      durationInFrames: z.number().int().positive().max(2160000),
    })
    .strict(),
])
export type TimelineOperation = z.infer<typeof timelineOperationSchema>
export function applyTimelineOperations(
  base: VideoProject,
  operations: TimelineOperation[],
): VideoProject {
  const next = structuredClone(base)
  for (const operation of operations) {
    const op = timelineOperationSchema.parse(operation)
    if (op.type === 'captions') {
      next.captions = op.captions
      continue
    }
    if (op.type === 'duration') {
      next.durationInFrames = op.durationInFrames
      continue
    }
    if (op.type === 'insert') {
      if (next.clips.some((c) => c.id === op.clip.id)) throw new Error('Clipe já existe')
      next.clips.push(op.clip)
      continue
    }
    const index = next.clips.findIndex(
      (c) => c.id === (op.type === 'replace' ? op.clip.id : op.clipId),
    )
    const clip = next.clips[index]
    if (!clip) throw new Error('Clipe não encontrado')
    if (clip.protected) throw new Error('Clipe protegido')
    if (op.type === 'remove') next.clips.splice(index, 1)
    if (op.type === 'replace') next.clips[index] = op.clip
    if (op.type === 'split') {
      if (op.atFrame >= clip.durationInFrames || next.clips.some((c) => c.id === op.newClipId))
        throw new Error('Divisão inválida')
      const remaining = clip.durationInFrames - op.atFrame
      next.clips.splice(
        index,
        1,
        {
          ...clip,
          durationInFrames: op.atFrame,
          fadeOutFrames: 0,
          fadeInFrames: Math.min(clip.fadeInFrames, op.atFrame),
        },
        {
          ...clip,
          id: op.newClipId,
          startFrame: clip.startFrame + op.atFrame,
          sourceStartMs:
            clip.sourceStartMs +
            ((op.atFrame * 1000 * next.fps.denominator) / next.fps.numerator) * clip.playbackRate,
          durationInFrames: remaining,
          fadeInFrames: 0,
          fadeOutFrames: Math.min(clip.fadeOutFrames, remaining),
        },
      )
    }
  }
  return videoSchema.parse(next)
}
export function captionsForClip(video: VideoProject, clip: VideoClip) {
  const fps = video.fps.numerator / video.fps.denominator
  return video.captions
    .filter((c) => c.assetId === clip.assetId)
    .flatMap((c) => {
      const from = Math.max(
        0,
        Math.ceil(((c.startMs - clip.sourceStartMs) / 1000 / clip.playbackRate) * fps),
      )
      const to = Math.min(
        clip.durationInFrames,
        Math.ceil(((c.endMs - clip.sourceStartMs) / 1000 / clip.playbackRate) * fps),
      )
      return to > from ? [{ ...c, from: clip.startFrame + from, durationInFrames: to - from }] : []
    })
}
