import { forwardUpstream } from '@/server/forward'
import { replyTeacherThread } from '@/server/teacher-threads'

type Ctx = { params: Promise<{ id: string }> }

/** Professor responde a uma conversa existente (devolve a conversa atualizada). */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params
  const json = await req.json().catch(() => null)
  const { status, body } = await replyTeacherThread(id, json)
  return forwardUpstream({ status, body })
}
