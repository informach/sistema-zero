import { z } from 'zod'
import { timestampSchema } from './common'

const token = z.string().regex(/^[a-z0-9_-]{1,100}$/)
export const commercialQuerySchema = z
  .object({
    from: timestampSchema,
    to: timestampSchema,
    source: z.literal('instagram'),
    campaign: token,
    content: token,
  })
  .strict()
  .refine(
    (v) =>
      Date.parse(v.to) > Date.parse(v.from) &&
      Date.parse(v.to) - Date.parse(v.from) <= 90 * 86400000,
    'Selecione até 90 dias',
  )
export const commercialReportSchema = z
  .object({
    schemaVersion: z.literal(1),
    medium: z.literal('dm'),
    from: timestampSchema,
    to: timestampSchema,
    asOf: timestampSchema,
    campaign: token,
    content: token,
    sessionAttribution: z.literal('first-session-touch'),
    leadAttribution: z.literal('first-lead-touch'),
    conversionWindowDays: z.literal(7),
    collection: z.enum(['observed', 'no-observations']),
    sessions: z.number().int().nonnegative().nullable(),
    lastEvent: timestampSchema.nullable(),
    newLeads: z.number().int().nonnegative(),
    paidPurchases: z.number().int().nonnegative(),
    knownRevenueCents: z.number().int().nonnegative(),
    missingRevenue: z.number().int().nonnegative(),
    missingPaymentIdentity: z.number().int().nonnegative(),
    oldOrOtherSourceLeads: z.number().int().nonnegative(),
  })
  .strict()
export type CommercialQuery = z.infer<typeof commercialQuerySchema>
export type CommercialReport = z.infer<typeof commercialReportSchema>
export const pieceCommercialReportSchema = z
  .object({
    reports: z.array(commercialReportSchema),
    unavailable: z.array(
      z.object({ campaign: token, content: token, reason: z.string() }).strict(),
    ),
  })
  .strict()
