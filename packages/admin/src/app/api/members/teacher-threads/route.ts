import { NextResponse } from 'next/server'
import { parseLimit, parseOffset } from '@/lib/list-params'
import { forwardUpstream } from '@/server/forward'
import { postTeacherThread } from '@/server/members'
import { resolveStudentQuery, resolveSubmissionIdentities } from '@/server/studio-submissions'
import { listTeacherThreads } from '@/server/teacher-threads'

/**
 * Caixa de entrada do professor (página Recados): lista as conversas com filtros e
 * HIDRATA a identidade do auth (RESPONSÁVEL + CRIANÇA) — o members só devolve ids.
 * Reusa o mesmo helper das listas de entregas (`resolveSubmissionIdentities`:
 * summaries têm o mesmo par `userId`/`accountId`). Busca por aluno: `userId` (id
 * exato, link da ficha) OU `q` (nome/e-mail do RESPONSÁVEL via auth → userIds).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const exactUserId = searchParams.get('userId') ?? undefined
  const { userIds: queried, hint } = await resolveStudentQuery(searchParams.get('q') ?? undefined)
  if (queried !== null && queried.length === 0 && !exactUserId) {
    return NextResponse.json({ threads: [], hint }, { status: 200 })
  }
  const userIds = [...(exactUserId ? [exactUserId] : []), ...(queried ?? [])]
  const { status, body } = await listTeacherThreads({
    audience: searchParams.get('audience') ?? undefined,
    context: searchParams.get('context') ?? undefined,
    courseId: searchParams.get('courseId') ?? undefined,
    unread: searchParams.get('unread') === 'true',
    userIds: userIds.length > 0 ? userIds : undefined,
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
  return NextResponse.json({ threads, hint }, { status: 200 })
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
