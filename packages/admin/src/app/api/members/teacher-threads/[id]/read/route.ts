import { forwardUpstream } from '@/server/forward'
import { markTeacherThreadRead } from '@/server/teacher-threads'

type Ctx = { params: Promise<{ id: string }> }

/** Marca a conversa como lida pelo professor (watermark) — ao abrir na caixa. */
export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params
  const { status, body } = await markTeacherThreadRead(id)
  return forwardUpstream({ status, body })
}
