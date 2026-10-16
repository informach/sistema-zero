import { z } from 'zod'
import { hashSchema, idSchema, timestampSchema } from './common'
export const metricKeys = ['views', 'likes', 'comments', 'shares', 'saves'] as const
export type MetricKey = (typeof metricKeys)[number]
export const metricAvailabilitySchema = z.enum(['observed', 'unavailable', 'legacy-unknown'])
export const publicationMetricsSnapshotSchema = z
  .object({
    id: idSchema,
    capturedAt: timestampSchema,
    views: z.number().nonnegative().nullable(),
    likes: z.number().nonnegative().nullable(),
    comments: z.number().nonnegative().nullable(),
    shares: z.number().nonnegative().nullable(),
    saves: z.number().nonnegative().nullable(),
    availability: z
      .object({
        views: metricAvailabilitySchema,
        likes: metricAvailabilitySchema,
        comments: metricAvailabilitySchema,
        shares: metricAvailabilitySchema,
        saves: metricAvailabilitySchema,
      })
      .strict(),
  })
  .strict()
export type PublicationMetricsSnapshot = z.infer<typeof publicationMetricsSnapshotSchema>
export const publicationMetricsPageSchema = z
  .object({ snapshots: z.array(publicationMetricsSnapshotSchema).max(100) })
  .strict()

export const metricsAnalysisSchema = z
  .object({
    schemaVersion: z.literal(1),
    operationId: idSchema,
    snapshotId: idSchema,
    expectedHash: hashSchema,
    objective: z.string().trim().min(1).max(2000),
  })
  .strict()
export type MetricsAnalysis = z.infer<typeof metricsAnalysisSchema>
