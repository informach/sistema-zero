import { NextResponse } from 'next/server'
import { parseLimit, parseOffset } from '@/lib/list-params'
import { forwardUpstream } from '@/server/forward'
import { listAllStudioSubmissions, resolveSubmissionIdentities } from '@/server/studio-submissions'

/**
 * Fila GLOBAL de entregas do Estúdio (página "Entregas" da Sala do Professor):
 * todos os cursos, pendentes primeiro (ordenação do members), filtros +
 * paginação. Hidrata a identidade (RESPONSÁVEL + CRIANÇA) do auth com o mesmo
 * helper das listas por bloco/curso.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const { status, body } = await listAllStudioSubmissions({
    courseId: searchParams.get('courseId') ?? undefined,
    audience: searchParams.get('audience') ?? undefined,
    status: searchParams.get('status') ?? undefined,
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
  return NextResponse.json({ items, total: body.total }, { status: 200 })
}
