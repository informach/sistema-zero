import { z } from 'zod'
import { httpUrlSchema, timestampSchema } from './common'
export const researchResultSchema = z
  .object({
    title: z.string().min(1).max(300),
    summary: z.string().min(1).max(20000),
    findings: z
      .array(
        z
          .object({
            claim: z.string().min(1).max(4000),
            classification: z.enum(['fact', 'interpretation', 'hypothesis']),
            sourceUrls: z.array(httpUrlSchema).min(1).max(5),
            quote: z.string().max(600).nullable(),
          })
          .strict(),
      )
      .min(1)
      .max(20),
    sources: z
      .array(z.object({ title: z.string().min(1).max(500), url: httpUrlSchema }).strict())
      .min(1)
      .max(30),
    hypothesis: z.string().max(6000),
    proposedDirection: z.string().max(6000),
  })
  .strict()
  .superRefine((value, ctx) => {
    const urls = new Set(value.sources.map((source) => source.url))
    if (value.findings.some((finding) => finding.sourceUrls.some((url) => !urls.has(url))))
      ctx.addIssue({
        code: 'custom',
        message: 'Toda afirmação precisa indicar uma fonte presente na pesquisa',
      })
  })
export type ResearchResult = z.infer<typeof researchResultSchema>
export const researchEvidenceSchema = z
  .object({
    result: researchResultSchema,
    observedUrls: z.array(httpUrlSchema).max(200),
    searchedAt: timestampSchema,
    toolCalls: z.number().int().min(1).max(12),
  })
  .strict()
export type ResearchEvidence = z.infer<typeof researchEvidenceSchema>
