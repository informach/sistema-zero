import { NextResponse } from 'next/server'
import { toCourseSubmissionRow } from '@/lib/course-submission-rows'
import { forwardUpstream } from '@/server/forward'
import { listCourseStudioSubmissions } from '@/server/members'
import { resolveSubmissionIdentities } from '@/server/studio-submissions'

// ⚠️ Segmento é `[id]` (não `[courseId]`) p/ casar com os IRMÃOS de
// `/api/members/courses/` (`[id]/route.ts`, `[id]/modules`…): o Next PROÍBE nomes
// de slug diferentes no MESMO nível dinâmico — o build passa, mas o server CRASHA
// no boot ("cannot use different slug names for the same dynamic path"). A URL não
// muda (o valor continua sendo o id do curso).
type Ctx = { params: Promise<{ id: string }> }

/**
 * Entregas do Estúdio de TODAS as aulas de um curso (aba "Entregas" por curso). O
 * members centraliza a consulta (join aula/módulo); o BFF hidrata a identidade do
 * auth (RESPONSÁVEL + CRIANÇA) reusando o mesmo helper da lista por bloco. Cada
 * linha carrega `blockId` + `lessonId` — o viewer abre a entrega pelo endpoint
 * por-bloco existente.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  const { status, body } = await listCourseStudioSubmissions(id)
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
  const rows = submissions.map((s) => toCourseSubmissionRow(s, identityOf(s)))
  return NextResponse.json({ submissions: rows }, { status: 200 })
}
