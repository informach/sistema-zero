import { NextResponse } from 'next/server'
import { parseLimit, parseOffset } from '@/lib/list-params'
import { forwardUpstream } from '@/server/forward'
import {
  listAllStudioSubmissions,
  resolveStudentQuery,
  resolveSubmissionIdentities,
} from '@/server/studio-submissions'

/**
 * Fila GLOBAL de entregas do Estúdio (página "Entregas" da Sala do Professor):
 * todos os cursos, pendentes primeiro (ordenação do members), filtros +
 * paginação. Hidrata a identidade (RESPONSÁVEL + CRIANÇA) do auth com o mesmo
 * helper das listas por bloco/curso. Busca por aluno: `userId` (id exato, link
 * da ficha) OU `q` (nome/e-mail do RESPONSÁVEL, resolvido no auth → userIds).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const exactUserId = searchParams.get('userId') ?? undefined
  const { userIds: queried, hint } = await resolveStudentQuery(searchParams.get('q') ?? undefined)
  // Busca sem resultado no auth → fila vazia, sem ir ao members.
  if (queried !== null && queried.length === 0 && !exactUserId) {
    return NextResponse.json({ items: [], total: 0, hint }, { status: 200 })
  }
  const userIds = [...(exactUserId ? [exactUserId] : []), ...(queried ?? [])]
  const { status, body } = await listAllStudioSubmissions({
    courseId: searchParams.get('courseId') ?? undefined,
    audience: searchParams.get('audience') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    userIds: userIds.length > 0 ? userIds : undefined,
    limit: parseLimit(searchParams.get('limit')),
    offset: parseOffset(searchParams.get('offset')),
  })
  if (status !== 200) return forwardUpstream({ status, body })
  if (!body || !Array.isArray(body.items)) {
    return NextResponse.json(
      { error: { code: 'UPSTREAM_ERROR', message: 'Não foi possível carregar as entregas.' } },
      { status: 502 },
    )
  }
  const identityOf = await resolveSubmissionIdentities(body.items)
  const items = body.items.map((s) => ({ ...s, ...identityOf(s) }))
  return NextResponse.json({ items, total: body.total, hint }, { status: 200 })
}
