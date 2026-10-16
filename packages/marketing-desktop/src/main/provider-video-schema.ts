import {
  captionSchema,
  clipSchema,
  videoArtSchema,
  videoProposalSchema,
  videoSchema,
} from '@sistemazero/marketing-contracts'
import { z } from 'zod'
import { nativeArtCompositionSchema } from './provider-art-schema'

// Native structured output requires every property to be required. Null is transport-only.
const nativeClip = z
  .object({
    ...clipSchema.shape,
    assetId: clipSchema.shape.assetId.unwrap().nullable(),
    text: clipSchema.shape.text.unwrap().nullable(),
    showCaptions: z.boolean().nullable(),
    art: videoArtSchema.extend({ composition: nativeArtCompositionSchema }).nullable(),
    generated: clipSchema.shape.generated.unwrap().nullable(),
    counter: clipSchema.shape.counter.unwrap().nullable(),
    listItems: clipSchema.shape.listItems.unwrap().nullable(),
  })
  .strict()
const nativeCaption = z
  .object({
    ...captionSchema.shape,
    timestampMs: z.number().nonnegative().nullable(),
    confidence: z.number().min(0).max(1).nullable(),
  })
  .strict()
const nativeTimeline = z
  .object({
    ...videoSchema.shape,
    clips: z.array(nativeClip).max(500),
    captions: z.array(nativeCaption).max(10000),
    fontAssetId: videoSchema.shape.fontAssetId.unwrap().nullable(),
  })
  .strict()
export const nativeVideoProposalSchema = videoProposalSchema
  .extend({
    variants: z
      .array(videoProposalSchema.shape.variants.element.extend({ timeline: nativeTimeline }))
      .min(1)
      .max(4),
  })
  .strict()
export function canonicalVideoProposal(value: z.infer<typeof nativeVideoProposalSchema>) {
  return videoProposalSchema.parse({
    ...value,
    variants: value.variants.map((variant) => {
      const { fontAssetId, ...timeline } = variant.timeline
      return {
        ...variant,
        timeline: {
          ...timeline,
          ...(fontAssetId ? { fontAssetId } : {}),
          clips: timeline.clips.map(
            ({ assetId, text, showCaptions, art, generated, counter, listItems, ...clip }) => ({
              ...clip,
              ...(assetId ? { assetId } : {}),
              ...(generated ? { generated } : {}),
              ...(text !== null ? { text } : {}),
              ...(showCaptions !== null ? { showCaptions } : {}),
              ...(counter ? { counter } : {}),
              ...(listItems ? { listItems } : {}),
              ...(art
                ? {
                    art: {
                      ...art,
                      composition: {
                        ...art.composition,
                        designRecipeId: art.composition.designRecipeId ?? undefined,
                      },
                    },
                  }
                : {}),
            }),
          ),
        },
      }
    }),
  })
}
