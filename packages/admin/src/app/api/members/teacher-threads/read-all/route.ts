import { NextResponse } from 'next/server'
import { z } from 'zod'
import { forwardUpstream } from '@/server/forward'
import { resolveStudentQuery } from '@/server/studio-submissions'
import { markAllTeacherThreadsRead } from '@/server/teacher-threads'

const scopeSchema = z
  .object({
    workflowStatus: z.enum(['waiting_teacher', 'waiting_student', 'resolved']).optional(),
    audience: z.enum(['kids', 'adult']).optional(),
    context: z
      .enum(['general', 'studio_submission', 'mural_publication', 'lesson_section'])
      .optional(),
    courseId: z.uuid().optional(),
    userId: z.uuid().optional(),
    q: z.string().trim().max(200).optional(),
  })
  .strict()

/** "Marcar todas como lidas" (escopo opcional espelha os filtros da caixa). */
export async function POST(req: Request) {
  const parsed = scopeSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Filtros inválidos.' } },
      { status: 400 },
    )
  const { userId, q, ...scope } = parsed.data
  const { userIds: queried } = userId ? { userIds: [userId] } : await resolveStudentQuery(q)
  if (queried?.length === 0) return NextResponse.json({ updated: 0 })
  const { status, body } = await markAllTeacherThreadsRead({
    ...scope,
    userIds: queried ?? undefined,
  })
  return forwardUpstream({ status, body })
}
