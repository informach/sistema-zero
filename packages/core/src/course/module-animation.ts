import { z } from 'zod'

const mediaUrl = (extension: string | readonly string[]) =>
  z
    .string()
    .max(2048)
    .refine((value) => {
      try {
        const url = new URL(value)
        return (
          ['https:', 'http:'].includes(url.protocol) &&
          !url.username &&
          !url.password &&
          !url.hash &&
          (typeof extension === 'string' ? [extension] : extension).some((value) =>
            url.pathname.toLowerCase().endsWith(value),
          )
        )
      } catch {
        return false
      }
    }, 'Referência de mídia inválida.')

/** The artwork is immutable; each upload produces a new reference and matching poster. */
export const ModuleAnimationSchema = z.strictObject({
  format: z.literal('edi-animation'),
  version: z.literal(1),
  url: mediaUrl('.edi-animation.json'),
  title: z.string().trim().min(1).max(200),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  bytes: z.number().int().positive().max(10_000_000),
  poster: z.strictObject({
    url: mediaUrl(['.png', '.webp']),
    width: z.number().int().positive().max(1024),
    height: z.number().int().positive().max(1024),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }),
})
export type ModuleAnimation = z.infer<typeof ModuleAnimationSchema>

export function moduleAnimation(value: unknown): ModuleAnimation | null {
  const parsed = ModuleAnimationSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}
