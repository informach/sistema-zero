import { z } from 'zod'
import type {
  CreatorMasteryId,
  CreatorMasteryLevel,
  CreatorMasteryView,
} from './creator-curriculum'

export const MasterySubmissionInputSchema = z.strictObject({
  evidenceId: z.uuid(),
  message: z.string().trim().max(1000).optional(),
})
export const MasteryReviewInputSchema = z
  .strictObject({
    criteria: z
      .array(
        z.strictObject({
          criterionId: z.string().min(1).max(80),
          result: z.enum(['approved', 'revise']),
          feedback: z.string().trim().max(1000),
        }),
      )
      .min(1)
      .max(30),
    feedback: z.string().trim().min(1).max(4000),
    credits: z
      .array(
        z.strictObject({
          requirementId: z.string().min(1).max(80),
          reason: z.string().trim().min(10).max(1000),
        }),
      )
      .max(4),
  })
  .superRefine((review, ctx) => {
    if (new Set(review.criteria.map((c) => c.criterionId)).size !== review.criteria.length)
      ctx.addIssue({
        code: 'custom',
        path: ['criteria'],
        message: 'Avalie cada critério uma única vez.',
      })
    if (new Set(review.credits.map((c) => c.requirementId)).size !== review.credits.length)
      ctx.addIssue({ code: 'custom', path: ['credits'], message: 'Crédito repetido.' })
    review.criteria.forEach((criterion, index) => {
      if (criterion.result === 'revise' && !criterion.feedback)
        ctx.addIssue({
          code: 'custom',
          path: ['criteria', index, 'feedback'],
          message: 'Explique o que precisa ser revisado.',
        })
    })
  })
export type MasteryReviewInput = z.infer<typeof MasteryReviewInputSchema>
export interface CreatorMasterySubmission {
  id: string
  evidenceId: string
  evidenceTitle: string
  masteryId: CreatorMasteryId
  level: 1 | 2 | 3
  policyVersion: number
  rubricVersion: number
  submittedAt: string
  message: string | null
  status: 'pending' | 'changes-requested' | 'approved'
  feedback: string | null
  criteria: MasteryReviewInput['criteria']
  credits: MasteryReviewInput['credits']
  reviewedAt: string | null
}
export interface CreatorMasteriesResponse {
  configured: boolean
  policyVersion: number
  hasAccess: boolean
  areas: (Omit<CreatorMasteryView, 'levels'> & {
    levels: (CreatorMasteryView['levels'][number] & {
      submission: CreatorMasterySubmission | null
    })[]
  })[]
}
export interface CreatorMasteryEvidenceResponse {
  evidence: { id: string; title: string; createdAt: string; lessonId: string; kind: string }[]
}
export interface CreatorMasteryReviewDetail {
  submission: CreatorMasterySubmission
  userId: string
  accountId: string
  audience: 'kids' | 'adult'
  areaTitle: string
  definition: CreatorMasteryLevel
  /** Immutable copy captured by the server from owned lesson evidence, never browser supplied. */
  evidence: { payload: unknown; revision: string; createdAt: string }
}
export interface CreatorMasteryReviewQueue {
  submissions: (CreatorMasterySubmission & {
    userId: string
    accountId: string
    audience: 'kids' | 'adult'
    areaTitle: string
  })[]
  limit: number
  offset: number
}
