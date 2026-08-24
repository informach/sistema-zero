import { swagger } from '@elysiajs/swagger'
import type { Logger } from '@sistemazero/core/logging'
import { Elysia } from 'elysia'
import type { BatchGetProfilesService } from '../../application/admin/batch-get-profiles/batch-get-profiles.service'
import type { BatchGetUsersService } from '../../application/admin/batch-get-users/batch-get-users.service'
import type { CreateUserService } from '../../application/admin/create-user/create-user.service'
import type { DeleteUserService } from '../../application/admin/delete-user/delete-user.service'
import type { GetUserService } from '../../application/admin/get-user/get-user.service'
import type { ListUsersService } from '../../application/admin/list-users/list-users.service'
import type { ReadAuditLogService } from '../../application/admin/read-audit-log/read-audit-log.service'
import type { ResendInviteService } from '../../application/admin/resend-invite/resend-invite.service'
import type { SearchProfilesService } from '../../application/admin/search-profiles/search-profiles.service'
import type { SetUserPasswordService } from '../../application/admin/set-password/set-user-password.service'
import type { UpdateUserService } from '../../application/admin/update-user/update-user.service'
import type { EnsureBuyerService } from '../../application/ensure-buyer/ensure-buyer.service'
import type { GetMeService } from '../../application/get-me/get-me.service'
import type { ChangeImpersonationModeService } from '../../application/impersonation/change-impersonation-mode.service'
import type { CreateImpersonationTokenService } from '../../application/impersonation/create-impersonation-token.service'
import type { ExchangeImpersonationTokenService } from '../../application/impersonation/exchange-impersonation-token.service'
import type { WriteAuditLogService } from '../../application/internal/write-audit-log/write-audit-log.service'
import type { LoginService } from '../../application/login/login.service'
import type { LogoutService } from '../../application/logout/logout.service'
import type { ChangeMyPasswordService } from '../../application/me/change-password.service'
import type { UpdateProfileService } from '../../application/me/update-profile.service'
import type { RequestOtpService } from '../../application/otp/request-otp.service'
import type { ResetPasswordWithOtpService } from '../../application/otp/reset-password-otp.service'
import type { VerifyOtpService } from '../../application/otp/verify-otp.service'
import type { CreatePasswordTokenService } from '../../application/password-reset/create-password-token.service'
import type { ForgotPasswordService } from '../../application/password-reset/forgot-password.service'
import type { ResetPasswordService } from '../../application/password-reset/reset-password.service'
import type { RefreshService } from '../../application/refresh/refresh.service'
import type { RegisterService } from '../../application/register/register.service'
import type { ProfileRepository } from '../../domain/ports/profile-repository.port'
import type { TokenIssuer } from '../../domain/ports/token-issuer.port'
import type { UserRepository } from '../../domain/ports/user-repository.port'
import type { Env } from '../../infrastructure/config/env'
import { buildErrorResponse } from './error-handler'
import { PayloadTooLargeError } from './errors'
import { isOversizeBody, markOversizeBody } from './raw-body'
import { adminRoutes } from './routes/admin.routes'
import { authRoutes } from './routes/auth.routes'
import { healthRoutes, type ReadinessProbe } from './routes/health.routes'
import { impersonationRoutes } from './routes/impersonation.routes'
import { internalRoutes } from './routes/internal.routes'
import { type ProfilesRoutesDeps, profilesRoutes } from './routes/profiles.routes'

export interface HttpDeps {
  env: Env
  logger: Logger
  /** Probe do `/readyz` (banco alcançável) — montado no composition-root. */
  readiness: ReadinessProbe
  tokenIssuer: TokenIssuer
  register: RegisterService
  login: LoginService
  refresh: RefreshService
  logout: LogoutService
  getMe: GetMeService
  forgotPassword: ForgotPasswordService
  resetPassword: ResetPasswordService
  requestOtp: RequestOtpService
  verifyOtp: VerifyOtpService
  resetPasswordWithOtp: ResetPasswordWithOtpService
  updateProfile: UpdateProfileService
  changeMyPassword: ChangeMyPasswordService
  createPasswordToken: CreatePasswordTokenService
  ensureBuyer: EnsureBuyerService
  listUsers: ListUsersService
  getUser: GetUserService
  createUser: CreateUserService
  updateUser: UpdateUserService
  deleteUser: DeleteUserService
  batchGetUsers: BatchGetUsersService
  batchGetProfiles: BatchGetProfilesService
  /** Busca unificada de perfis (criança OU responsável) do painel admin. */
  searchProfiles: SearchProfilesService
  resendInvite: ResendInviteService
  setUserPassword: SetUserPasswordService
  writeAuditLog: WriteAuditLogService
  readAuditLog: ReadAuditLogService
  createImpersonationToken: CreateImpersonationTokenService
  exchangeImpersonationToken: ExchangeImpersonationTokenService
  changeImpersonationMode: ChangeImpersonationModeService
  /** Report dos pais (S2S members): identidade mínima em lote (users/emails + profiles/batch). */
  users: UserRepository
  profilesRepo: ProfileRepository
  /** Gerenciamento de perfis (estilo Netflix) pelo responsável. */
  profiles: ProfilesRoutesDeps
}

/**
 * Monta a aplicação Elysia do serviço de identidade: limite de corpo (anti-DoS),
 * tratamento central de erros, Swagger (fora de produção) e as rotas.
 */
export function createServer(deps: HttpDeps) {
  const app = new Elysia({
    serve: { maxRequestBodySize: deps.env.MAX_REQUEST_BODY_BYTES },
  })
    .onParse({ as: 'global' }, async ({ request, contentType }) => {
      const maxBytes = deps.env.MAX_REQUEST_BODY_BYTES
      const declared = Number(request.headers.get('content-length') ?? '0')
      if (Number.isFinite(declared) && declared > maxBytes) {
        markOversizeBody(request)
        return undefined
      }
      if (contentType?.includes('application/json')) {
        const text = await request.text()
        // Rede de segurança caso o Content-Length minta/esteja ausente.
        if (Buffer.byteLength(text, 'utf8') > maxBytes) {
          markOversizeBody(request)
          return {}
        }
        return text.length > 0 ? JSON.parse(text) : {}
      }
      return undefined
    })
    .onTransform({ as: 'global' }, ({ request }) => {
      if (isOversizeBody(request)) throw new PayloadTooLargeError()
    })
    .onError({ as: 'global' }, ({ code, error, set }) => {
      const { status, body } = buildErrorResponse({ code, error, logger: deps.logger })
      set.status = status
      return body
    })

  // Swagger só FORA de produção (não expõe o mapa de rotas/esquema de auth).
  if (deps.env.NODE_ENV !== 'production') {
    app.use(
      swagger({
        path: '/swagger',
        documentation: {
          info: {
            title: 'Sistema Zero — Auth API',
            version: '0.1.0',
            description:
              'Serviço de identidade: registro/login, emissão de JWT (access + refresh) e JWKS.',
          },
        },
      }),
    )
  }

  return app
    .use(healthRoutes(deps.readiness))
    .use(
      authRoutes({
        trustProxy: deps.env.TRUST_PROXY,
        trustedProxyHops: deps.env.TRUSTED_PROXY_HOPS,
        tokenIssuer: deps.tokenIssuer,
        register: deps.register,
        login: deps.login,
        refresh: deps.refresh,
        logout: deps.logout,
        getMe: deps.getMe,
        forgotPassword: deps.forgotPassword,
        resetPassword: deps.resetPassword,
        requestOtp: deps.requestOtp,
        verifyOtp: deps.verifyOtp,
        resetPasswordWithOtp: deps.resetPasswordWithOtp,
        updateProfile: deps.updateProfile,
        changeMyPassword: deps.changeMyPassword,
      }),
    )
    .use(
      internalRoutes({
        createPasswordToken: deps.createPasswordToken,
        inviteTokenTtlMinutes: deps.env.INVITE_TOKEN_TTL_MINUTES,
        ensureBuyer: deps.ensureBuyer,
        writeAuditLog: deps.writeAuditLog,
        users: deps.users,
        profiles: deps.profilesRepo,
        internalToken: deps.env.AUTH_INTERNAL_TOKEN,
      }),
    )
    .use(
      impersonationRoutes({
        trustProxy: deps.env.TRUST_PROXY,
        trustedProxyHops: deps.env.TRUSTED_PROXY_HOPS,
        exchange: deps.exchangeImpersonationToken,
        changeMode: deps.changeImpersonationMode,
      }),
    )
    .use(profilesRoutes(deps.profiles))
    .use(
      adminRoutes({
        listUsers: deps.listUsers,
        getUser: deps.getUser,
        createUser: deps.createUser,
        updateUser: deps.updateUser,
        deleteUser: deps.deleteUser,
        batchGetUsers: deps.batchGetUsers,
        batchGetProfiles: deps.batchGetProfiles,
        searchProfiles: deps.searchProfiles,
        resendInvite: deps.resendInvite,
        setUserPassword: deps.setUserPassword,
        readAuditLog: deps.readAuditLog,
        createImpersonationToken: deps.createImpersonationToken,
        listProfiles: deps.profiles.listProfiles,
        urls: { main: deps.env.COMMUNITY_URL, kids: deps.env.KIDS_COMMUNITY_URL },
        internalToken: deps.env.AUTH_INTERNAL_TOKEN,
      }),
    )
}
