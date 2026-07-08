import { NextResponse } from 'next/server'
import { forwardUpstream } from '@/server/forward'
import { listStudioSubmissions } from '@/server/members'
import { resolveSubmissionIdentities } from '@/server/studio-submissions'

type Ctx = { params: Promise<{ id: string }> }

/**
 * Entregas do bloco de estúdio (acompanhamento do professor). O members devolve
 * `{userId (perfil/conta), accountId, …}`; o BFF hidrata do auth: o RESPONSÁVEL
 * (conta) em LOTE + o nome da CRIANÇA (perfil) quando a entrega veio de um perfil
 * (kids — `userId != accountId`). Sem o projeto inteiro — a abertura usa `/[userId]`.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  const { status, body } = await listStudioSubmissions(id)
  if (status !== 200) return forwardUpstream({ status, body })
  if (!body || !Array.isArray(body.submissions)) {
    // 200 sem corpo NÃO pode vazar como sucesso: o client trataria 200 como ok e
    // leria `submissions` undefined → `.map` quebra a tela. Remapeia p/ 502 (como
    // as rotas irmãs `[userId]` e member-detail).
    return NextResponse.json(
      {
        error: {
          code: 'UPSTREAM_ERROR',
          message: 'Não foi possível carregar as entregas.',
        },
      },
      { status: 502 },
    )
  }

  const submissions = body.submissions
  const identityOf = await resolveSubmissionIdentities(submissions)
  const rows = submissions.map((s) => ({
    userId: s.userId,
    submittedAt: s.submittedAt,
    ...identityOf(s),
    score: s.score,
    checkedAt: s.checkedAt,
    passed: s.passed,
    message: s.message,
  }))
  return NextResponse.json({ submissions: rows }, { status: 200 })
}
