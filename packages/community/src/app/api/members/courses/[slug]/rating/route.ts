import { NextResponse } from 'next/server'
import { z } from 'zod'
import { saveCourseRating } from '@/server/members'

const FeedbackAnswer = z.enum(['yes', 'no', 'unsure'])

// Espelha o TypeBox do members (CourseRatingBody): nota nos 9 valores válidos,
// comment ≤5000, feedback STRICT com as 6 chaves fixas.
const BodySchema = z.object({
  rating: z.union([
    z.literal(1),
    z.literal(1.5),
    z.literal(2),
    z.literal(2.5),
    z.literal(3),
    z.literal(3.5),
    z.literal(4),
    z.literal(4.5),
    z.literal(5),
  ]),
  comment: z.string().max(5000).nullable().optional(),
  feedbackAnswers: z
    .object({
      importantInfo: FeedbackAnswer.optional(),
      clearExplanations: FeedbackAnswer.optional(),
      engagingInstructor: FeedbackAnswer.optional(),
      enoughPractice: FeedbackAnswer.optional(),
      meetsExpectations: FeedbackAnswer.optional(),
      knowledgeable: FeedbackAnswer.optional(),
    })
    .strict()
    .nullable()
    .optional(),
})

/**
 * Classificação do curso (estilo Udemy): cada passo do fluxo de modais persiste
 * o estado ACUMULADO via este PUT (fechar no meio não perde o que já foi salvo).
 */
export async function PUT(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  let parsed: z.infer<typeof BodySchema>
  try {
    parsed = BodySchema.parse(await req.json())
  } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Corpo inválido' } },
      { status: 400 },
    )
  }
  const { status, body } = await saveCourseRating(slug, parsed)
  return NextResponse.json(body ?? { ok: status === 200 }, { status })
}
