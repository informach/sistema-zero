import { Elysia } from 'elysia'
import type { EnsureBuyerService } from '../../../application/ensure-buyer/ensure-buyer.service'
import type { CreatePasswordTokenService } from '../../../application/password-reset/create-password-token.service'
import { UserNotFoundError } from '../../../domain/user/user.errors'
import { CreatePasswordTokenBody, EnsureBuyerBody } from '../dtos'
import { PayloadTooLargeError } from '../errors'
import { requireInternalToken } from '../internal-auth'
import { isOversizeBody } from '../raw-body'

export interface InternalRoutesDeps {
  createPasswordToken: CreatePasswordTokenService
  ensureBuyer: EnsureBuyerService
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
  return new Elysia({ prefix: '/auth/internal' })
    .post(
      '/password-tokens',
      async ({ body, headers, request, set }) => {
        if (isOversizeBody(request)) throw new PayloadTooLargeError()
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
      async ({ body, headers, request, set }) => {
        if (isOversizeBody(request)) throw new PayloadTooLargeError()
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
}
