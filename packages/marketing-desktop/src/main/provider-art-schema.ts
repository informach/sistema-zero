import { artProposalSchema, artRecipeIdSchema, artSchema } from '@sistemazero/marketing-contracts'
import { z } from 'zod'

// Native structured output requires every property, using null for absent values.
// Keep this transport requirement separate from backward-compatible stored revisions.
export const nativeArtCompositionSchema = z
  .object({ ...artSchema.shape, designRecipeId: artRecipeIdSchema.nullable() })
  .strict()
export const nativeArtProposalSchema = artProposalSchema.extend({
  variants: artProposalSchema.shape.variants.element
    .extend({
      composition: nativeArtCompositionSchema.nullable(),
    })
    .array()
    .min(1)
    .max(4),
})
export function canonicalArtProposal(value: z.infer<typeof nativeArtProposalSchema>) {
  return artProposalSchema.parse({
    ...value,
    variants: value.variants.map((variant) => {
      if (!variant.composition) return variant
      const { designRecipeId, ...composition } = variant.composition
      return {
        ...variant,
        composition: { ...composition, ...(designRecipeId ? { designRecipeId } : {}) },
      }
    }),
  })
}
