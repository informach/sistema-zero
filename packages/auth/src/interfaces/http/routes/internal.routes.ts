import { Elysia } from 'elysia'
import type { CreatePasswordTokenService } from '../../../application/password-reset/create-password-token.service'
import { UserNotFoundError } from '../../../domain/user/user.errors'
import { CreatePasswordTokenBody } from '../dtos'
import { PayloadTooLargeError } from '../errors'
import { requireInternalToken } from '../internal-auth'
import { isOversizeBody } from '../raw-body'

export interface InternalRoutesDeps {
  createPasswordToken: CreatePasswordTokenService
  /** `AUTH_INTERNAL_TOKEN` — injetado pelo gateway nas rotas internas (defesa em profundidade). */
  internalToken: string | undefined
}

/**
 * Rotas internas S2S (atrás do gateway, consumer HMAC + `x-internal-token`).
 * `POST /auth/internal/password-tokens`: emite o token de DEFINIÇÃO de senha do
 * 1º acesso pós-compra (o funil monta o link e envia o e-mail de boas-vindas).
 * O token CRU só trafega S2S — nunca chega ao browser por aqui.
 */
export function internalRoutes(deps: InternalRoutesDeps) {
  return new Elysia({ prefix: '/auth/internal' }).post(
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
}
