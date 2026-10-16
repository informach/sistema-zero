import { z } from 'zod'
import { artRecipeIdSchema } from './art-recipes'
import { idSchema } from './common'

const color = z.string().regex(/^#[a-fA-F0-9]{6}$/)
export const imageRegionSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().positive().max(1),
    height: z.number().positive().max(1),
  })
  .strict()
  .refine(
    (value) => value.x + value.width <= 1.000001 && value.y + value.height <= 1.000001,
    'A região precisa ficar dentro da imagem',
  )
export type ImageRegion = z.infer<typeof imageRegionSchema>
const frame = z
  .object({
    x: z.number().min(0).max(3840),
    y: z.number().min(0).max(3840),
    width: z.number().positive().max(3840),
    height: z.number().positive().max(3840),
  })
  .strict()
const base = { id: idSchema, frame, protected: z.boolean(), opacity: z.number().min(0).max(1) }
export const artLayerSchema = z.union([
  z
    .object({
      ...base,
      kind: z.literal('image'),
      assetId: idSchema,
      fit: z.enum(['contain', 'cover']),
      radius: z.number().min(0).max(1000),
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal('shape'),
      shape: z.enum(['rectangle', 'ellipse']),
      color,
      radius: z.number().min(0).max(1000),
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal('text'),
      source: z.enum(['body', 'title', 'literal']),
      text: z.string().max(2000),
      paragraphs: z.array(z.number().int().min(0).max(99)).max(100),
      fontSize: z.number().min(12).max(250),
      lineHeight: z.number().min(0.8).max(2),
      weight: z.enum(['600', '800']),
      align: z.enum(['left', 'center', 'right']),
      color,
    })
    .strict(),
])
export const artSchema = z
  .object({
    schemaVersion: z.literal(1),
    recipeVersion: z.literal('marketing-art-v1'),
    designRecipeId: artRecipeIdSchema.optional(),
    width: z.number().int().min(240).max(3840),
    height: z.number().int().min(240).max(3840),
    background: color,
    fontAssetId: idSchema.nullable(),
    layers: z.array(artLayerSchema).min(1).max(100),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (new Set(value.layers.map((layer) => layer.id)).size !== value.layers.length)
      ctx.addIssue({ code: 'custom', message: 'Camadas duplicadas' })
    for (const layer of value.layers) {
      if (
        layer.frame.x + layer.frame.width > value.width ||
        layer.frame.y + layer.frame.height > value.height
      )
        ctx.addIssue({ code: 'custom', message: 'Uma camada ultrapassa a área da arte' })
      if (layer.kind === 'text' && layer.source === 'literal' && !layer.text.trim())
        ctx.addIssue({ code: 'custom', message: 'Texto de apoio vazio' })
      if (layer.kind === 'text' && layer.source !== 'literal' && layer.text !== '')
        ctx.addIssue({
          code: 'custom',
          message: 'Texto vinculado deve usar a copy, sem uma segunda versão literal',
        })
      if (layer.kind === 'text' && layer.opacity !== 1)
        ctx.addIssue({ code: 'custom', message: 'Texto precisa permanecer totalmente visível' })
      if (layer.kind === 'text' && new Set(layer.paragraphs).size !== layer.paragraphs.length)
        ctx.addIssue({ code: 'custom', message: 'Parágrafos duplicados' })
    }
  })
export type ArtComposition = z.infer<typeof artSchema>
export type ArtLayer = z.infer<typeof artLayerSchema>
export function artAssetIds(value: ArtComposition) {
  return [
    ...new Set([
      ...value.layers.flatMap((layer) => (layer.kind === 'image' ? [layer.assetId] : [])),
      ...(value.fontAssetId ? [value.fontAssetId] : []),
    ]),
  ]
}
export function artText(
  layer: Extract<ArtLayer, { kind: 'text' }>,
  copy: { body: string; title: string },
) {
  const text = layer.source === 'literal' ? layer.text : copy[layer.source]
  if (!layer.paragraphs.length || layer.source === 'literal') return text
  const paragraphs = text.split(/\n\s*\n/)
  if (layer.paragraphs.some((index) => paragraphs[index] === undefined))
    throw new Error('A copy mudou de estrutura; peça à IA para ajustar a montagem')
  return layer.paragraphs.map((index) => paragraphs[index]).join('\n\n')
}
export const artProposalSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal('art'),
    summary: z.string().min(1).max(4000),
    variants: z
      .array(
        z
          .object({
            label: z.string().min(1).max(200),
            componentId: idSchema,
            composition: artSchema.nullable(),
            finalAssetId: idSchema.nullable(),
            alt: z.string().max(4000),
          })
          .strict(),
      )
      .min(1)
      .max(4),
  })
  .strict()
export type ArtProposal = z.infer<typeof artProposalSchema>
