import { createHash } from 'node:crypto'
import {
  KNOWLEDGE_AUDIENCES,
  KNOWLEDGE_PRODUCTS,
  TICKET_CATEGORIES,
} from '@sistemazero/helpdesk-contracts'
import { z } from 'zod'

export const EvaluationDatasetSchema = z
  .object({
    version: z.string().min(1).max(30),
    editorialStatus: z.string(),
    cases: z
      .array(
        z.object({
          id: z.string().min(1),
          category: z.enum(TICKET_CATEGORIES),
          audience: z.enum(KNOWLEDGE_AUDIENCES),
          product: z.enum(KNOWLEDGE_PRODUCTS),
          question: z.string().min(1).max(2000),
          thread: z.string().max(24000),
          expectedDecision: z.enum(['answer', 'handoff']),
          acceptableSourceKeys: z.array(z.string()),
          expectedReason: z.string().optional(),
          expectedBehavior: z.string().min(1),
        }),
      )
      .min(100),
  })
  .superRefine((data, ctx) => {
    if (new Set(data.cases.map((c) => c.id)).size !== data.cases.length)
      ctx.addIssue({ code: 'custom', message: 'IDs de avaliação duplicados' })
  })
export type EvaluationCase = z.infer<typeof EvaluationDatasetSchema>['cases'][number]
export const EvaluationOutputSchema = z.object({
  evaluatedAt: z.iso.datetime(),
  datasetHash: z.string(),
  bindingsHash: z.string(),
  context: z.object({
    model: z.string(),
    promptVersion: z.string(),
    indexVersion: z.number(),
    policyHash: z.string(),
  }),
  results: z.array(
    z.object({
      id: z.string(),
      decision: z.enum(['answer', 'handoff']),
      reply: z.string().nullable(),
      reason: z.string().nullable(),
      retrievedArticleIds: z.array(z.string()),
      acceptableArticleIds: z.array(z.string()),
      durationMs: z.number().nonnegative(),
      knownCostUsd: z.number().nonnegative(),
      unknownAttempts: z.number().int().nonnegative(),
    }),
  ),
})
export const EvaluationReviewsSchema = z.object({
  outputHash: z.string(),
  reviewedBy: z.string().min(1),
  deterministicPassed: z.boolean(),
  cases: z.array(
    z.object({
      id: z.string(),
      correct: z.boolean(),
      criticalError: z.boolean(),
      comment: z.string().min(1),
    }),
  ),
})
export const artifactHash = (text: string) => createHash('sha256').update(text).digest('hex')

export function scoreEvaluation(datasetText: string, outputText: string, reviewsText: string) {
  const dataset = EvaluationDatasetSchema.parse(JSON.parse(datasetText))
  const output = EvaluationOutputSchema.parse(JSON.parse(outputText))
  const reviews = EvaluationReviewsSchema.parse(JSON.parse(reviewsText))
  if (
    output.datasetHash !== artifactHash(datasetText) ||
    reviews.outputHash !== artifactHash(outputText)
  )
    throw new Error('A revisão não corresponde aos artefatos congelados')
  const ids = new Set(dataset.cases.map((c) => c.id))
  for (const rows of [output.results, reviews.cases])
    if (
      rows.length !== ids.size ||
      new Set(rows.map((r) => r.id)).size !== ids.size ||
      rows.some((r) => !ids.has(r.id))
    )
      throw new Error('Todos os casos devem ter exatamente um resultado e uma revisão')
  const results = new Map(output.results.map((r) => [r.id, r])),
    reviewed = new Map(reviews.cases.map((r) => [r.id, r]))
  const answerable = dataset.cases.filter((c) => c.expectedDecision === 'answer')
  if (answerable.some((c) => !results.get(c.id)!.acceptableArticleIds.length))
    throw new Error('Caso respondível sem fonte editorial vinculada')
  const correct = dataset.cases.filter(
    (c) => reviewed.get(c.id)!.correct && results.get(c.id)!.decision === c.expectedDecision,
  )
  const retrieved = answerable.filter((c) => {
    const r = results.get(c.id)!
    return r.retrievedArticleIds.some((id) => r.acceptableArticleIds.includes(id))
  })
  const durations = output.results.map((r) => r.durationMs).sort((a, b) => a - b)
  return {
    report: {
      evaluatedAt: output.evaluatedAt,
      ...output.context,
      datasetVersion: `${dataset.version}:${output.datasetHash}`,
      cases: ids.size,
      reviewedResponses: reviews.cases.length,
      correctResponses: correct.length,
      answerableCases: answerable.length,
      retrievedCases: retrieved.length,
      criticalErrors: reviews.cases.filter((c) => c.criticalError).length,
      deterministicPassed: reviews.deterministicPassed,
      p95Ms: durations[Math.ceil(durations.length * 0.95) - 1] ?? 0,
    },
    metrics: {
      reviewedBy: reviews.reviewedBy,
      editorialStatus: dataset.editorialStatus,
      recallAt6: retrieved.length / Math.max(1, answerable.length),
      precisionAt6:
        answerable.reduce((sum, c) => {
          const r = results.get(c.id)!
          return (
            sum +
            r.retrievedArticleIds.filter((id) => r.acceptableArticleIds.includes(id)).length /
              Math.max(1, r.retrievedArticleIds.length)
          )
        }, 0) / Math.max(1, answerable.length),
      unnecessaryHandoffs: answerable.filter((c) => results.get(c.id)!.decision === 'handoff')
        .length,
      knownCostUsd: output.results.reduce((sum, r) => sum + r.knownCostUsd, 0),
      unknownAttempts: output.results.reduce((sum, r) => sum + r.unknownAttempts, 0),
    },
  }
}
