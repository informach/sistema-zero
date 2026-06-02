import { createLogger, type Logger } from '@sistemazero/core/logging'
import { GetMeService } from './application/get-me/get-me.service'
import { LoginService } from './application/login/login.service'
import { LogoutService } from './application/logout/logout.service'
import { RefreshService } from './application/refresh/refresh.service'
import { RegisterService } from './application/register/register.service'
import { AuthTokenService } from './application/tokens/auth-token.service'
import type { Env } from './infrastructure/config/env'
import { createDbConnection, type DbConnection } from './infrastructure/persistence/drizzle/db'
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
 * Raiz de composição (injeção de dependências). ÚNICO lugar onde adapters
 * concretos são instanciados e plugados nos ports. É assíncrona porque o material
 * de assinatura (chaves JWT) e o hash "isca" do login são resolvidos no boot.
 */
export async function createApplication(env: Env): Promise<Application> {
  const logger = createLogger({
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    pretty: env.NODE_ENV !== 'production',
  })

  const connection: DbConnection = createDbConnection(env.DATABASE_URL, {
    max: env.DATABASE_POOL_MAX,
  })
  const db = connection.db

  // Adapters
  const users = new DrizzleUserRepository(db)
  const refreshTokens = new DrizzleRefreshTokenRepository(db)
  const hasher = createBunPasswordHasher()

  const signing = await loadSigningMaterial(env, logger)
  const tokenIssuer = createJoseTokenIssuer({
    signing,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    accessTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
  })

  const authTokens = new AuthTokenService(tokenIssuer, refreshTokens, {
    refreshTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
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
  const login = new LoginService(users, hasher, authTokens, { dummyHash })
  const refresh = new RefreshService(users, refreshTokens, authTokens, logger)
  const logout = new LogoutService(refreshTokens)
  const getMe = new GetMeService(users)

  const server = createServer({
    env,
    logger,
    tokenIssuer,
    register,
    login,
    refresh,
    logout,
    getMe,
  })

  return {
    logger,
    async start() {
      server.listen(env.PORT)
      logger.info('http.listening', { port: env.PORT, alg: signing.alg })
    },
    async stop() {
      await server.stop()
      await connection.close()
      logger.info('app.stopped')
    },
  }
}
