import { forwardUpstream } from '@/server/forward'
import { getTeacherThread } from '@/server/teacher-threads'

type Ctx = { params: Promise<{ id: string }> }

/** Uma conversa (cabeçalho + turnos) p/ a caixa de entrada do professor. */
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params
  const before = new URL(req.url).searchParams.get('before') ?? undefined
  const { status, body } = await getTeacherThread(id, before)
  return forwardUpstream({ status, body })
}
