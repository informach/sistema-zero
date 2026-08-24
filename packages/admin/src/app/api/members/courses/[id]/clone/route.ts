import { forwardUpstream } from '@/server/forward'
import { cloneCourse } from '@/server/members'

/** Clona o curso para a OUTRA plataforma (fork). Pass-through do members. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  return forwardUpstream(await cloneCourse(id, body))
}
