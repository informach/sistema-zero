import { ForbiddenError, UnauthorizedError } from '@sistemazero/core/http'
import { Elysia } from 'elysia'
import type { BatchGetUsersService } from '../../../application/admin/batch-get-users/batch-get-users.service'
import type { CreateUserService } from '../../../application/admin/create-user/create-user.service'
import type { GetUserService } from '../../../application/admin/get-user/get-user.service'
import type { ListUsersService } from '../../../application/admin/list-users/list-users.service'
import type { ReadAuditLogService } from '../../../application/admin/read-audit-log/read-audit-log.service'
import type { UpdateUserService } from '../../../application/admin/update-user/update-user.service'
import type { CreateImpersonationTokenService } from '../../../application/impersonation/create-impersonation-token.service'
import { type PlatformUrls, resolvePlatformUrl } from '../../../application/platform'
import type { ListProfilesService } from '../../../application/profiles/list-profiles.service'
import { UserNotFoundError } from '../../../domain/user/user.errors'
import type { UserRole } from '../../../domain/user/user.role'
import { type GatewayActor, resolveGatewayActor } from '../auth'
import {
  BatchGetUsersBody,
  CreateUserBody,
  ListAuditQuery,
  ListUsersQuery,
  PlatformQuery,
  UpdateUserBody,
  UserIdParams,
} from '../dtos'
import { requireInternalToken } from '../internal-auth'

export interface AdminRoutesDeps {
  listUsers: ListUsersService
  getUser: GetUserService
  createUser: CreateUserService
  updateUser: UpdateUserService
  batchGetUsers: BatchGetUsersService
  /** Trilha de auditoria de ações administrativas (leitura para o painel). */
  readAuditLog: ReadAuditLogService
  createImpersonationToken: CreateImpersonationTokenService
  /** Lista os perfis (estilo Netflix) de uma conta — suporte vê o progresso por perfil. */
  listProfiles: ListProfilesService
  /**
   * Bases públicas das plataformas (`COMMUNITY_URL`/`KIDS_COMMUNITY_URL`): o painel
   * admin (outra origem) recebe a URL pronta de `/impersonar` — não precisa
   * conhecer os domínios dos apps. `?platform=kids` escolhe a base kids.
   */
  urls: PlatformUrls
  /**
   * `AUTH_INTERNAL_TOKEN` — o gateway o injeta TAMBÉM nas rotas admin (igual ao
   * members/catalog): é o que prova que os `X-Auth-User-*` vieram do gateway.
   * Sem essa checagem, quem alcançasse o serviço direto na rede interna forjaria
   * a identidade de superadmin só com headers.
   */
  internalToken: string | undefined
}

// Papéis aceitos por operação (re-checagem na borda; o gateway já barra antes).
// LEITURA aceita staff; ESCRITA (edição) afina para superadmin/admin (o caso de uso
// ainda aplica os guards hierárquicos sobre isso).
const READ_ROLES: readonly UserRole[] = ['superadmin', 'admin', 'staff']
const WRITE_ROLES: readonly UserRole[] = ['superadmin', 'admin']

/**
 * Rotas admin de usuários (painel `@sistemazero/admin`). O gateway já verificou o
 * JWT + RBAC e injetou `X-Auth-User-*`; aqui RE-CHECAMOS papel/status (defesa em
 * profundidade) e usamos a identidade do ator nos guards de edição.
 */
export function adminRoutes(deps: AdminRoutesDeps) {
  // Ator = token interno do gateway (anti-spoof dos X-Auth-User-*) + papel/status.
  const requireActor = (
    headers: Record<string, string | undefined>,
    allowed: readonly UserRole[],
  ): GatewayActor => {
    requireInternalToken(headers, deps.internalToken)
    const actor = resolveGatewayActor(headers)
    if (!actor) throw new UnauthorizedError('Identidade do gateway ausente')
    if (!allowed.includes(actor.role)) {
      throw new ForbiddenError('Sem permissão para esta operação')
    }
    if (actor.status !== 'active') throw new ForbiddenError('Conta sem acesso (status)')
    return actor
  }

  return (
    new Elysia({ prefix: '/auth/admin' })
      .get(
        '/users',
        async ({ headers, query }) => {
          requireActor(headers, READ_ROLES)
          return deps.listUsers.execute({
            q: query.q,
            role: query.role,
            status: query.status,
            source: query.source,
            createdFrom: parseDate(query.createdFrom),
            createdTo: parseDate(query.createdTo),
            limit: query.limit ?? 20,
            offset: query.offset ?? 0,
          })
        },
        { query: ListUsersQuery },
      )
      .post(
        '/users',
        async ({ headers, body, set }) => {
          const actor = requireActor(headers, WRITE_ROLES)
          const result = await deps.createUser.execute({
            actor: { id: actor.id, role: actor.role },
            email: body.email,
            firstName: body.firstName,
            lastName: body.lastName,
            phone: body.phone,
            role: body.role,
            platform: body.platform,
          })
          set.status = 201
          return result
        },
        { body: CreateUserBody },
      )
      .post(
        '/users/batch',
        async ({ headers, body }) => {
          requireActor(headers, READ_ROLES)
          return deps.batchGetUsers.execute(body.ids)
        },
        { body: BatchGetUsersBody },
      )
      .get(
        '/users/:id',
        async ({ headers, params }) => {
          requireActor(headers, READ_ROLES)
          const user = await deps.getUser.execute(params.id)
          if (!user) throw new UserNotFoundError()
          return { user }
        },
        { params: UserIdParams },
      )
      .patch(
        '/users/:id',
        async ({ headers, params, body }) => {
          const actor = requireActor(headers, WRITE_ROLES)
          const user = await deps.updateUser.execute({
            targetId: params.id,
            actor: { id: actor.id, role: actor.role },
            changes: {
              role: body.role,
              status: body.status,
              firstName: body.firstName,
              lastName: body.lastName,
              phone: body.phone,
            },
            expectedVersion: body.version,
          })
          return { user }
        },
        { body: UpdateUserBody, params: UserIdParams },
      )
      // "Entrar como": emite o token de HANDOFF de impersonação (single-use, ~60s).
      // O serviço re-checa a matriz (admin só customer/staff; superadmin qualquer;
      // nunca a si mesmo) — o RBAC do gateway é só a 1ª camada. A URL devolvida
      // aponta p/ a rota `/impersonar` da community, que faz o exchange.
      .post(
        '/users/:id/impersonate',
        async ({ headers, params, query, set }) => {
          const actor = requireActor(headers, WRITE_ROLES)
          // `?platform=kids` → URL do app kids (a env ausente → 400, ANTES de
          // emitir o token — sem handoff órfão).
          const communityUrl = resolvePlatformUrl(deps.urls, query.platform)
          const result = await deps.createImpersonationToken.execute({
            actorId: actor.id,
            actorRole: actor.role,
            targetUserId: params.id,
          })
          set.status = 201
          return {
            token: result.token,
            expiresAt: result.expiresAt.toISOString(),
            communityUrl,
          }
        },
        { params: UserIdParams, query: PlatformQuery },
      )
      // Perfis (estilo Netflix) de uma conta — o painel hidrata o progresso por perfil
      // do members. LEITURA (staff+). 4 segmentos, literal `profiles` ≠ `impersonate`.
      .get(
        '/users/:id/profiles',
        async ({ headers, params }) => {
          requireActor(headers, READ_ROLES)
          return deps.listProfiles.execute(params.id)
        },
        { params: UserIdParams },
      )
      // Trilha de auditoria (quem fez o quê). SENSÍVEL → admin+ (não staff): expõe as
      // ações de OUTROS operadores. Path `/audit` (2 segmentos) ≠ `/users*`.
      .get(
        '/audit',
        async ({ headers, query }) => {
          requireActor(headers, WRITE_ROLES)
          return deps.readAuditLog.execute({
            actorId: query.actorId,
            action: query.action,
            targetId: query.targetId,
            startDate: parseDate(query.from),
            endDate: parseDate(query.to),
            limit: query.limit ?? 50,
            offset: query.offset ?? 0,
          })
        },
        { query: ListAuditQuery },
      )
  )
}

/** ISO-8601 → Date; ausente/ inválida → undefined (filtro ignorado). */
function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}
