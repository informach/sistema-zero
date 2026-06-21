import { NextResponse } from 'next/server'
import { listStudioSubmissions } from '@/server/members'
import { batchGetUsers } from '@/server/users'

type Ctx = { params: Promise<{ id: string }> }

/**
 * Entregas do bloco de estúdio (acompanhamento do professor). O members devolve
 * `{userId, submittedAt}`; o BFF hidrata nome/e-mail do auth em LOTE (como o
 * member-detail). Sem o projeto inteiro — a abertura usa a rota `/[userId]`.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  const { status, body } = await listStudioSubmissions(id)
  if (status !== 200 || !body) {
    // 200 sem corpo NÃO pode vazar como sucesso: o client trataria 200 como ok e
    // leria `submissions` undefined → `.map` quebra a tela. Remapeia p/ 502 (como
    // as rotas irmãs `[userId]` e member-detail).
    return NextResponse.json(body ?? { error: { code: 'UPSTREAM_ERROR' } }, {
      status: status === 200 ? 502 : status,
    })
  }

  const submissions = body.submissions
  const userMap = new Map<string, { firstName: string; lastName: string; email: string }>()
  // `POST /auth/admin/users/batch` aceita no máx. 100 ids, mas a lista de entregas
  // é ILIMITADA → fatiar em lotes de 100 (senão, passando de 100 alunos, o batch
  // dá 422 e TODOS os nomes somem, caindo no userId cru). Dedupe por garantia.
  const ids = [...new Set(submissions.map((s) => s.userId))]
  for (let i = 0; i < ids.length; i += 100) {
    const usersRes = await batchGetUsers(ids.slice(i, i + 100))
    if (usersRes.status === 200 && usersRes.body) {
      for (const u of usersRes.body.users) {
        userMap.set(u.id, { firstName: u.firstName, lastName: u.lastName, email: u.email })
      }
    }
  }

  const rows = submissions.map((s) => {
    const u = userMap.get(s.userId)
    const name = u ? `${u.firstName} ${u.lastName}`.trim() : ''
    return {
      userId: s.userId,
      submittedAt: s.submittedAt,
      name: name || null,
      email: u?.email ?? null,
      score: s.score,
      checkedAt: s.checkedAt,
      passed: s.passed,
    }
  })
  return NextResponse.json({ submissions: rows }, { status: 200 })
}
