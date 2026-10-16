import { z } from 'zod'
import { idSchema, timestampSchema } from './common'
import { capabilitySchema, runStateSchema } from './execution'

export const productionRecordBodySchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('human-time'),
      // A declared interval, not inferred from browser uptime or inference latency.
      startedAt: timestampSchema,
      endedAt: timestampSchema,
      activity: z.enum(['planning', 'production', 'review', 'rework']),
      entityId: idSchema.nullable(),
      note: z.string().trim().min(1).max(2000),
    })
    .strict()
    .superRefine((value, ctx) => {
      const duration = Date.parse(value.endedAt) - Date.parse(value.startedAt)
      if (duration < 60_000 || duration > 86_400_000)
        ctx.addIssue({ code: 'custom', message: 'Informe de um minuto a 24 horas de trabalho.' })
    }),
  z
    .object({
      kind: z.literal('generation-review'),
      runId: idSchema,
      verdict: z.enum(['useful', 'discarded', 'rework']),
      note: z.string().trim().min(1).max(2000),
    })
    .strict(),
])
export type ProductionRecordBody = z.infer<typeof productionRecordBodySchema>
export const recordProductionSchema = z
  .object({
    operationId: idSchema,
    replacesId: idSchema.nullable(),
    body: productionRecordBodySchema,
  })
  .strict()
export type RecordProduction = z.infer<typeof recordProductionSchema>
export const voidProductionSchema = z.object({ operationId: idSchema, recordId: idSchema }).strict()
export const voidProductionResultSchema = z
  .object({ id: idSchema, voided: z.literal(true) })
  .strict()
export const productionRecordSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    actorId: idSchema,
    createdAt: timestampSchema,
    replacesId: idSchema.nullable(),
    body: productionRecordBodySchema,
  })
  .strict()
export type ProductionRecord = z.infer<typeof productionRecordSchema>
const count = z.number().int().nonnegative()
export const productionRunSchema = z
  .object({
    id: idSchema,
    entityId: idSchema,
    title: z.string(),
    createdAt: timestampSchema,
    provider: z.enum(['codex', 'claude']),
    capability: capabilitySchema,
    intent: z.enum(['adjust', 'alternatives', 'adapt']),
    state: runStateSchema,
    applied: z.boolean(),
    undone: z.boolean(),
    attempts: count,
    interruptedAttempts: count,
    recovered: z.boolean(),
    measuredDurationMs: count.nullable(),
    measuredDurations: count,
    inputTokens: count.nullable(),
    outputTokens: count.nullable(),
    inputCoverage: count,
    outputCoverage: count,
    review: productionRecordSchema.nullable(),
  })
  .strict()
export type ProductionRun = z.infer<typeof productionRunSchema>
export const productionActivityReportSchema = z
  .object({
    projectId: idSchema,
    since: timestampSchema,
    until: timestampSchema,
    runs: z.array(productionRunSchema).max(500),
    timeRecords: z.array(productionRecordSchema).max(1000),
    coverage: z.object({ runsTruncated: z.boolean(), timeTruncated: z.boolean() }).strict(),
  })
  .strict()
export type ProductionActivityReport = z.infer<typeof productionActivityReportSchema>

export function summarizeProduction(runs: ProductionRun[]) {
  const groups = new Map<
    string,
    {
      provider: ProductionRun['provider']
      capability: ProductionRun['capability']
      requests: number
      attempts: number
      succeeded: number
      recovered: number
      reviewed: number
      discarded: number
      rework: number
      undone: number
      durationMs: number | null
      durations: number
      inputTokens: number | null
      outputTokens: number | null
      inputCoverage: number
      outputCoverage: number
    }
  >()
  for (const run of runs) {
    const key = `${run.provider}:${run.capability}`
    const group = groups.get(key) ?? {
      provider: run.provider,
      capability: run.capability,
      requests: 0,
      attempts: 0,
      succeeded: 0,
      recovered: 0,
      reviewed: 0,
      discarded: 0,
      rework: 0,
      undone: 0,
      durationMs: null,
      durations: 0,
      inputTokens: null,
      outputTokens: null,
      inputCoverage: 0,
      outputCoverage: 0,
    }
    group.requests++
    group.attempts += run.attempts
    group.succeeded += Number(run.state === 'succeeded')
    group.recovered += Number(run.recovered)
    group.undone += Number(run.undone)
    const review = run.review?.body
    group.reviewed += Number(review?.kind === 'generation-review')
    group.discarded += Number(
      review?.kind === 'generation-review' && review.verdict === 'discarded',
    )
    group.rework += Number(review?.kind === 'generation-review' && review.verdict === 'rework')
    if (run.measuredDurationMs !== null)
      group.durationMs = (group.durationMs ?? 0) + run.measuredDurationMs
    group.durations += run.measuredDurations
    if (run.inputTokens !== null) group.inputTokens = (group.inputTokens ?? 0) + run.inputTokens
    if (run.outputTokens !== null) group.outputTokens = (group.outputTokens ?? 0) + run.outputTokens
    group.inputCoverage += run.inputCoverage
    group.outputCoverage += run.outputCoverage
    groups.set(key, group)
  }
  return [...groups.values()]
}
