import { z } from 'zod'
import { hashSchema, idSchema } from './common'
import type { VideoProject } from './video'

export const demonstrationRecipeIdSchema = z.enum([
  'detail-context-v1',
  'rule-result-v1',
  'before-after-v1',
])
export type DemonstrationRecipeId = z.infer<typeof demonstrationRecipeIdSchema>
export const DEMONSTRATION_RECIPES: Record<
  DemonstrationRecipeId,
  { label: string; sourceCount: number; guidance: string }
> = {
  'detail-context-v1': {
    label: 'Detalhe e contexto',
    sourceCount: 1,
    guidance:
      'Aproxime um detalhe observado e revele a imagem inteira. A câmera não simula movimento do jogo.',
  },
  'rule-result-v1': {
    label: 'Regra e resultado',
    sourceCount: 2,
    guidance:
      'Primeiro a regra real, depois o estado observado. A imagem da regra e a do resultado precisam de evidência.',
  },
  'before-after-v1': {
    label: 'Antes e depois',
    sourceCount: 2,
    guidance:
      'Compare dois estados verificados. Preserve parâmetros e condições; não invente uma execução entre os prints.',
  },
}
export const demonstrationFocusSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().min(0.05).max(1),
    height: z.number().min(0.05).max(1),
  })
  .strict()
  .refine(
    (region) => region.x + region.width <= 1 && region.y + region.height <= 1,
    'O foco precisa estar dentro da imagem',
  )
export const demonstrationSourceSchema = z
  .object({
    id: idSchema,
    assetId: idSchema,
    sha256: hashSchema,
    width: z.number().int().positive().max(32000),
    height: z.number().int().positive().max(32000),
    evidenceId: idSchema,
    evidenceRevisionId: idSchema,
    label: z.string().trim().min(1).max(120),
    focus: demonstrationFocusSchema,
  })
  .strict()
export const demonstrationSchema = z
  .object({
    schemaVersion: z.literal(1),
    recipeId: demonstrationRecipeIdSchema,
    headline: z.string().trim().min(1).max(200),
    sources: z.array(demonstrationSourceSchema).min(1).max(2),
  })
  .strict()
  .superRefine((scene, ctx) => {
    if (scene.sources.length !== DEMONSTRATION_RECIPES[scene.recipeId].sourceCount)
      ctx.addIssue({
        code: 'custom',
        message: 'A receita exige a quantidade correspondente de fontes',
      })
    if (new Set(scene.sources.map((source) => source.id)).size !== scene.sources.length)
      ctx.addIssue({ code: 'custom', message: 'Fontes da cena precisam de IDs distintos' })
  })
export type Demonstration = z.infer<typeof demonstrationSchema>
export type DemonstrationSource = z.infer<typeof demonstrationSourceSchema>
export function demonstrationSources(timeline: VideoProject): DemonstrationSource[] {
  return timeline.clips.flatMap((clip) => clip.demonstration?.sources ?? [])
}
