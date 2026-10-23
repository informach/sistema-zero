import { z } from 'zod'
export const analyticsDimensionsSchema = z
  .object({
    objective: z.string().max(2000),
    audienceNeed: z.string().max(1000),
    series: z.string().max(300),
    format: z.string().max(100),
  })
  .strict()
export type AnalyticsDimensions = z.infer<typeof analyticsDimensionsSchema>
