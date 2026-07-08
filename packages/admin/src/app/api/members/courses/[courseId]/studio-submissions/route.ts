import { NextResponse } from 'next/server'
import { forwardUpstream } from '@/server/forward'
import { listCourseStudioSubmissions } from '@/server/members'
import { resolveSubmissionIdentities } from '@/server/studio-submissions'

type Ctx = { params: Promise<{ courseId: string }> }

/**
 * Entregas do Estúdio de TODAS as aulas de um curso (aba "Entregas" por curso). O
 * members centraliza a consulta (join aula/módulo); o BFF hidrata a identidade do
 * auth (RESPONSÁVEL + CRIANÇA) reusando o mesmo helper da lista por bloco. Cada
 * linha carrega `blockId` + `lessonId` — o viewer abre a entrega pelo endpoint
 * por-bloco existente.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const { courseId } = await params
  const { status, body } = await listCourseStudioSubmissions(courseId)
  if (status !== 200) return forwardUpstream({ status, body })
  if (!body || !Array.isArray(body.submissions)) {
    return NextResponse.json(
      {
        error: {
          code: 'UPSTREAM_ERROR',
          message: 'Não foi possível carregar as entregas do curso.',
        },
      },
      { status: 502 },
    )
  }

  const submissions = body.submissions
  const identityOf = await resolveSubmissionIdentities(submissions)
  const rows = submissions.map((s) => ({
    userId: s.userId,
    blockId: s.blockId,
    lessonId: s.lessonId,
    lessonTitle: s.lessonTitle,
    moduleTitle: s.moduleTitle,
    submittedAt: s.submittedAt,
    ...identityOf(s),
    score: s.score,
    checkedAt: s.checkedAt,
    passed: s.passed,
    message: s.message,
  }))
  return NextResponse.json({ submissions: rows }, { status: 200 })
}
