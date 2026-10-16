import { z } from 'zod'
import { idSchema } from './common'
import { videoSchema } from './video'
export const videoProposalSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal('video'),
    summary: z.string().min(1).max(4000),
    variants: z
      .array(
        z
          .object({
            label: z.string().min(1).max(200),
            videoId: idSchema,
            timeline: videoSchema,
            finalAssetId: idSchema.nullable(),
          })
          .strict(),
      )
      .min(1)
      .max(4),
  })
  .strict()
export type VideoProposal = z.infer<typeof videoProposalSchema>
