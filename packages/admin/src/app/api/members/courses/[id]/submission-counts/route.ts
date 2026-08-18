import { forwardUpstream } from '@/server/forward'
import { getCourseSubmissionCounts } from '@/server/members'

// ⚠️ Segmento é `[id]` (não `[courseId]`) — regra dos irmãos de
// `/api/members/courses/` (o Next proíbe nomes de slug diferentes no mesmo nível).
type Ctx = { params: Promise<{ id: string }> }

/**
 * Contagem de entregas do curso por bloco/aula — alimenta o aviso destrutivo dos
 * confirms de exclusão (bloco/aula/módulo/curso). Consumida best-effort: se
 * falhar, o confirm abre sem a contagem (a exclusão nunca bloqueia por isto).
 */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  const { status, body } = await getCourseSubmissionCounts(id)
  return forwardUpstream({ status, body })
}
