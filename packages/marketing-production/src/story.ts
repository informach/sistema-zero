import { z } from 'zod'

export const storySchema = z
  .object({
    title: z.string().trim().min(1).max(180),
    subtitle: z.string().max(280),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    width: z.number().int().min(240).max(1920),
    height: z.number().int().min(240).max(1920),
    fps: z.number().int().min(24).max(60),
    durationInFrames: z.number().int().min(24).max(1800),
    clip: z
      .object({
        src: z.string().url(),
        trimBefore: z.number().int().min(0).max(216000),
        muted: z.boolean(),
      })
      .optional(),
  })
  .strict()

export type StoryProps = z.infer<typeof storySchema>
export const defaultStory: StoryProps = {
  title: 'Uma ideia ganha movimento',
  subtitle: 'Uma composição para conferir a produção local.',
  accent: '#F4C95D',
  width: 720,
  height: 1280,
  fps: 30,
  durationInFrames: 150,
}

export const storyPatchSchema = z
  .object({
    title: storySchema.shape.title.optional(),
    subtitle: storySchema.shape.subtitle.optional(),
    accent: storySchema.shape.accent.optional(),
    durationInFrames: storySchema.shape.durationInFrames.optional(),
    trimBefore: z.number().int().min(0).max(216000).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Nenhuma alteração recebida')

export function applyStoryPatch(base: StoryProps, patch: unknown): StoryProps {
  const validated = storyPatchSchema.parse(patch)
  const { trimBefore, ...fields } = validated
  if (trimBefore !== undefined && !base.clip) {
    throw new Error('Adicione uma gravação antes de solicitar um corte.')
  }
  return storySchema.parse({
    ...base,
    ...fields,
    ...(base.clip
      ? { clip: { ...base.clip, trimBefore: trimBefore ?? base.clip.trimBefore } }
      : {}),
  })
}
