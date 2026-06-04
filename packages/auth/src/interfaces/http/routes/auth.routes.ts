import { UnauthorizedError } from '@sistemazero/core/http'
import { Elysia } from 'elysia'
import type { GetMeService } from '../../../application/get-me/get-me.service'
import type { LoginService } from '../../../application/login/login.service'
import type { LogoutService } from '../../../application/logout/logout.service'
import type { ChangeMyPasswordService } from '../../../application/me/change-password.service'
import type { UpdateProfileService } from '../../../application/me/update-profile.service'
import type { ForgotPasswordService } from '../../../application/password-reset/forgot-password.service'
import type { ResetPasswordService } from '../../../application/password-reset/reset-password.service'
import type { RefreshService } from '../../../application/refresh/refresh.service'
import type { RegisterService } from '../../../application/register/register.service'
import type { TokenIssuer } from '../../../domain/ports/token-issuer.port'
import { type AuthContext, extractBearer, resolveClientIp } from '../auth'
import {
  ChangeMyPasswordBody,
  ForgotPasswordBody,
  LoginBody,
  LogoutBody,
  RefreshBody,
  RegisterBody,
  ResetPasswordBody,
  UpdateMeBody,
} from '../dtos'
import { PayloadTooLargeError } from '../errors'
import { isOversizeBody } from '../raw-body'

export interface AuthRoutesDeps {
  trustProxy: boolean
  trustedProxyHops: number
  tokenIssuer: TokenIssuer
  register: RegisterService
  login: LoginService
  refresh: RefreshService
  logout: LogoutService
  getMe: GetMeService
  forgotPassword: ForgotPasswordService
  resetPassword: ResetPasswordService
  updateProfile: UpdateProfileService
  changeMyPassword: ChangeMyPasswordService
}

/**
 * Rotas de identidade. Cadastro/login/refresh/logout e JWKS são públicos; `/me`
 * exige um access token válido (Bearer). O IP/User-Agent são capturados para
 * auditoria dos refresh tokens.
 */
export function authRoutes(deps: AuthRoutesDeps) {
  const clientIp = (ctx: AuthContext): string =>
    resolveClientIp(ctx, deps.trustProxy, deps.trustedProxyHops)

  return new Elysia({ prefix: '/auth' })
    .post(
      '/register',
      async ({ body, request, server, headers, set }) => {
        if (isOversizeBody(request)) throw new PayloadTooLargeError()
        const result = await deps.register.execute({
          email: body.email,
          password: body.password,
          firstName: body.firstName,
          lastName: body.lastName,
          phone: body.phone,
          source: body.source,
          userAgent: headers['user-agent'] ?? null,
          ip: clientIp({ request, server, headers }),
        })
        set.status = 201
        return result
      },
      { body: RegisterBody },
    )
    .post(
      '/login',
      async ({ body, request, server, headers }) => {
        if (isOversizeBody(request)) throw new PayloadTooLargeError()
        return deps.login.execute({
          email: body.email,
          password: body.password,
          userAgent: headers['user-agent'] ?? null,
          ip: clientIp({ request, server, headers }),
        })
      },
      { body: LoginBody },
    )
    .post(
      '/refresh',
      async ({ body, request, server, headers }) => {
        const tokens = await deps.refresh.execute({
          refreshToken: body.refreshToken,
          userAgent: headers['user-agent'] ?? null,
          ip: clientIp({ request, server, headers }),
        })
        return { tokens }
      },
      { body: RefreshBody },
    )
    .post(
      '/logout',
      async ({ body }) => {
        await deps.logout.execute({
          refreshToken: body.refreshToken,
          allSessions: body.allSessions,
        })
        return { ok: true }
      },
      { body: LogoutBody },
    )
    .post(
      '/forgot-password',
      async ({ body, request }) => {
        if (isOversizeBody(request)) throw new PayloadTooLargeError()
        // SEMPRE 200, exista a conta ou não (anti-enumeração). O e-mail é best-effort.
        await deps.forgotPassword.execute({ email: body.email })
        return { ok: true }
      },
      { body: ForgotPasswordBody },
    )
    .post(
      '/reset-password',
      async ({ body, request }) => {
        if (isOversizeBody(request)) throw new PayloadTooLargeError()
        return deps.resetPassword.execute({ token: body.token, newPassword: body.newPassword })
      },
      { body: ResetPasswordBody },
    )
    .get('/me', async ({ headers }) => {
      const token = extractBearer(headers.authorization)
      if (!token) throw new UnauthorizedError('Token de acesso ausente')
      const claims = await deps.tokenIssuer.verifyAccessToken(token)
      if (!claims) throw new UnauthorizedError('Token inválido ou expirado')
      // Resolve o usuário fresco do banco (contrato null | usuário).
      const user = await deps.getMe.execute(claims.sub)
      if (!user) throw new UnauthorizedError('Usuário não encontrado')
      return { user }
    })
    .patch(
      '/me',
      async ({ body, headers, request }) => {
        if (isOversizeBody(request)) throw new PayloadTooLargeError()
        const claims = await requireBearer(headers.authorization, deps.tokenIssuer)
        const user = await deps.updateProfile.execute({
          userId: claims.sub,
          firstName: body.firstName,
          lastName: body.lastName,
          phone: body.phone,
        })
        return { user }
      },
      { body: UpdateMeBody },
    )
    .post(
      '/me/password',
      async ({ body, headers, request }) => {
        if (isOversizeBody(request)) throw new PayloadTooLargeError()
        const claims = await requireBearer(headers.authorization, deps.tokenIssuer)
        return deps.changeMyPassword.execute({
          userId: claims.sub,
          currentPassword: body.currentPassword,
          newPassword: body.newPassword,
        })
      },
      { body: ChangeMyPasswordBody },
    )
    .get('/.well-known/jwks.json', ({ set }) => {
      // Cacheável; a rotação de chave troca o `kid`.
      set.headers['cache-control'] = 'public, max-age=300'
      return deps.tokenIssuer.jwks()
    })
}

/** Exige um Bearer válido e devolve as claims (rotas self-service /me*). */
async function requireBearer(header: string | undefined, tokenIssuer: TokenIssuer) {
  const token = extractBearer(header)
  if (!token) throw new UnauthorizedError('Token de acesso ausente')
  const claims = await tokenIssuer.verifyAccessToken(token)
  if (!claims) throw new UnauthorizedError('Token inválido ou expirado')
  return claims
}
