import { forwardUpstream } from '@/server/forward'
import { getTeacherThread } from '@/server/teacher-threads'

type Ctx = { params: Promise<{ id: string }> }

/** Uma conversa (cabeçalho + turnos) p/ a caixa de entrada do professor. */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  const { status, body } = await getTeacherThread(id)
  return forwardUpstream({ status, body })
}
