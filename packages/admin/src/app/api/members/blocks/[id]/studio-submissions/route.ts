import { NextResponse } from 'next/server'
import { listStudioSubmissions } from '@/server/members'
import { batchGetUsers, getUserProfiles } from '@/server/users'

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
  if (status !== 200 || !body) {
    // 200 sem corpo NÃO pode vazar como sucesso: o client trataria 200 como ok e
    // leria `submissions` undefined → `.map` quebra a tela. Remapeia p/ 502 (como
    // as rotas irmãs `[userId]` e member-detail).
    return NextResponse.json(body ?? { error: { code: 'UPSTREAM_ERROR' } }, {
      status: status === 200 ? 502 : status,
    })
  }

  const submissions = body.submissions
  // Conta responsável: `accountId` (kids/novo) ou o próprio `userId` (adulto/legado null).
  const accountIdOf = (s: (typeof submissions)[number]) => s.accountId ?? s.userId

  // 1) Identidade das CONTAS responsáveis (nome/e-mail). `POST /auth/admin/users/batch`
  //    aceita no máx. 100 ids → fatiar (senão >100 contas dá 422 e os nomes somem).
  const accountMap = new Map<string, { name: string; email: string }>()
  const accountIds = [...new Set(submissions.map(accountIdOf))]
  for (let i = 0; i < accountIds.length; i += 100) {
    const usersRes = await batchGetUsers(accountIds.slice(i, i + 100))
    if (usersRes.status === 200 && usersRes.body) {
      for (const u of usersRes.body.users) {
        accountMap.set(u.id, { name: `${u.firstName} ${u.lastName}`.trim(), email: u.email })
      }
    }
  }

  // 2) Nome da CRIANÇA (perfil) — só nas entregas de perfil (userId != accountId).
  //    Busca os perfis de cada conta envolvida (em paralelo) → perfilId → nome.
  const profileNameMap = new Map<string, string>()
  const profileAccountIds = [
    ...new Set(
      submissions
        .filter((s) => s.accountId && s.accountId !== s.userId)
        .map((s) => s.accountId as string),
    ),
  ]
  await Promise.all(
    profileAccountIds.map(async (accId) => {
      const res = await getUserProfiles(accId)
      if (res.status === 200 && res.body) {
        for (const p of res.body.profiles) profileNameMap.set(p.id, p.name)
      }
    }),
  )

  const rows = submissions.map((s) => {
    const account = accountMap.get(accountIdOf(s))
    const isProfile = Boolean(s.accountId && s.accountId !== s.userId)
    return {
      userId: s.userId,
      submittedAt: s.submittedAt,
      accountName: account?.name || null,
      accountEmail: account?.email ?? null,
      childName: isProfile ? (profileNameMap.get(s.userId) ?? null) : null,
      score: s.score,
      checkedAt: s.checkedAt,
      passed: s.passed,
    }
  })
  return NextResponse.json({ submissions: rows }, { status: 200 })
}
