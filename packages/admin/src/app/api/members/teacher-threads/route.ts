import { NextResponse } from 'next/server'
import { parseLimit, parseOffset } from '@/lib/list-params'
import { forwardUpstream } from '@/server/forward'
import { postTeacherThread } from '@/server/members'
import { resolveSubmissionIdentities } from '@/server/studio-submissions'
import { listTeacherThreads } from '@/server/teacher-threads'

/**
 * Caixa de entrada do professor (página Recados): lista as conversas com filtros e
 * HIDRATA a identidade do auth (RESPONSÁVEL + CRIANÇA) — o members só devolve ids.
 * Reusa o mesmo helper das listas de entregas (`resolveSubmissionIdentities`:
 * summaries têm o mesmo par `userId`/`accountId`).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const { status, body } = await listTeacherThreads({
    audience: searchParams.get('audience') ?? undefined,
    context: searchParams.get('context') ?? undefined,
    courseId: searchParams.get('courseId') ?? undefined,
    unread: searchParams.get('unread') === 'true',
    limit: parseLimit(searchParams.get('limit')),
    offset: parseOffset(searchParams.get('offset')),
  })
  if (status !== 200) return forwardUpstream({ status, body })
  if (!body || !Array.isArray(body.threads)) {
    return NextResponse.json(
      { error: { code: 'UPSTREAM_ERROR', message: 'Não foi possível carregar os recados.' } },
      { status: 502 },
    )
  }
  const identityOf = await resolveSubmissionIdentities(body.threads)
  const threads = body.threads.map((t) => ({ ...t, ...identityOf(t) }))
  return NextResponse.json({ threads }, { status: 200 })
}

/**
 * Professor abre/continua uma conversa com o aluno por CONTEXTO (Entrega/recado) →
 * `POST /members/admin/teacher-threads`. Devolve a conversa atualizada (com os turnos).
 */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const { status, body } = await postTeacherThread(json)
  return forwardUpstream({ status, body })
}
