import { Elysia } from 'elysia'
import type { GetMemberDetailService } from '../../../application/get-member-detail/get-member-detail.service'
import type {
  GrantManualCommand,
  GrantManualEntitlementService,
} from '../../../application/grant-manual-entitlement/grant-manual-entitlement.service'
import type { ListMembersService } from '../../../application/list-members/list-members.service'
import type { ManageEntitlementService } from '../../../application/manage-entitlement/manage-entitlement.service'
import { InvalidEntitlementCommandError } from '../../../domain/entitlement/entitlement.errors'
import type { HubGateway } from '../../../domain/ports/hub-gateway.port'
import { assertInternalCaller, requireAdmin } from '../auth'
import {
  GrantEntitlementBody,
  IdParams,
  ListMembersQuery,
  ManageEntitlementBody,
  MemberDetailQuery,
  parseProfileIds,
  UserIdParams,
} from '../dtos'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export interface AdminRoutesDeps {
  requireAdminEnabled: boolean
  /** Token interno do gateway (defesa em profundidade). Vazio em dev → checagem desligada. */
  internalToken?: string
  listMembers: ListMembersService
  getMemberDetail: GetMemberDetailService
  grantManual: GrantManualEntitlementService
  manageEntitlement: ManageEntitlementService
  /** Notifica o hub (comunidade) na concessão manual → invalida o cache de acesso na hora. */
  hub: HubGateway
}

/**
 * Rotas ADMIN da área de membros (gestão de acesso pelo painel). O RBAC real é do
 * gateway (JWT + role); aqui `requireAdmin` confere os headers `X-Auth-User-*`
 * (defesa em profundidade). Caminho `/members/admin/*` distinto da API do aluno
 * (`/members/courses…`) p/ gating inequívoco. Também exige o `x-internal-token`
 * (header-inject do gateway): os X-Auth-User-* só são confiáveis se a chamada
 * passou pelo gateway — sem o token, qualquer processo que alcance o members
 * direto na rede interna forjaria um admin. Checado no `onTransform` (antes da
 * validação → 401 antes de 422, espelhando o HMAC dos webhooks); o `requireAdmin`
 * por rota roda depois (precisa só dos headers de role, sempre presentes).
 */
export function adminRoutes(deps: AdminRoutesDeps) {
  return new Elysia({ prefix: '/members/admin' })
    .onTransform(({ headers }) =>
      assertInternalCaller(headers['x-internal-token'], deps.internalToken),
    )
    .get(
      '/members',
      async ({ query, headers }) => {
        requireAdmin(headers, deps.requireAdminEnabled)
        return deps.listMembers.execute({
          status: query.status,
          courseRef: query.courseRef,
          limit: clampLimit(query.limit),
          offset: query.offset ?? 0,
        })
      },
      { query: ListMembersQuery },
    )
    .get(
      '/members/:userId',
      async ({ params, query, headers }) => {
        requireAdmin(headers, deps.requireAdminEnabled)
        // `?profileIds=<csv>` → progresso POR PERFIL (estilo Netflix); ausente → só a conta.
        return deps.getMemberDetail.execute(params.userId, parseProfileIds(query.profileIds))
      },
      { params: UserIdParams, query: MemberDetailQuery },
    )
    .post(
      '/entitlements',
      async ({ body, headers, set }) => {
        requireAdmin(headers, deps.requireAdminEnabled)
        const expiresAt = parseDate(body.expiresAt)
        const cmd: GrantManualCommand =
          body.mode === 'offer'
            ? { mode: 'offer', userId: body.userId, offerRef: body.offerRef, expiresAt }
            : body.mode === 'course'
              ? { mode: 'course', userId: body.userId, courseRef: body.courseRef, expiresAt }
              : body.mode === 'all_kids_courses'
                ? { mode: 'all_kids_courses', userId: body.userId, expiresAt }
                : { mode: 'all_courses', userId: body.userId, expiresAt }
        const result = await deps.grantManual.execute(cmd)
        // Comunidade: avisa o hub p/ liberar espaços gated na hora (best-effort).
        await deps.hub.notifyAccessChanged(body.userId, 'grant')
        set.status = 201
        return result
      },
      { body: GrantEntitlementBody },
    )
    .patch(
      '/entitlements/:id',
      async ({ body, params, headers }) => {
        requireAdmin(headers, deps.requireAdminEnabled)
        const result = await deps.manageEntitlement.execute({
          id: params.id,
          action: body.action,
          expiresAt: parseDate(body.expiresAt) ?? undefined,
        })
        // Mudança manual de acesso também invalida o micro-cache do hub
        // (revogar/expirar corta acesso; estender/reativar libera).
        await deps.hub.notifyAccessChanged(result.userId, body.action)
        return result
      },
      { body: ManageEntitlementBody, params: IdParams },
    )
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIMIT
  return Math.min(Math.max(1, limit), MAX_LIMIT)
}

/** ISO-8601 → Date. `null`/ausente → `null`. Inválida → 400 (VALIDATION_ERROR). */
function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime()))
    throw new InvalidEntitlementCommandError('Data inválida (expiresAt)')
  return d
}
