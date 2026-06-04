import { NextResponse } from 'next/server'
import { z } from 'zod'
import { submitQuizAttempt } from '@/server/members'

const BodySchema = z.object({
  answers: z.record(z.string().min(1).max(64), z.array(z.string().min(1).max(64)).max(20)),
})

/** Submete o quiz ao members (score no servidor; gabarito SÓ na resposta). */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ lessonId: string; blockId: string }> },
) {
  const { lessonId, blockId } = await ctx.params
  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Respostas inválidas' } },
      { status: 400 },
    )
  }
  const { status, body } = await submitQuizAttempt(lessonId, blockId, parsed.data.answers)
  return NextResponse.json(body ?? { ok: status === 200 }, { status })
}
