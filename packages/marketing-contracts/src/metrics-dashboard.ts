import { z } from 'zod'
import { idSchema, timestampSchema } from './common'
import { deliveryFormatSchema } from './delivery'
import { metricAvailabilitySchema } from './metrics'

const network = z.enum(['instagram', 'facebook', 'youtube', 'tiktok'])
const count = z.number().int().nonnegative(),
  value = count.nullable()
export const metricsSummarySchema = z
  .object({
    coverage: z
      .object({
        includedPosts: count,
        limit: count,
        topTruncated: z.boolean(),
        totalsTruncated: z.boolean(),
      })
      .strict(),
    accounts: z.array(
      z
        .object({
          accountId: idSchema,
          network,
          displayName: z.string(),
          followers: value,
          availability: metricAvailabilitySchema,
          capturedAt: timestampSchema.nullable(),
        })
        .strict(),
    ),
    networkTotals: z.array(
      z
        .object({
          network,
          posts: count,
          views: value,
          likes: value,
          comments: value,
          observedPosts: z.object({ views: count, likes: count, comments: count }).strict(),
        })
        .strict(),
    ),
    topPublications: z
      .array(
        z
          .object({
            publicationId: idSchema,
            contentId: idSchema,
            contentTitle: z.string(),
            network,
            format: deliveryFormatSchema,
            publishedAt: timestampSchema.nullable(),
            views: value,
            likes: value,
            comments: value,
            capturedAt: timestampSchema,
          })
          .strict(),
      )
      .max(10),
  })
  .strict()
export type MetricsSummaryView = z.infer<typeof metricsSummarySchema>
export const bestTimesSchema = z
  .object({
    coverage: z.object({ truncated: z.boolean(), limit: count }).strict(),
    totalPosts: count,
    cells: z
      .array(
        z
          .object({
            dow: count.max(6),
            hour: count.max(23),
            posts: count,
            views: value,
            likes: value,
            viewsObserved: count,
            likesObserved: count,
          })
          .strict(),
      )
      .max(168),
  })
  .strict()
export type BestTimesView = z.infer<typeof bestTimesSchema>
export const followersSeriesSchema = z
  .object({
    series: z.array(
      z
        .object({
          accountId: idSchema,
          network,
          displayName: z.string(),
          points: z
            .array(
              z
                .object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), followers: value })
                .strict(),
            )
            .max(367),
        })
        .strict(),
    ),
  })
  .strict()
export type FollowersSeriesView = z.infer<typeof followersSeriesSchema>
