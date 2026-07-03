import { Elysia } from 'elysia'
import type { EnsureBuyerService } from '../../../application/ensure-buyer/ensure-buyer.service'
import type { WriteAuditLogService } from '../../../application/internal/write-audit-log/write-audit-log.service'
import type { CreatePasswordTokenService } from '../../../application/password-reset/create-password-token.service'
import type { ProfileRepository } from '../../../domain/ports/profile-repository.port'
import type { UserRepository } from '../../../domain/ports/user-repository.port'
import { UserNotFoundError } from '../../../domain/user/user.errors'
import { BatchGetUsersBody, CreatePasswordTokenBody, EnsureBuyerBody, WriteAuditBody } from '../dtos'
import { requireInternalToken } from '../internal-auth'

export interface InternalRoutesDeps {
  createPasswordToken: CreatePasswordTokenService
  ensureBuyer: EnsureBuyerService
  /** Registra ações administrativas na trilha de auditoria (emitido pelo gateway). */
  writeAuditLog: WriteAuditLogService
  /** Identidade mínima do responsável + nomes das crianças (report dos pais, S2S members). */
  users: UserRepository
  profiles: ProfileRepository
  /** `AUTH_INTERNAL_TOKEN` — injetado pelo gateway nas rotas internas (defesa em profundidade). */
  internalToken: string | undefined
}

/**
 * Rotas internas S2S (atrás do gateway, consumer HMAC + `x-internal-token`).
 * `POST /auth/internal/password-tokens`: emite o token de DEFINIÇÃO de senha do
 * 1º acesso pós-compra (o funil monta o link e envia o e-mail de boas-vindas).
 * `POST /auth/internal/ensure-buyer`: garante o usuário do comprador (novo OU
 * recorrente) e devolve o `userId` — o que destrava a concessão de acesso ao
 * comprador recorrente. Tudo só trafega S2S — nunca chega ao browser por aqui.
 */
export function internalRoutes(deps: InternalRoutesDeps) {
  return (
    new Elysia({ prefix: '/auth/internal' })
      .post(
        '/password-tokens',
        async ({ body, headers, set }) => {
          requireInternalToken(headers, deps.internalToken)
          const issued = await deps.createPasswordToken.execute({ email: body.email })
          // Usuário inexistente/inativo → 404 (S2S; sem risco de enumeração pelo browser).
          if (!issued) throw new UserNotFoundError()
          set.status = 201
          return { token: issued.token, expiresAt: issued.expiresAt.toISOString() }
        },
        { body: CreatePasswordTokenBody },
      )
      .post(
        '/ensure-buyer',
        async ({ body, headers, set }) => {
          requireInternalToken(headers, deps.internalToken)
          const result = await deps.ensureBuyer.execute({
            email: body.email,
            password: body.password,
            firstName: body.firstName,
            lastName: body.lastName,
            phone: body.phone,
            source: body.source,
          })
          // 201 quando criou; 200 quando reaproveitou o usuário existente (recorrente).
          set.status = result.created ? 201 : 200
          return result
        },
        { body: EnsureBuyerBody },
      )
      // Trilha de auditoria: o GATEWAY emite (best-effort) após uma rota admin mutante
      // responder com sucesso. Append-only; S2S por `x-internal-token`.
      .post(
        '/audit',
        async ({ body, headers, set }) => {
          requireInternalToken(headers, deps.internalToken)
          await deps.writeAuditLog.execute({
            actorId: body.actorId,
            actorEmail: body.actorEmail,
            actorRole: body.actorRole,
            impersonatorId: body.impersonatorId,
            action: body.action,
            method: body.method,
            path: body.path,
            targetId: body.targetId,
            status: body.status,
            ip: body.ip,
            userAgent: body.userAgent,
            requestId: body.requestId,
          })
          set.status = 201
          return { recorded: true }
        },
        { body: WriteAuditBody },
      )
      // Report dos pais (S2S do MEMBERS, direto na rede interna — só o token):
      // identidade MÍNIMA do responsável por lote de contas. E-mail + primeiro
      // nome, NADA além (sem hash/role/telefone). Ids ausentes são omitidos.
      .post(
        '/users/emails',
        async ({ body, headers }) => {
          requireInternalToken(headers, deps.internalToken)
          const found = await deps.users.listByIds([...new Set(body.ids)])
          return {
            users: found.map((u) => ({ id: u.id, email: u.email, firstName: u.firstName })),
          }
        },
        { body: BatchGetUsersBody },
      )
      // Nomes das CRIANÇAS por lote de perfis (saudação do e-mail semanal). SÓ
      // ativos, SÓ id + nome — nunca foto/telefone/nascimento/conta.
      .post(
        '/profiles/batch',
        async ({ body, headers }) => {
          requireInternalToken(headers, deps.internalToken)
          const found = await deps.profiles.listActiveByIds([...new Set(body.ids)])
          return { profiles: found.map((p) => ({ id: p.id, name: p.name })) }
        },
        { body: BatchGetUsersBody },
      )
  )
}
