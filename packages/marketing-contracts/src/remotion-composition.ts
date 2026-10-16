import { z } from 'zod'
import type { AssetManifest } from './assets'
import { canonicalJson, hashSchema, idSchema } from './common'
import { renderEngineSchema } from './render-engine'
import { fpsSchema } from './video-rate'

export const compositionSourceSchema = z
  .string()
  .trim()
  .min(1)
  .max(32000)
  .refine(
    (value) => new TextEncoder().encode(value).byteLength <= 32000,
    'Fonte da composição acima de 32 KB',
  )
export const compositionInputSchema = z
  .object({
    schemaVersion: z.literal(1),
    width: z.number().int().min(240).max(3840).multipleOf(2),
    height: z.number().int().min(240).max(3840).multipleOf(2),
    fps: fpsSchema,
    durationInFrames: z.number().int().positive().max(7200),
    title: z.string().max(300),
    body: z.string().max(4000),
    requiredText: z.array(z.string().min(1).max(4000)).max(20),
    assetIds: z.array(idSchema).max(12),
    fontAssetId: idSchema.nullable(),
    background: z.string().regex(/^#[a-fA-F0-9]{6}$/),
    accent: z.string().regex(/^#[a-fA-F0-9]{6}$/),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.durationInFrames * value.fps.denominator > 60 * value.fps.numerator)
      context.addIssue({
        code: 'custom',
        message: 'Uma cena de composição pode ter até 60 segundos',
      })
    if (new Set(value.assetIds).size !== value.assetIds.length)
      context.addIssue({ code: 'custom', message: 'Mídias repetidas na composição' })
    if (
      value.requiredText.some((text) => !value.title.includes(text) && !value.body.includes(text))
    )
      context.addIssue({
        code: 'custom',
        message: 'O texto exigido não está nos parâmetros da composição',
      })
  })
export const generatedCompositionSchema = z
  .object({
    schemaVersion: z.literal(1),
    source: compositionSourceSchema,
    sourceSha256: hashSchema,
    compiledSha256: hashSchema,
    engine: renderEngineSchema,
    inputSha256: hashSchema,
    sourceRevisionId: idSchema,
    input: compositionInputSchema,
    protectedText: z.array(z.string().min(1).max(2000)).max(100),
    outputAssetId: idSchema,
    outputSha256: hashSchema,
    observedFrames: z.number().int().positive().max(7200),
    textFrames: z.array(z.number().int().nonnegative().max(7200)).max(20),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.protectedText.some((text) => !value.input.body.includes(text)))
      ctx.addIssue({ code: 'custom', message: 'A composição removeu um texto protegido' })
    if (
      value.observedFrames !== value.input.durationInFrames ||
      value.textFrames.length !== value.input.requiredText.length ||
      value.textFrames.some(
        (frames) =>
          frames > value.observedFrames || frames < compositionMinimumVisible(value.input),
      )
    )
      ctx.addIssue({ code: 'custom', message: 'A composição não foi validada em todos os quadros' })
  })
export const compositionProposalSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal('composition'),
    summary: z.string().min(1).max(4000),
    variants: z
      .array(
        z
          .object({
            label: z.string().min(1).max(200),
            source: compositionSourceSchema,
            title: z.string().max(300),
            body: z.string().max(4000),
          })
          .strict(),
      )
      .min(1)
      .max(4),
  })
  .strict()
export type CompositionInput = z.infer<typeof compositionInputSchema>
export type GeneratedComposition = z.infer<typeof generatedCompositionSchema>
export type CompositionProposal = z.infer<typeof compositionProposalSchema>

export function compositionMinimumVisible(input: CompositionInput) {
  return Math.max(
    1,
    Math.min(
      Math.ceil(input.fps.numerator / input.fps.denominator / 2),
      Math.floor(input.durationInFrames / 4),
    ),
  )
}

export async function compositionIdentity(
  source: string,
  input: CompositionInput,
  manifests: AssetManifest[],
) {
  const ids = [...input.assetIds, ...(input.fontAssetId ? [input.fontAssetId] : [])]
  const assets = [...new Set(ids)].sort().map((id) => {
    const asset = manifests.find((item) => item.id === id)
    if (!asset) throw new Error('A composição exige todas as mídias confirmadas')
    return { id, sha256: asset.sha256, size: asset.size, mime: asset.mime }
  })
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonicalJson({ source, input, assets })),
  )
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
