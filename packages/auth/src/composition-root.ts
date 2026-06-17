import { randomUUID } from 'node:crypto'
import { createLogger, type Logger } from '@sistemazero/core/logging'
import { BatchGetUsersService } from './application/admin/batch-get-users/batch-get-users.service'
import { CreateUserService } from './application/admin/create-user/create-user.service'
import { GetUserService } from './application/admin/get-user/get-user.service'
import { ListUsersService } from './application/admin/list-users/list-users.service'
import { UpdateUserService } from './application/admin/update-user/update-user.service'
import { EnsureBuyerService } from './application/ensure-buyer/ensure-buyer.service'
import { GetMeService } from './application/get-me/get-me.service'
import { CreateImpersonationTokenService } from './application/impersonation/create-impersonation-token.service'
import { ExchangeImpersonationTokenService } from './application/impersonation/exchange-impersonation-token.service'
import { LoginService } from './application/login/login.service'
import { LogoutService } from './application/logout/logout.service'
import { ChangeMyPasswordService } from './application/me/change-password.service'
import { UpdateProfileService } from './application/me/update-profile.service'
import { RequestOtpService } from './application/otp/request-otp.service'
import { ResetPasswordWithOtpService } from './application/otp/reset-password-otp.service'
import { VerifyOtpService } from './application/otp/verify-otp.service'
import { CreatePasswordTokenService } from './application/password-reset/create-password-token.service'
import { ForgotPasswordService } from './application/password-reset/forgot-password.service'
import { ResetPasswordService } from './application/password-reset/reset-password.service'
import { ArchiveProfileService } from './application/profiles/archive-profile.service'
import { CreateProfileService } from './application/profiles/create-profile.service'
import { ExitProfileSessionService } from './application/profiles/exit-profile-session.service'
import { ListProfilesService } from './application/profiles/list-profiles.service'
import { SelectProfileService } from './application/profiles/select-profile.service'
import { UpdateProfileDetailsService } from './application/profiles/update-profile.service'
import { RefreshService } from './application/refresh/refresh.service'
import { RegisterService } from './application/register/register.service'
import { AuthTokenService } from './application/tokens/auth-token.service'
import type { Env } from './infrastructure/config/env'
import { createMembersAllowanceGateway } from './infrastructure/gateways/members-allowance.gateway'
import {
  createGatewayMessagingClient,
  createNullMessagingClient,
} from './infrastructure/messaging/gateway-messaging-client'
import { withSentryMirror } from './infrastructure/observability/sentry'
import { createDbConnection, type DbConnection } from './infrastructure/persistence/drizzle/db'
import { DrizzleImpersonationTokenRepository } from './infrastructure/persistence/drizzle/impersonation-token.repository'
import { DrizzleOtpCodeRepository } from './infrastructure/persistence/drizzle/otp-code.repository'
import { DrizzlePasswordResetTokenRepository } from './infrastructure/persistence/drizzle/password-reset-token.repository'
import { DrizzleProfileRepository } from './infrastructure/persistence/drizzle/profile.repository'
import { DrizzleRefreshTokenRepository } from './infrastructure/persistence/drizzle/refresh-token.repository'
import { DrizzleUserRepository } from './infrastructure/persistence/drizzle/user.repository'
import { createBunPasswordHasher } from './infrastructure/security/bun-password-hasher'
import { createJoseTokenIssuer } from './infrastructure/security/jose-token-issuer'
import { loadSigningMaterial } from './infrastructure/security/keys'
import { createServer } from './interfaces/http/server'

export interface Application {
  logger: Logger
  start(): Promise<void>
  stop(): Promise<void>
}

/**
 * Chave do advisory lock do ciclo de purga de tokens ('auth' em ASCII int8;
 * string + cast ::bigint — o driver não tipa BigInt como parâmetro). O espaço de
 * advisory locks é GLOBAL ao banco compartilhado do monorepo — a constante
 * precisa ser única entre os serviços (o payments usa 8103081227979411315).
 */
const PURGE_ADVISORY_LOCK_KEY = '1635430504'
/** Intervalo entre ciclos de purga (fora do hot path; 1 réplica por ciclo). */
const PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000
/**
 * Folga além do `expiresAt` antes de apagar. Refresh tokens recém-expirados
 * ainda servem à detecção tardia de reuso (token roubado apresentado depois);
 * após a folga não há mais o que detectar — o token nem verificaria.
 */
const PURGE_GRACE_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Raiz de composição (injeção de dependências). ÚNICO lugar onde adapters
 * concretos são instanciados e plugados nos ports. É assíncrona porque o material
 * de assinatura (chaves JWT) e o hash "isca" do login são resolvidos no boot.
 */
export async function createApplication(env: Env): Promise<Application> {
  // Espelho Sentry: TODO log de nível ERROR vira evento/issue (a convenção do
  // package é "log ERROR = sinal alertável": e-mail de reset/OTP que não saiu,
  // purga falhando...). No-op sem SENTRY_DSN.
  const logger = withSentryMirror(
    createLogger({
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      pretty: env.NODE_ENV !== 'production',
    }),
  )

  const connection: DbConnection = createDbConnection(env.DATABASE_URL, {
    max: env.DATABASE_POOL_MAX,
  })
  const db = connection.db

  // Adapters
  const users = new DrizzleUserRepository(db)
  const refreshTokens = new DrizzleRefreshTokenRepository(db)
  const passwordResetTokens = new DrizzlePasswordResetTokenRepository(db)
  const otpCodes = new DrizzleOtpCodeRepository(db)
  const impersonationTokens = new DrizzleImpersonationTokenRepository(db)
  const profilesRepo = new DrizzleProfileRepository(db)
  const hasher = createBunPasswordHasher()

  // Teto de perfis (kids) resolvido S2S no members (matrícula = fonte da verdade).
  const profileAllowance = createMembersAllowanceGateway({
    baseUrl: env.MEMBERS_BASE_URL,
    internalToken: env.MEMBERS_INTERNAL_TOKEN,
    timeoutMs: env.MEMBERS_REQUEST_TIMEOUT_MS,
  })

  // E-mail via gateway → messaging (HMAC). Sem config completa → no-op (best-effort).
  const messaging =
    env.GATEWAY_URL && env.AUTH_HMAC_SECRET
      ? createGatewayMessagingClient({
          gatewayUrl: env.GATEWAY_URL,
          consumerId: env.AUTH_CONSUMER_ID,
          hmacSecret: env.AUTH_HMAC_SECRET,
        })
      : createNullMessagingClient(logger)

  const signing = await loadSigningMaterial(env, logger)
  const tokenIssuer = createJoseTokenIssuer({
    signing,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    accessTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
  })

  const authTokens = new AuthTokenService(tokenIssuer, refreshTokens, {
    refreshTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
    impersonationRefreshTtlSeconds: env.IMPERSONATION_REFRESH_TTL_SECONDS,
  })

  // Hash "isca" p/ equalizar o tempo do login quando o e-mail não existe (anti-enumeração).
  const dummyHash = await hasher.hash('timing-equalizer-not-a-real-password')

  // Casos de uso
  const register = new RegisterService(
    users,
    hasher,
    authTokens,
    { passwordMinLength: env.PASSWORD_MIN_LENGTH },
    logger,
  )
  const login = new LoginService(users, hasher, authTokens, { dummyHash }, logger)
  // Garante o usuário do comprador (novo/recorrente) no fluxo S2S pós-pagamento.
  const ensureBuyer = new EnsureBuyerService(
    users,
    hasher,
    { passwordMinLength: env.PASSWORD_MIN_LENGTH },
    logger,
  )
  const refresh = new RefreshService(users, refreshTokens, authTokens, profilesRepo, logger)
  const logout = new LogoutService(refreshTokens)
  const getMe = new GetMeService(users)
  // Reset/definição de senha + self-service de perfil.
  const createPasswordToken = new CreatePasswordTokenService(users, passwordResetTokens, {
    ttlMinutes: env.RESET_TOKEN_TTL_MINUTES,
  })
  const forgotPassword = new ForgotPasswordService(
    createPasswordToken,
    messaging,
    {
      urls: { main: env.COMMUNITY_URL, kids: env.KIDS_COMMUNITY_URL },
      cooldownSeconds: env.RESET_REQUEST_COOLDOWN_SECONDS,
    },
    logger,
  )
  const resetPassword = new ResetPasswordService(
    users,
    passwordResetTokens,
    refreshTokens,
    hasher,
    {
      passwordMinLength: env.PASSWORD_MIN_LENGTH,
    },
  )
  // OTP: login passwordless + recuperação de senha por código.
  const requestOtp = new RequestOtpService(
    users,
    otpCodes,
    messaging,
    {
      ttlMinutes: env.OTP_TTL_MINUTES,
      cooldownSeconds: env.OTP_REQUEST_COOLDOWN_SECONDS,
    },
    logger,
  )
  const verifyOtp = new VerifyOtpService(users, otpCodes, authTokens, {
    maxAttempts: env.OTP_MAX_ATTEMPTS,
  })
  const resetPasswordWithOtp = new ResetPasswordWithOtpService(
    users,
    otpCodes,
    refreshTokens,
    hasher,
    {
      passwordMinLength: env.PASSWORD_MIN_LENGTH,
      maxAttempts: env.OTP_MAX_ATTEMPTS,
    },
  )
  const updateProfile = new UpdateProfileService(users)
  const changeMyPassword = new ChangeMyPasswordService(users, refreshTokens, hasher, {
    passwordMinLength: env.PASSWORD_MIN_LENGTH,
  })
  // Casos de uso do painel admin (gestão de usuários).
  const listUsers = new ListUsersService(users)
  const getUser = new GetUserService(users)
  // Criação pelo painel (fluxo convite: senha aleatória + e-mail de definição).
  const createUser = new CreateUserService(
    users,
    hasher,
    createPasswordToken,
    messaging,
    { urls: { main: env.COMMUNITY_URL, kids: env.KIDS_COMMUNITY_URL } },
    logger,
  )
  const updateUser = new UpdateUserService(users, refreshTokens, logger)
  const batchGetUsers = new BatchGetUsersService(users)
  // Impersonação (suporte): handoff single-use admin→community + exchange por sessão.
  const createImpersonationToken = new CreateImpersonationTokenService(
    users,
    impersonationTokens,
    { ttlSeconds: env.IMPERSONATION_TOKEN_TTL_SECONDS },
    logger,
  )
  const exchangeImpersonationToken = new ExchangeImpersonationTokenService(
    users,
    impersonationTokens,
    authTokens,
    logger,
  )
  // Perfis (estilo Netflix) gerenciados pelo responsável.
  const listProfiles = new ListProfilesService(profilesRepo)
  const createProfile = new CreateProfileService(
    profilesRepo,
    profileAllowance,
    () => randomUUID(),
    () => new Date(),
  )
  const updateProfileDetails = new UpdateProfileDetailsService(profilesRepo, () => new Date())
  const archiveProfile = new ArchiveProfileService(profilesRepo, () => new Date())
  const selectProfile = new SelectProfileService(profilesRepo, users, authTokens)
  const exitProfileSession = new ExitProfileSessionService(users, hasher, authTokens)

  // Readiness (`/readyz`, healthcheck do Railway): a réplica só é promovida
  // quando o banco responde (sem banco não há login/refresh — não recebe tráfego).
  const readiness = async () => {
    const checks: Record<string, string> = { db: 'ok' }
    try {
      await connection.sql`select 1`
    } catch {
      checks.db = 'error'
    }
    return { ready: checks.db === 'ok', checks }
  }

  const server = createServer({
    env,
    logger,
    readiness,
    tokenIssuer,
    register,
    login,
    refresh,
    logout,
    getMe,
    forgotPassword,
    resetPassword,
    requestOtp,
    verifyOtp,
    resetPasswordWithOtp,
    updateProfile,
    changeMyPassword,
    createPasswordToken,
    ensureBuyer,
    listUsers,
    getUser,
    createUser,
    updateUser,
    batchGetUsers,
    createImpersonationToken,
    exchangeImpersonationToken,
    profiles: {
      listProfiles,
      createProfile,
      updateProfile: updateProfileDetails,
      archiveProfile,
      selectProfile,
      exitProfileSession,
      trustProxy: env.TRUST_PROXY,
      trustedProxyHops: env.TRUSTED_PROXY_HOPS,
      internalToken: env.AUTH_INTERNAL_TOKEN,
    },
  })

  // Purga periódica (fora do hot path): refresh tokens, tokens de reset e códigos
  // OTP expirados há mais que a folga — as três tabelas crescem a cada
  // login/rotação/pedido e nada mais as limpa. O advisory lock garante que SÓ UMA
  // réplica executa o ciclo (xact-lock → solta sozinho no commit/crash).
  const runPurgeCycle = async () => {
    await connection.sql.begin(async (gate) => {
      const [row] = await gate`
        select pg_try_advisory_xact_lock(${PURGE_ADVISORY_LOCK_KEY}::bigint) as locked
      `
      if (!row?.['locked']) return // outra réplica está purgando neste ciclo
      const cutoff = new Date(Date.now() - PURGE_GRACE_MS)
      const [refresh, reset, otp, impersonation] = await Promise.all([
        refreshTokens.deleteExpired(cutoff),
        passwordResetTokens.deleteExpired(cutoff),
        otpCodes.deleteExpired(cutoff),
        impersonationTokens.deleteExpired(cutoff),
      ])
      if (refresh + reset + otp + impersonation > 0) {
        logger.info('tokens.purged', { refresh, reset, otp, impersonation })
      }
    })
  }

  let purgeTimer: ReturnType<typeof setInterval> | null = null

  return {
    logger,
    async start() {
      const purgeSafely = () =>
        runPurgeCycle().catch((error) =>
          logger.error('tokens.purge.failed', {
            error: error instanceof Error ? error.message : String(error),
          }),
        )
      // Um ciclo no boot (deploys mais frequentes que o intervalo não deixam a
      // purga órfã) + intervalo. O advisory lock segura a concorrência entre réplicas.
      void purgeSafely()
      purgeTimer = setInterval(() => void purgeSafely(), PURGE_INTERVAL_MS)
      // `::` = dual-stack (IPv4+IPv6) — necessário p/ o private networking do
      // Railway (`auth.railway.internal` resolve IPv6).
      server.listen({ port: env.PORT, hostname: env.HOST })
      logger.info('http.listening', { port: env.PORT, host: env.HOST, alg: signing.alg })
    },
    async stop() {
      if (purgeTimer) clearInterval(purgeTimer)
      await server.stop()
      await connection.close()
      logger.info('app.stopped')
    },
  }
}
