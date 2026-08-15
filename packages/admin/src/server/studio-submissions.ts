import 'server-only'
import { type GatewayResponse, gatewayFetch } from '@/server/gateway'
import { type HydratedIdentity, type IdentityRef, resolveIdentities } from '@/server/identities'
import { listUsers } from '@/server/users'

export type RawSubmissionIdentity = IdentityRef
export type { HydratedIdentity }
export const resolveSubmissionIdentities = resolveIdentities

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
