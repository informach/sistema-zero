import { z } from 'zod'
import { analyticsDimensionsSchema } from './analytics-dimensions'
import { timestampSchema } from './common'
import { measurementSchema } from './intelligence'

export const evidenceObservationSchema = z
  .object({
    schemaVersion: z.literal(1),
    sourceType: z.enum(['public', 'imported']),
    network: z.string().trim().min(1).max(100),
    subject: z.string().trim().min(1).max(500),
    periodStart: timestampSchema,
    periodEnd: timestampSchema,
    collectedAt: timestampSchema,
    sampleSize: z.number().int().nonnegative().nullable(),
    coverage: z.string().trim().min(1).max(2000),
    dimensions: analyticsDimensionsSchema,
    metrics: z
      .array(
        z
          .object({
            key: z.string().regex(/^[a-z][a-z0-9_-]{0,99}$/),
            label: z.string().trim().min(1).max(200),
            unit: z.enum(['count', 'ratio', 'percent', 'seconds', 'other']),
            measurement: measurementSchema,
          })
          .strict(),
      )
      .min(1)
      .max(30),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      Date.parse(value.periodEnd) < Date.parse(value.periodStart) ||
      Date.parse(value.collectedAt) < Date.parse(value.periodEnd)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'A janela observada deve terminar após seu início e até a coleta.',
      })
    if (new Set(value.metrics.map((metric) => metric.key)).size !== value.metrics.length)
      ctx.addIssue({
        code: 'custom',
        message: 'Uma métrica não pode aparecer duas vezes na mesma observação.',
      })
  })
export type EvidenceObservation = z.infer<typeof evidenceObservationSchema>
