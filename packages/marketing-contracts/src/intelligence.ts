import { z } from 'zod'
import { idSchema, sourceSchema, timestampSchema } from './common'
export const measurementSchema = z
  .object({
    value: z.number().nonnegative().nullable(),
    availability: z.enum(['observed', 'unavailable', 'legacy-ambiguous']),
    denominator: z.number().positive().nullable(),
    definition: z.string().min(1).max(500),
  })
  .strict()
  .superRefine((v, ctx) => {
    if ((v.availability === 'observed') !== (v.value !== null))
      ctx.addIssue({ code: 'custom', message: 'Disponibilidade não corresponde ao valor' })
  })
export const observationSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: idSchema,
    projectId: idSchema,
    source: sourceSchema,
    sourceType: z.enum(['owned', 'public', 'imported']),
    periodStart: timestampSchema,
    periodEnd: timestampSchema,
    collectedAt: timestampSchema,
    metrics: z.record(z.string().max(100), measurementSchema),
    sampleSize: z.number().int().nonnegative().nullable(),
    coverage: z.string().max(2000),
    hypothesis: z.string().max(4000),
  })
  .strict()
  .refine((v) => Date.parse(v.periodEnd) >= Date.parse(v.periodStart), 'Período inválido')
export const watchlistSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: idSchema,
    projectId: idSchema,
    name: z.string().min(1).max(300),
    source: sourceSchema,
    mode: z.enum(['manual', 'connected-account']),
    intervalHours: z.number().int().min(1).max(720),
    timeZone: z.string().max(100),
    budgetCalls: z.number().int().min(0).max(1000),
    enabled: z.boolean(),
  })
  .strict()
