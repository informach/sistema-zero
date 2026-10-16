import { z } from 'zod'
import { analyticsDimensionsSchema } from './analytics-dimensions'

export { type AnalyticsDimensions, analyticsDimensionsSchema } from './analytics-dimensions'

import { idSchema, timestampSchema } from './common'
import { publicationMetricsSnapshotSchema } from './metrics'
import { evidenceObservationSchema } from './observation'

export const analyticsQuerySchema = z
  .object({
    days: z.coerce.number().int().min(1).max(365).default(90),
  })
  .strict()
export const analyticsRowSchema = z
  .object({
    publicationId: idSchema,
    editionId: idSchema,
    pieceId: idSchema,
    title: z.string().max(300),
    network: z.string().max(100),
    sourceType: z.enum(['connected-account', 'unlinked']),
    publishedAt: timestampSchema,
    dimensions: analyticsDimensionsSchema,
    metrics: publicationMetricsSnapshotSchema.nullable(),
    collectionVersion: z.number().int().nonnegative().nullable(),
  })
  .strict()
export type AnalyticsRow = z.infer<typeof analyticsRowSchema>
export const projectAnalyticsSchema = z
  .object({
    projectId: idSchema,
    since: timestampSchema,
    until: timestampSchema,
    rows: z.array(analyticsRowSchema).max(500),
    observations: z
      .array(
        z
          .object({
            evidenceId: idSchema,
            revisionId: idSchema,
            title: z.string().max(300),
            observation: evidenceObservationSchema,
          })
          .strict(),
      )
      .max(200)
      .default([]),
    coverage: z
      .object({
        included: z.number().int().nonnegative(),
        limit: z.literal(500),
        truncated: z.boolean(),
        observationsTruncated: z.boolean().default(false),
      })
      .strict(),
  })
  .strict()
export type ProjectAnalytics = z.infer<typeof projectAnalyticsSchema>
