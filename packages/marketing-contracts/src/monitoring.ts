import { z } from 'zod'
import { httpUrlSchema, idSchema, timestampSchema } from './common'

export const timeZoneSchema = z
  .string()
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: value }).format()
      return true
    } catch {
      return false
    }
  }, 'Fuso horário inválido')
export const monitoringConfigSchema = z
  .object({
    mode: z.enum(['feed', 'local-ai', 'manual']),
    feedUrl: httpUrlSchema.nullable(),
    intervalHours: z.number().int().min(1).max(720),
    timeZone: timeZoneSchema,
    dailyCallBudget: z.number().int().min(0).max(100),
    enabled: z.boolean(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.mode === 'feed' && !value.feedUrl?.startsWith('https://'))
      ctx.addIssue({
        code: 'custom',
        path: ['feedUrl'],
        message: 'Informe o endereço HTTPS do feed RSS ou Atom',
      })
    if (value.feedUrl && URL.canParse(value.feedUrl)) {
      const url = new URL(value.feedUrl)
      if (url.username || url.password || url.hash || (url.port && url.port !== '443'))
        ctx.addIssue({
          code: 'custom',
          path: ['feedUrl'],
          message: 'Use a URL pública do feed sem credenciais, fragmento ou porta alternativa',
        })
    }
    if (value.mode !== 'feed' && value.feedUrl !== null)
      ctx.addIssue({
        code: 'custom',
        path: ['feedUrl'],
        message: 'Feed não pertence a este modo de acompanhamento',
      })
  })
export type MonitoringConfig = z.infer<typeof monitoringConfigSchema>
export const configureMonitoringSchema = z
  .object({
    schemaVersion: z.literal(1),
    operationId: idSchema,
    expectedRevisionId: idSchema,
    expectedVersion: z.number().int().nonnegative(),
    config: monitoringConfigSchema,
  })
  .strict()
export type ConfigureMonitoring = z.infer<typeof configureMonitoringSchema>
export const monitoringStateSchema = z.enum([
  'scheduled',
  'running',
  'retry',
  'budget',
  'waiting-local',
  'paused',
  'disabled',
])
export const monitoringViewSchema = z
  .object({
    projectId: idSchema,
    watchlistId: idSchema,
    version: z.number().int().positive(),
    config: monitoringConfigSchema,
    ownerId: idSchema,
    state: monitoringStateSchema,
    nextAt: timestampSchema,
    lastCollectedAt: timestampSchema.nullable(),
    error: z.string().max(1000).nullable(),
    callsToday: z.number().int().nonnegative(),
    budgetDay: z.string().nullable(),
    observedEntries: z.number().int().nonnegative(),
    truncated: z.boolean(),
  })
  .strict()
export type MonitoringView = z.infer<typeof monitoringViewSchema>
export const monitoringEntrySchema = z
  .object({
    id: idSchema,
    watchlistId: idSchema,
    evidenceId: idSchema,
    evidenceRevisionId: idSchema,
    title: z.string().max(300),
    url: httpUrlSchema.nullable(),
    observedAt: timestampSchema,
    publishedAt: timestampSchema.nullable(),
    change: z.enum(['new', 'changed']),
    sourceType: z.enum(['public', 'imported']),
  })
  .strict()
export const monitoringStatusSchema = z
  .object({
    monitor: monitoringViewSchema.nullable(),
    entries: z.array(monitoringEntrySchema).max(25),
    more: z.boolean(),
  })
  .strict()
export type MonitoringStatus = z.infer<typeof monitoringStatusSchema>
export const monitoringObservationSchema = z
  .object({
    schemaVersion: z.literal(1),
    operationId: idSchema,
    expectedVersion: z.number().int().positive(),
    evidenceId: idSchema,
    expectedRevisionId: idSchema,
    sourceType: z.enum(['public', 'imported']),
  })
  .strict()
export type MonitoringObservation = z.infer<typeof monitoringObservationSchema>
export const monitoringOverviewSchema = z
  .object({
    sources: z
      .array(z.object({ title: z.string().max(300), monitor: monitoringViewSchema }).strict())
      .max(100),
    entries: z.array(monitoringEntrySchema).max(50),
    sourcesTruncated: z.boolean(),
    entriesTruncated: z.boolean(),
  })
  .strict()
export type MonitoringOverview = z.infer<typeof monitoringOverviewSchema>
