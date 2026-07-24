import 'server-only'
import { type GatewayResponse, gatewayFetch } from '@/server/gateway'
import { batchGetUsers, getUserProfiles, listUsers } from '@/server/users'

/** Linha crua da fila global (members) — identidade hidratada aqui no BFF. */
export interface RawGlobalSubmission extends RawSubmissionIdentity {
  blockId: string
  lessonId: string
  lessonTitle: string
  moduleTitle: string
  courseId: string
  courseTitle: string
  audience: 'adult' | 'kids'
  submittedAt: string
  score: number | null
  checkedAt: string | null
  passed: boolean
  message: string | null
  answered: boolean
}

/** Fila GLOBAL de entregas (todos os cursos): `GET /members/admin/studio-submissions`. */
export function listAllStudioSubmissions(p: {
  courseId?: string
  audience?: string
  status?: string
  /** Filtro por aluno (userId do perfil OU accountId do responsável — csv no members). */
  userIds?: string[]
  limit?: number
  offset?: number
}): Promise<GatewayResponse<{ items: RawGlobalSubmission[]; total: number }>> {
  return gatewayFetch('/members/admin/studio-submissions', {
    query: {
      courseId: p.courseId,
      audience: p.audience,
      status: p.status,
      userIds: p.userIds?.length ? p.userIds.join(',') : undefined,
      limit: p.limit,
      offset: p.offset,
    },
  })
}

/**
 * Busca livre → userIds (degrau 2): resolve `q` (nome/e-mail do RESPONSÁVEL) no
 * auth e devolve os ids p/ o filtro do members. `null` = sem busca (não filtra);
 * `[]` = busca sem resultado (a fila devolve vazio SEM ir ao members). >20 contas →
 * usa as 20 primeiras (a UI avisa "refine a busca" via `hint`).
 */
export async function resolveStudentQuery(
  q: string | undefined,
): Promise<{ userIds: string[] | null; hint?: 'refine' }> {
  const query = q?.trim()
  if (!query) return { userIds: null }
  const res = await listUsers({ q: query, limit: 20 })
  if (res.status !== 200 || !res.body) return { userIds: [] }
  const ids = res.body.items.map((u) => u.id)
  return { userIds: ids, hint: res.body.total > 20 ? 'refine' : undefined }
}

/** Campos mínimos de uma entrega p/ resolver a identidade (quem entregou/responsável). */
export interface RawSubmissionIdentity {
  /** Quem entregou (perfil da criança no kids; a conta no adulto). */
  userId: string
  /** Conta responsável (kids: o pai; adulto/legado: `null` → a conta É o userId). */
  accountId: string | null
}

/** Identidade hidratada do auth p/ exibir na lista de entregas. */
export interface HydratedIdentity {
  /** Nome do RESPONSÁVEL (conta). */
  accountName: string | null
  /** E-mail do responsável (conta) — ajuda a identificar. */
  accountEmail: string | null
  /** Nome da CRIANÇA (perfil) quando a entrega veio de um perfil; `null` no adulto. */
  childName: string | null
}

/**
 * Hidrata a identidade das entregas do Estúdio (RESPONSÁVEL + CRIANÇA) a partir do
 * auth — compartilhado pela lista POR BLOCO e pela aba "Entregas" POR CURSO. O
 * members devolve só ids (`userId` = perfil/conta, `accountId` = conta responsável);
 * aqui buscamos os nomes: a CONTA em LOTE (`batchGetUsers`, cap 100/ida) e o nome do
 * PERFIL da criança (`getUserProfiles`) só quando a entrega veio de um perfil
 * (kids — `userId != accountId`). Retorna um resolvedor por entrega (as entregas do
 * mesmo aluno reusam a identidade já buscada — sem N+1).
 */
export async function resolveSubmissionIdentities(
  submissions: readonly RawSubmissionIdentity[],
): Promise<(s: RawSubmissionIdentity) => HydratedIdentity> {
  // Conta responsável: `accountId` (kids/novo) ou o próprio `userId` (adulto/legado null).
  const accountIdOf = (s: RawSubmissionIdentity) => s.accountId ?? s.userId

  // 1) Identidade das CONTAS (nome/e-mail). `POST /auth/admin/users/batch` aceita no
  //    máx. 100 ids → fatiar (senão >100 contas dá 422 e os nomes somem).
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

  return (s) => {
    const account = accountMap.get(accountIdOf(s))
    const isProfile = Boolean(s.accountId && s.accountId !== s.userId)
    return {
      accountName: account?.name || null,
      accountEmail: account?.email ?? null,
      childName: isProfile ? (profileNameMap.get(s.userId) ?? null) : null,
    }
  }
}
