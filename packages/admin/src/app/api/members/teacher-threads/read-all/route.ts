import { forwardUpstream } from '@/server/forward'
import { markAllTeacherThreadsRead } from '@/server/teacher-threads'

/** "Marcar todas como lidas" (escopo opcional espelha os filtros da caixa). */
export async function POST(req: Request) {
  const raw = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const pick = (key: string) => (typeof raw[key] === 'string' ? (raw[key] as string) : undefined)
  const { status, body } = await markAllTeacherThreadsRead({
    audience: pick('audience'),
    context: pick('context'),
    courseId: pick('courseId'),
  })
  return forwardUpstream({ status, body })
}
