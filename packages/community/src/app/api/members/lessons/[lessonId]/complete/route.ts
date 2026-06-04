import { NextResponse } from 'next/server'
import { markLessonComplete } from '@/server/members'

/** Única mutação do player: marca a aula como concluída (idempotente no members). */
export async function POST(_req: Request, ctx: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await ctx.params
  const { status, body } = await markLessonComplete(lessonId)
  return NextResponse.json(body ?? { ok: status === 200 }, { status })
}
