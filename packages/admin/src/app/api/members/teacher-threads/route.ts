import { forwardUpstream } from '@/server/forward'
import { postTeacherThread } from '@/server/members'

/**
 * Professor abre/continua uma conversa com o aluno por CONTEXTO (Entrega/recado) →
 * `POST /members/admin/teacher-threads`. Devolve a conversa atualizada (com os turnos).
 */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const { status, body } = await postTeacherThread(json)
  return forwardUpstream({ status, body })
}
