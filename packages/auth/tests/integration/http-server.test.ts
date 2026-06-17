import { describe, expect, test } from 'bun:test'
import { decodeJwt } from 'jose'
import { BatchGetUsersService } from '../../src/application/admin/batch-get-users/batch-get-users.service'
import { CreateUserService } from '../../src/application/admin/create-user/create-user.service'
import { GetUserService } from '../../src/application/admin/get-user/get-user.service'
import { ListUsersService } from '../../src/application/admin/list-users/list-users.service'
import { UpdateUserService } from '../../src/application/admin/update-user/update-user.service'
import { EnsureBuyerService } from '../../src/application/ensure-buyer/ensure-buyer.service'
import { GetMeService } from '../../src/application/get-me/get-me.service'
import { CreateImpersonationTokenService } from '../../src/application/impersonation/create-impersonation-token.service'
import { ExchangeImpersonationTokenService } from '../../src/application/impersonation/exchange-impersonation-token.service'
import { LoginService } from '../../src/application/login/login.service'
import { LogoutService } from '../../src/application/logout/logout.service'
import { ChangeMyPasswordService } from '../../src/application/me/change-password.service'
import { UpdateProfileService } from '../../src/application/me/update-profile.service'
import { RequestOtpService } from '../../src/application/otp/request-otp.service'
import { ResetPasswordWithOtpService } from '../../src/application/otp/reset-password-otp.service'
import { VerifyOtpService } from '../../src/application/otp/verify-otp.service'
import { CreatePasswordTokenService } from '../../src/application/password-reset/create-password-token.service'
import { ForgotPasswordService } from '../../src/application/password-reset/forgot-password.service'
import { ResetPasswordService } from '../../src/application/password-reset/reset-password.service'
import { ArchiveProfileService } from '../../src/application/profiles/archive-profile.service'
import { CreateProfileService } from '../../src/application/profiles/create-profile.service'
import { ExitProfileSessionService } from '../../src/application/profiles/exit-profile-session.service'
import { ListProfilesService } from '../../src/application/profiles/list-profiles.service'
import { SelectProfileService } from '../../src/application/profiles/select-profile.service'
import { UpdateProfileDetailsService } from '../../src/application/profiles/update-profile.service'
import { RefreshService } from '../../src/application/refresh/refresh.service'
import { RegisterService } from '../../src/application/register/register.service'
import { AuthTokenService } from '../../src/application/tokens/auth-token.service'
import { ProfileAggregate } from '../../src/domain/profile/profile.aggregate'
import { UserAggregate } from '../../src/domain/user/user.aggregate'
import type { UserRole } from '../../src/domain/user/user.role'
import type { UserStatus } from '../../src/domain/user/user.status'
import { Email } from '../../src/domain/value-objects/email'
import type { Env } from '../../src/infrastructure/config/env'
import { createServer } from '../../src/interfaces/http/server'
import {
  FakeMessagingClient,
  FakeProfileAllowanceGateway,
  fakeHasher,
  InMemoryImpersonationTokenRepository,
  InMemoryOtpCodeRepository,
  InMemoryPasswordResetTokenRepository,
  InMemoryProfileRepository,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
  silentLogger,
} from '../fakes/in-memory'
import { testTokenIssuer } from '../helpers'

const COMMUNITY_URL = 'http://localhost:3007'
const KIDS_COMMUNITY_URL = 'http://localhost:3008'
const INTERNAL_TOKEN = 'internal-token-de-teste'

function buildApp(
  opts: { otpCooldownSeconds?: number; resetCooldownSeconds?: number; ready?: boolean } = {},
) {
  // Cooldowns DESLIGADOS por default: os fluxos da suíte fazem pedidos em rajada
  // (ex.: dois forgot-password seguidos). Os testes de cooldown ligam via opts.
  const otpCooldownSeconds = opts.otpCooldownSeconds ?? 0
  const resetCooldownSeconds = opts.resetCooldownSeconds ?? 0
  const users = new InMemoryUserRepository()
  const refreshTokens = new InMemoryRefreshTokenRepository()
  const resetTokens = new InMemoryPasswordResetTokenRepository()
  const otpCodes = new InMemoryOtpCodeRepository()
  const messaging = new FakeMessagingClient()
  const tokenIssuer = testTokenIssuer()
  const authTokens = new AuthTokenService(tokenIssuer, refreshTokens, {
    refreshTtlDays: 30,
    impersonationRefreshTtlSeconds: 7200,
  })

  const register = new RegisterService(
    users,
    fakeHasher,
    authTokens,
    { passwordMinLength: 10 },
    silentLogger,
  )
  const login = new LoginService(users, fakeHasher, authTokens, {})
  const profilesRepo = new InMemoryProfileRepository()
  const refresh = new RefreshService(users, refreshTokens, authTokens, profilesRepo, silentLogger)
  const logout = new LogoutService(refreshTokens)
  const getMe = new GetMeService(users)
  const createPasswordToken = new CreatePasswordTokenService(users, resetTokens, {
    ttlMinutes: 60,
  })
  const ensureBuyer = new EnsureBuyerService(
    users,
    fakeHasher,
    { passwordMinLength: 10 },
    silentLogger,
  )
  const requestOtp = new RequestOtpService(
    users,
    otpCodes,
    messaging,
    { ttlMinutes: 10, cooldownSeconds: otpCooldownSeconds },
    silentLogger,
  )
  const verifyOtp = new VerifyOtpService(users, otpCodes, authTokens, { maxAttempts: 5 })
  const resetPasswordWithOtp = new ResetPasswordWithOtpService(
    users,
    otpCodes,
    refreshTokens,
    fakeHasher,
    { passwordMinLength: 10, maxAttempts: 5 },
  )
  const forgotPassword = new ForgotPasswordService(
    createPasswordToken,
    messaging,
    {
      urls: { main: COMMUNITY_URL, kids: KIDS_COMMUNITY_URL },
      cooldownSeconds: resetCooldownSeconds,
    },
    silentLogger,
  )
  const resetPassword = new ResetPasswordService(users, resetTokens, refreshTokens, fakeHasher, {
    passwordMinLength: 10,
  })
  const updateProfile = new UpdateProfileService(users)
  const changeMyPassword = new ChangeMyPasswordService(users, refreshTokens, fakeHasher, {
    passwordMinLength: 10,
  })
  const listUsers = new ListUsersService(users)
  const getUser = new GetUserService(users)
  const createUser = new CreateUserService(
    users,
    fakeHasher,
    createPasswordToken,
    messaging,
    { urls: { main: COMMUNITY_URL, kids: KIDS_COMMUNITY_URL } },
    silentLogger,
  )
  const updateUser = new UpdateUserService(users, refreshTokens, silentLogger)
  const batchGetUsers = new BatchGetUsersService(users)
  const impersonationTokens = new InMemoryImpersonationTokenRepository()
  const createImpersonationToken = new CreateImpersonationTokenService(
    users,
    impersonationTokens,
    { ttlSeconds: 60 },
    silentLogger,
  )
  const exchangeImpersonationToken = new ExchangeImpersonationTokenService(
    users,
    impersonationTokens,
    authTokens,
    silentLogger,
  )
  const allowance = new FakeProfileAllowanceGateway()
  let profileSeq = 0
  const listProfiles = new ListProfilesService(profilesRepo)
  const createProfile = new CreateProfileService(
    profilesRepo,
    allowance,
    () => `00000000-0000-4000-8000-${String(++profileSeq).padStart(12, '0')}`,
    () => new Date(),
  )
  const updateProfileDetails = new UpdateProfileDetailsService(profilesRepo, () => new Date())
  const archiveProfile = new ArchiveProfileService(profilesRepo, () => new Date())
  const selectProfile = new SelectProfileService(profilesRepo, users, authTokens)
  const exitProfileSession = new ExitProfileSessionService(users, fakeHasher, authTokens)

  const env = {
    MAX_REQUEST_BODY_BYTES: 16 * 1024,
    NODE_ENV: 'test',
    TRUST_PROXY: false,
    TRUSTED_PROXY_HOPS: 1,
    AUTH_INTERNAL_TOKEN: INTERNAL_TOKEN,
    COMMUNITY_URL,
    KIDS_COMMUNITY_URL,
  } as unknown as Env

  const app = createServer({
    env,
    logger: silentLogger,
    readiness: async () => {
      const ready = opts.ready ?? true
      return { ready, checks: { db: ready ? 'ok' : 'error' } }
    },
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
      trustProxy: false,
      trustedProxyHops: 1,
      internalToken: INTERNAL_TOKEN,
    },
  })
  return {
    app,
    users,
    profilesRepo,
    allowance,
    refreshTokens,
    resetTokens,
    otpCodes,
    impersonationTokens,
    messaging,
    tokenIssuer,
  }
}

const REGISTER_BODY = {
  email: 'Maria@Example.com',
  password: 'senha-super-secreta',
  firstName: 'Maria',
  lastName: 'Silva',
  phone: '+5511999998888',
  source: 'funnel',
}

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

interface Tokens {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
}
interface UserView {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
  phone?: string
  signupSource?: string
}

describe('Auth HTTP server', () => {
  test('GET /health → 200', async () => {
    const { app } = buildApp()
    const res = await app.handle(new Request('http://localhost/health'))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ status: 'ok', service: 'auth' })
  })

  test('POST /auth/register cria usuário e retorna tokens (sem passwordHash) → 201', async () => {
    const { app } = buildApp()
    const res = await app.handle(post('/auth/register', REGISTER_BODY))
    expect(res.status).toBe(201)
    const json = (await res.json()) as { user: UserView; tokens: Tokens }
    // E-mail normalizado, papel/status padrão, opcionais preservados.
    expect(json.user.email).toBe('maria@example.com')
    expect(json.user.role).toBe('customer')
    expect(json.user.status).toBe('active')
    expect(json.user.phone).toBe('+5511999998888')
    expect(json.user.signupSource).toBe('funnel')
    expect((json.user as unknown as Record<string, unknown>).passwordHash).toBeUndefined()
    expect(json.tokens.accessToken).toBeTruthy()
    expect(json.tokens.refreshToken).toBeTruthy()
    expect(json.tokens.tokenType).toBe('Bearer')
  })

  test('POST /auth/register com senha curta → 400', async () => {
    const { app } = buildApp()
    const res = await app.handle(post('/auth/register', { ...REGISTER_BODY, password: 'curta' }))
    expect(res.status).toBe(400)
  })

  test('POST /auth/register com e-mail duplicado → 409', async () => {
    const { app } = buildApp()
    await app.handle(post('/auth/register', REGISTER_BODY))
    const res = await app.handle(post('/auth/register', REGISTER_BODY))
    expect(res.status).toBe(409)
  })

  test('POST /auth/register com e-mail inválido → 400', async () => {
    const { app } = buildApp()
    const res = await app.handle(
      post('/auth/register', { ...REGISTER_BODY, email: 'nao-eh-email' }),
    )
    expect(res.status).toBe(400)
  })

  test('POST /auth/login com credenciais válidas → 200 + tokens', async () => {
    const { app } = buildApp()
    await app.handle(post('/auth/register', REGISTER_BODY))
    const res = await app.handle(
      post('/auth/login', { email: 'maria@example.com', password: 'senha-super-secreta' }),
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as { user: UserView; tokens: Tokens }
    expect(json.user.email).toBe('maria@example.com')
    expect(json.tokens.accessToken).toBeTruthy()
  })

  test('POST /auth/login com senha errada → 401', async () => {
    const { app } = buildApp()
    await app.handle(post('/auth/register', REGISTER_BODY))
    const res = await app.handle(
      post('/auth/login', { email: 'maria@example.com', password: 'senha-errada-123' }),
    )
    expect(res.status).toBe(401)
  })

  test('POST /auth/login com e-mail inexistente → 401', async () => {
    const { app } = buildApp()
    const res = await app.handle(
      post('/auth/login', { email: 'ninguem@example.com', password: 'qualquer-coisa-123' }),
    )
    expect(res.status).toBe(401)
  })

  test('POST /auth/login com conta suspensa → 403', async () => {
    const { app, users } = buildApp()
    const now = new Date()
    users.seed(
      UserAggregate.restore({
        id: crypto.randomUUID(),
        version: 0,
        email: Email.create('sus@example.com').value,
        passwordHash: 'hashed:senha-super-secreta',
        firstName: 'Sus',
        lastName: 'Pended',
        role: 'customer',
        status: 'suspended',
        phone: null,
        signupSource: null,
        avatarUrl: null,
        createdAt: now,
        updatedAt: now,
      }),
    )
    const res = await app.handle(
      post('/auth/login', { email: 'sus@example.com', password: 'senha-super-secreta' }),
    )
    expect(res.status).toBe(403)
  })

  test('POST /auth/refresh rotaciona e detecta reuso (revoga família) → 401', async () => {
    const { app } = buildApp()
    const reg = (await (await app.handle(post('/auth/register', REGISTER_BODY))).json()) as {
      tokens: Tokens
    }
    const r1 = reg.tokens.refreshToken

    // 1ª rotação: R1 → R2 (200).
    const rot = await app.handle(post('/auth/refresh', { refreshToken: r1 }))
    expect(rot.status).toBe(200)
    const { tokens: t2 } = (await rot.json()) as { tokens: Tokens }
    expect(t2.refreshToken).toBeTruthy()
    expect(t2.refreshToken).not.toBe(r1)

    // Reapresentar R1 (já rotacionado) → 401 + revoga a família.
    const reuse = await app.handle(post('/auth/refresh', { refreshToken: r1 }))
    expect(reuse.status).toBe(401)

    // R2 também cai (família revogada por detecção de reuso) → 401.
    const r2Reuse = await app.handle(post('/auth/refresh', { refreshToken: t2.refreshToken }))
    expect(r2Reuse.status).toBe(401)
  })

  test('POST /auth/logout revoga o refresh (refresh subsequente → 401)', async () => {
    const { app } = buildApp()
    const reg = (await (await app.handle(post('/auth/register', REGISTER_BODY))).json()) as {
      tokens: Tokens
    }
    const logout = await app.handle(post('/auth/logout', { refreshToken: reg.tokens.refreshToken }))
    expect(logout.status).toBe(200)
    const after = await app.handle(post('/auth/refresh', { refreshToken: reg.tokens.refreshToken }))
    expect(after.status).toBe(401)
  })

  test('POST /auth/logout allSessions revoga TODOS os dispositivos (famílias)', async () => {
    const { app } = buildApp()
    // Dispositivo A: registro (1ª família). Dispositivo B: login (2ª família).
    const reg = (await (await app.handle(post('/auth/register', REGISTER_BODY))).json()) as {
      tokens: Tokens
    }
    const loginRes = await app.handle(
      post('/auth/login', { email: REGISTER_BODY.email, password: REGISTER_BODY.password }),
    )
    expect(loginRes.status).toBe(200)
    const { tokens: deviceB } = (await loginRes.json()) as { tokens: Tokens }

    // Logout "todas as sessões" pelo dispositivo A → o refresh do B também cai.
    const logout = await app.handle(
      post('/auth/logout', { refreshToken: reg.tokens.refreshToken, allSessions: true }),
    )
    expect(logout.status).toBe(200)
    expect(
      (await app.handle(post('/auth/refresh', { refreshToken: deviceB.refreshToken }))).status,
    ).toBe(401)
  })

  test('GET /auth/me com access token → 200 (contrato do usuário)', async () => {
    const { app } = buildApp()
    const reg = (await (await app.handle(post('/auth/register', REGISTER_BODY))).json()) as {
      tokens: Tokens
    }
    const res = await app.handle(
      new Request('http://localhost/auth/me', {
        headers: { authorization: `Bearer ${reg.tokens.accessToken}` },
      }),
    )
    expect(res.status).toBe(200)
    const { user } = (await res.json()) as { user: UserView }
    expect(user.email).toBe('maria@example.com')
    expect(user.role).toBe('customer')
    expect(user.status).toBe('active')
  })

  test('GET /auth/me sem token → 401; token inválido → 401', async () => {
    const { app } = buildApp()
    expect((await app.handle(new Request('http://localhost/auth/me'))).status).toBe(401)
    const bad = await app.handle(
      new Request('http://localhost/auth/me', { headers: { authorization: 'Bearer not.a.jwt' } }),
    )
    expect(bad.status).toBe(401)
  })

  test('GET /auth/me com token válido mas usuário removido → 401 (contrato null)', async () => {
    const { app, users } = buildApp()
    const reg = (await (await app.handle(post('/auth/register', REGISTER_BODY))).json()) as {
      tokens: Tokens
    }
    users.byId.clear() // usuário some
    const res = await app.handle(
      new Request('http://localhost/auth/me', {
        headers: { authorization: `Bearer ${reg.tokens.accessToken}` },
      }),
    )
    expect(res.status).toBe(401)
  })

  test('GET /auth/.well-known/jwks.json → 200 (HS256 = sem chaves)', async () => {
    const { app } = buildApp()
    const res = await app.handle(new Request('http://localhost/auth/.well-known/jwks.json'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ keys: [] })
  })
})

describe('Password reset + perfil self-service', () => {
  /** Extrai o token cru do link enviado no e-mail (fake messaging). */
  function tokenFromEmail(messaging: FakeMessagingClient): string {
    const link = messaging.sent.at(-1)?.variables.link ?? ''
    return new URL(link).searchParams.get('token') ?? ''
  }

  test('forgot-password com conta ativa → 200 + e-mail com link do community', async () => {
    const { app, messaging } = buildApp()
    await app.handle(post('/auth/register', REGISTER_BODY))
    const res = await app.handle(post('/auth/forgot-password', { email: 'maria@example.com' }))
    expect(res.status).toBe(200)
    expect(messaging.sent).toHaveLength(1)
    const sent = messaging.sent[0]
    expect(sent?.templateKey).toBe('password-reset')
    expect(sent?.recipient.email).toBe('maria@example.com')
    expect(sent?.variables.link).toStartWith(`${COMMUNITY_URL}/redefinir-senha?token=`)
  })

  test('forgot-password com platform=kids → link com a base kids', async () => {
    const { app, messaging } = buildApp()
    await app.handle(post('/auth/register', REGISTER_BODY))
    const res = await app.handle(
      post('/auth/forgot-password', { email: 'maria@example.com', platform: 'kids' }),
    )
    expect(res.status).toBe(200)
    expect(messaging.sent[0]?.variables.link).toStartWith(
      `${KIDS_COMMUNITY_URL}/redefinir-senha?token=`,
    )
  })

  test('forgot-password com platform inválida → 400 na borda', async () => {
    const { app } = buildApp()
    const res = await app.handle(
      post('/auth/forgot-password', { email: 'maria@example.com', platform: 'teen' }),
    )
    expect(res.status).toBe(400)
  })

  test('forgot-password com e-mail inexistente → 200 SEM envio (anti-enumeração)', async () => {
    const { app, messaging } = buildApp()
    const res = await app.handle(post('/auth/forgot-password', { email: 'ghost@example.com' }))
    expect(res.status).toBe(200)
    expect(messaging.sent).toHaveLength(0)
  })

  test('forgot-password com messaging fora do ar → 200 mesmo assim (best-effort)', async () => {
    const { app, messaging } = buildApp()
    await app.handle(post('/auth/register', REGISTER_BODY))
    messaging.failNext = true
    const res = await app.handle(post('/auth/forgot-password', { email: 'maria@example.com' }))
    expect(res.status).toBe(200)
  })

  test('reset-password troca a senha, revoga sessões e consome o token', async () => {
    const { app, messaging } = buildApp()
    const reg = (await (await app.handle(post('/auth/register', REGISTER_BODY))).json()) as {
      tokens: Tokens
    }
    await app.handle(post('/auth/forgot-password', { email: 'maria@example.com' }))
    const token = tokenFromEmail(messaging)
    expect(token.length).toBeGreaterThan(10)

    const res = await app.handle(
      post('/auth/reset-password', { token, newPassword: 'nova-senha-super-secreta' }),
    )
    expect(res.status).toBe(200)

    // Senha antiga não vale mais; a nova vale.
    const oldLogin = await app.handle(
      post('/auth/login', { email: 'maria@example.com', password: 'senha-super-secreta' }),
    )
    expect(oldLogin.status).toBe(401)
    const newLogin = await app.handle(
      post('/auth/login', { email: 'maria@example.com', password: 'nova-senha-super-secreta' }),
    )
    expect(newLogin.status).toBe(200)

    // Sessões antigas revogadas (refresh emitido no registro não renova mais).
    const refresh = await app.handle(
      post('/auth/refresh', { refreshToken: reg.tokens.refreshToken }),
    )
    expect(refresh.status).toBe(401)

    // Token é single-use.
    const reuse = await app.handle(
      post('/auth/reset-password', { token, newPassword: 'outra-senha-super-secreta' }),
    )
    expect(reuse.status).toBe(401)
  })

  test('reset-password com token desconhecido → 401; senha curta → 400', async () => {
    const { app, messaging } = buildApp()
    await app.handle(post('/auth/register', REGISTER_BODY))
    expect(
      (
        await app.handle(
          post('/auth/reset-password', {
            token: 'token-inexistente-xyz',
            newPassword: 'nova-senha-super',
          }),
        )
      ).status,
    ).toBe(401)

    await app.handle(post('/auth/forgot-password', { email: 'maria@example.com' }))
    const token = tokenFromEmail(messaging)
    expect(
      (await app.handle(post('/auth/reset-password', { token, newPassword: 'curta' }))).status,
    ).toBe(400)
  })

  test('reset-password com token expirado → 401', async () => {
    const { app, messaging, resetTokens } = buildApp()
    await app.handle(post('/auth/register', REGISTER_BODY))
    await app.handle(post('/auth/forgot-password', { email: 'maria@example.com' }))
    const token = tokenFromEmail(messaging)
    for (const record of resetTokens.byId.values()) record.expiresAt = new Date(Date.now() - 1000)
    const res = await app.handle(
      post('/auth/reset-password', { token, newPassword: 'nova-senha-super-secreta' }),
    )
    expect(res.status).toBe(401)
  })

  test('novo forgot-password invalida o token anterior (1 token vivo)', async () => {
    const { app, messaging } = buildApp()
    await app.handle(post('/auth/register', REGISTER_BODY))
    await app.handle(post('/auth/forgot-password', { email: 'maria@example.com' }))
    const first = tokenFromEmail(messaging)
    await app.handle(post('/auth/forgot-password', { email: 'maria@example.com' }))
    const second = tokenFromEmail(messaging)
    expect(second).not.toBe(first)

    expect(
      (
        await app.handle(
          post('/auth/reset-password', { token: first, newPassword: 'nova-senha-super-secreta' }),
        )
      ).status,
    ).toBe(401)
    expect(
      (
        await app.handle(
          post('/auth/reset-password', { token: second, newPassword: 'nova-senha-super-secreta' }),
        )
      ).status,
    ).toBe(200)
  })

  test('PATCH /auth/me edita nome/telefone (sem e-mail); sem Bearer → 401', async () => {
    const { app } = buildApp()
    const reg = (await (await app.handle(post('/auth/register', REGISTER_BODY))).json()) as {
      tokens: Tokens
    }
    expect(
      (
        await app.handle(
          new Request('http://localhost/auth/me', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ firstName: 'Hack' }),
          }),
        )
      ).status,
    ).toBe(401)

    const res = await app.handle(
      new Request('http://localhost/auth/me', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${reg.tokens.accessToken}`,
        },
        body: JSON.stringify({ firstName: 'Mariana', phone: '+5511888887777' }),
      }),
    )
    expect(res.status).toBe(200)
    const { user } = (await res.json()) as { user: UserView }
    expect(user.firstName).toBe('Mariana')
    expect(user.phone).toBe('+5511888887777')
    // E-mail intocado (não é editável no self-service).
    expect(user.email).toBe('maria@example.com')
  })

  test('POST /auth/me/password exige a senha atual e revoga sessões', async () => {
    const { app } = buildApp()
    const reg = (await (await app.handle(post('/auth/register', REGISTER_BODY))).json()) as {
      tokens: Tokens
    }
    const auth = { authorization: `Bearer ${reg.tokens.accessToken}` }

    // Senha atual errada → 401.
    expect(
      (
        await app.handle(
          post(
            '/auth/me/password',
            { currentPassword: 'senha-errada-123', newPassword: 'nova-senha-super-secreta' },
            auth,
          ),
        )
      ).status,
    ).toBe(401)

    // Sucesso → sessões revogadas + login só com a nova.
    const res = await app.handle(
      post(
        '/auth/me/password',
        { currentPassword: 'senha-super-secreta', newPassword: 'nova-senha-super-secreta' },
        auth,
      ),
    )
    expect(res.status).toBe(200)
    expect(
      (await app.handle(post('/auth/refresh', { refreshToken: reg.tokens.refreshToken }))).status,
    ).toBe(401)
    expect(
      (
        await app.handle(
          post('/auth/login', { email: 'maria@example.com', password: 'nova-senha-super-secreta' }),
        )
      ).status,
    ).toBe(200)
  })

  test('POST /auth/internal/password-tokens exige o token interno e emite token utilizável', async () => {
    const { app } = buildApp()
    await app.handle(post('/auth/register', REGISTER_BODY))

    // Sem/errado x-internal-token → 401.
    expect(
      (await app.handle(post('/auth/internal/password-tokens', { email: 'maria@example.com' })))
        .status,
    ).toBe(401)
    expect(
      (
        await app.handle(
          post(
            '/auth/internal/password-tokens',
            { email: 'maria@example.com' },
            { 'x-internal-token': 'token-errado' },
          ),
        )
      ).status,
    ).toBe(401)

    // E-mail inexistente → 404 (S2S).
    expect(
      (
        await app.handle(
          post(
            '/auth/internal/password-tokens',
            { email: 'ghost@example.com' },
            { 'x-internal-token': INTERNAL_TOKEN },
          ),
        )
      ).status,
    ).toBe(404)

    // Sucesso → 201 + token que redefine a senha (1º acesso pós-compra).
    const res = await app.handle(
      post(
        '/auth/internal/password-tokens',
        { email: 'maria@example.com' },
        { 'x-internal-token': INTERNAL_TOKEN },
      ),
    )
    expect(res.status).toBe(201)
    const { token, expiresAt } = (await res.json()) as { token: string; expiresAt: string }
    expect(token.length).toBeGreaterThan(10)
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now())

    const reset = await app.handle(
      post('/auth/reset-password', { token, newPassword: 'senha-definida-no-1o-acesso' }),
    )
    expect(reset.status).toBe(200)
    expect(
      (
        await app.handle(
          post('/auth/login', {
            email: 'maria@example.com',
            password: 'senha-definida-no-1o-acesso',
          }),
        )
      ).status,
    ).toBe(200)
  })

  const ENSURE_BODY = {
    email: 'comprador@example.com',
    password: 'senha-dummy-do-funil-1234',
    firstName: 'Carlos',
    lastName: 'Lima',
    source: 'funnel',
  }

  test('POST /auth/internal/ensure-buyer exige o token interno', async () => {
    const { app } = buildApp()
    expect((await app.handle(post('/auth/internal/ensure-buyer', ENSURE_BODY))).status).toBe(401)
    expect(
      (
        await app.handle(
          post('/auth/internal/ensure-buyer', ENSURE_BODY, { 'x-internal-token': 'errado' }),
        )
      ).status,
    ).toBe(401)
  })

  test('POST /auth/internal/ensure-buyer cria (201) e é idempotente (200 com o MESMO userId)', async () => {
    const { app } = buildApp()

    // 1ª chamada: comprador novo → 201 + created:true + userId.
    const first = await app.handle(
      post('/auth/internal/ensure-buyer', ENSURE_BODY, { 'x-internal-token': INTERNAL_TOKEN }),
    )
    expect(first.status).toBe(201)
    const created = (await first.json()) as { userId: string; created: boolean }
    expect(created.created).toBe(true)
    expect(created.userId.length).toBeGreaterThan(0)

    // 2ª chamada (comprador RECORRENTE, mesmo e-mail) → 200 + created:false + MESMO userId.
    const second = await app.handle(
      post('/auth/internal/ensure-buyer', ENSURE_BODY, { 'x-internal-token': INTERNAL_TOKEN }),
    )
    expect(second.status).toBe(200)
    const reused = (await second.json()) as { userId: string; created: boolean }
    expect(reused.created).toBe(false)
    expect(reused.userId).toBe(created.userId)
  })

  test('ensure-buyer reaproveita um usuário pré-existente (e-mail já cadastrado via /auth/register)', async () => {
    const { app } = buildApp()
    const reg = await app.handle(post('/auth/register', REGISTER_BODY))
    const { user } = (await reg.json()) as { user: { id: string } }

    const res = await app.handle(
      post(
        '/auth/internal/ensure-buyer',
        { ...ENSURE_BODY, email: REGISTER_BODY.email },
        { 'x-internal-token': INTERNAL_TOKEN },
      ),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { userId: string; created: boolean }
    expect(body.created).toBe(false)
    expect(body.userId).toBe(user.id)
  })

  test('ensure-buyer faz backfill do telefone quando o usuário existia SEM telefone', async () => {
    const { app, users } = buildApp()
    // Conta pré-existente sem telefone (ex.: criada por convite do admin).
    const semTelefone = { ...REGISTER_BODY, phone: undefined }
    await app.handle(post('/auth/register', semTelefone))

    const res = await app.handle(
      post(
        '/auth/internal/ensure-buyer',
        { ...ENSURE_BODY, email: REGISTER_BODY.email, phone: '11999998888' },
        { 'x-internal-token': INTERNAL_TOKEN },
      ),
    )
    expect(res.status).toBe(200)
    const stored = await users.findByEmail(REGISTER_BODY.email)
    expect(stored?.phone).toBe('11999998888')
  })

  test('ensure-buyer NÃO sobrescreve telefone já cadastrado', async () => {
    const { app, users } = buildApp()
    await app.handle(post('/auth/register', REGISTER_BODY))

    const res = await app.handle(
      post(
        '/auth/internal/ensure-buyer',
        { ...ENSURE_BODY, email: REGISTER_BODY.email, phone: '11888887777' },
        { 'x-internal-token': INTERNAL_TOKEN },
      ),
    )
    expect(res.status).toBe(200)
    const stored = await users.findByEmail(REGISTER_BODY.email)
    expect(stored?.phone).toBe(REGISTER_BODY.phone)
  })
})

describe('Auth OTP (login passwordless + recuperação por código)', () => {
  type FakeMessaging = ReturnType<typeof buildApp>['messaging']
  type App = ReturnType<typeof buildApp>['app']

  /** Pede um OTP e extrai o código de 6 dígitos do envio capturado pelo messaging fake. */
  async function requestCode(
    app: App,
    messaging: FakeMessaging,
    email: string,
    purpose: 'sign_in' | 'password_reset',
  ): Promise<string | undefined> {
    const before = messaging.sent.length
    const res = await app.handle(post('/auth/otp/request', { email, purpose }))
    expect(res.status).toBe(200)
    const sent = messaging.sent.slice(before).find((s) => s.templateKey === 'otp')
    return sent?.variables.codigo
  }

  test('login por OTP: pede o código, verifica e emite tokens', async () => {
    const { app, messaging } = buildApp()
    await app.handle(post('/auth/register', REGISTER_BODY))

    const code = await requestCode(app, messaging, 'maria@example.com', 'sign_in')
    expect(code).toMatch(/^\d{6}$/)

    const res = await app.handle(post('/auth/otp/verify', { email: 'maria@example.com', code }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { user: UserView; tokens: Tokens }
    expect(body.user.email).toBe('maria@example.com')
    expect(body.tokens.accessToken.length).toBeGreaterThan(0)
    expect(body.tokens.refreshToken.length).toBeGreaterThan(0)
  })

  test('código de uso único: o mesmo código não loga duas vezes', async () => {
    const { app, messaging } = buildApp()
    await app.handle(post('/auth/register', REGISTER_BODY))
    const code = await requestCode(app, messaging, 'maria@example.com', 'sign_in')

    expect(
      (await app.handle(post('/auth/otp/verify', { email: 'maria@example.com', code }))).status,
    ).toBe(200)
    // Reuso → 401 (consumido).
    expect(
      (await app.handle(post('/auth/otp/verify', { email: 'maria@example.com', code }))).status,
    ).toBe(401)
  })

  test('código errado → 401; trava após o teto de tentativas (código certo deixa de valer)', async () => {
    const { app, messaging } = buildApp()
    await app.handle(post('/auth/register', REGISTER_BODY))
    const code = await requestCode(app, messaging, 'maria@example.com', 'sign_in')

    for (let i = 0; i < 5; i++) {
      const res = await app.handle(
        post('/auth/otp/verify', { email: 'maria@example.com', code: '000000' }),
      )
      expect(res.status).toBe(401)
    }
    // Esgotou as tentativas → o código original também não vale mais.
    expect(
      (await app.handle(post('/auth/otp/verify', { email: 'maria@example.com', code }))).status,
    ).toBe(401)
  })

  test('anti-enumeração: pedir OTP p/ e-mail inexistente → 200 e NÃO envia nada', async () => {
    const { app, messaging } = buildApp()
    const before = messaging.sent.length
    const res = await app.handle(
      post('/auth/otp/request', { email: 'ghost@example.com', purpose: 'sign_in' }),
    )
    expect(res.status).toBe(200)
    expect(messaging.sent.slice(before)).toHaveLength(0)
  })

  test('recuperação por OTP: redefine a senha e o login passa com a nova', async () => {
    const { app, messaging } = buildApp()
    await app.handle(post('/auth/register', REGISTER_BODY))
    const code = await requestCode(app, messaging, 'maria@example.com', 'password_reset')

    const reset = await app.handle(
      post('/auth/password/reset-otp', {
        email: 'maria@example.com',
        code,
        newPassword: 'nova-senha-por-otp-9999',
      }),
    )
    expect(reset.status).toBe(200)

    expect(
      (
        await app.handle(
          post('/auth/login', { email: 'maria@example.com', password: 'nova-senha-por-otp-9999' }),
        )
      ).status,
    ).toBe(200)
    // A senha antiga não vale mais.
    expect((await app.handle(post('/auth/login', REGISTER_BODY))).status).toBe(401)
  })

  test('OTP de sign_in não serve p/ reset (finalidades isoladas)', async () => {
    const { app, messaging } = buildApp()
    await app.handle(post('/auth/register', REGISTER_BODY))
    const code = await requestCode(app, messaging, 'maria@example.com', 'sign_in')

    const res = await app.handle(
      post('/auth/password/reset-otp', {
        email: 'maria@example.com',
        code,
        newPassword: 'tentando-com-codigo-de-login',
      }),
    )
    expect(res.status).toBe(401)
  })
})

describe('Auth admin routes (/auth/admin/users)', () => {
  const now = new Date()

  function seedUser(
    users: InMemoryUserRepository,
    over: Partial<{
      id: string
      email: string
      firstName: string
      role: UserRole
      status: UserStatus
      version: number
    }> = {},
  ): string {
    const id = over.id ?? crypto.randomUUID()
    users.seed(
      UserAggregate.restore({
        id,
        version: over.version ?? 0,
        email: over.email ?? `u-${id}@example.com`,
        passwordHash: 'hashed:x',
        firstName: over.firstName ?? 'First',
        lastName: 'Last',
        role: over.role ?? 'customer',
        status: over.status ?? 'active',
        phone: null,
        signupSource: null,
        avatarUrl: null,
        createdAt: now,
        updatedAt: now,
      }),
    )
    return id
  }

  // Simula o gateway: injeta o x-internal-token (prova de origem) + X-Auth-User-*.
  function actorHeaders(role: string): Record<string, string> {
    return {
      'x-internal-token': INTERNAL_TOKEN,
      'x-auth-user-id': crypto.randomUUID(),
      'x-auth-user-role': role,
      'x-auth-user-status': 'active',
    }
  }

  function getReq(path: string, headers: Record<string, string> = {}) {
    return new Request(`http://localhost${path}`, { headers })
  }
  function patchReq(path: string, body: unknown, headers: Record<string, string> = {}) {
    return new Request(`http://localhost${path}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
  }

  test('GET /auth/admin/users sem identidade do gateway → 401', async () => {
    const { app } = buildApp()
    expect((await app.handle(getReq('/auth/admin/users'))).status).toBe(401)
  })

  test('GET /auth/admin/users com X-Auth-User-* forjados mas SEM x-internal-token → 401', async () => {
    // Anti-spoof: os X-Auth-User-* só valem acompanhados do token interno que o
    // gateway injeta — sem ele, headers forjados não viram identidade de admin.
    const { app } = buildApp()
    const { 'x-internal-token': _omitted, ...forged } = actorHeaders('superadmin')
    expect((await app.handle(getReq('/auth/admin/users', forged))).status).toBe(401)
    const wrong = { ...actorHeaders('superadmin'), 'x-internal-token': 'token-errado-qualquer' }
    expect((await app.handle(getReq('/auth/admin/users', wrong))).status).toBe(401)
  })

  test('GET /auth/admin/users como customer → 403', async () => {
    const { app } = buildApp()
    const res = await app.handle(getReq('/auth/admin/users', actorHeaders('customer')))
    expect(res.status).toBe(403)
  })

  test('GET /auth/admin/users como staff → 200 (leitura permitida)', async () => {
    const { app, users } = buildApp()
    seedUser(users, { role: 'customer' })
    const res = await app.handle(getReq('/auth/admin/users', actorHeaders('staff')))
    expect(res.status).toBe(200)
    const json = (await res.json()) as { items: UserView[]; total: number }
    expect(json.total).toBeGreaterThanOrEqual(1)
  })

  test('PATCH como staff → 403 (escrita exige admin/superadmin)', async () => {
    const { app, users } = buildApp()
    const id = seedUser(users, { role: 'customer' })
    const res = await app.handle(
      patchReq(`/auth/admin/users/${id}`, { status: 'suspended' }, actorHeaders('staff')),
    )
    expect(res.status).toBe(403)
  })

  test('PATCH admin edita customer → 200 + view atualizada', async () => {
    const { app, users } = buildApp()
    const id = seedUser(users, { role: 'customer', status: 'active' })
    const res = await app.handle(
      patchReq(
        `/auth/admin/users/${id}`,
        { status: 'blocked', firstName: 'Bloqueado' },
        actorHeaders('admin'),
      ),
    )
    expect(res.status).toBe(200)
    const { user } = (await res.json()) as { user: UserView & { version: number } }
    expect(user.status).toBe('blocked')
    expect(user.firstName).toBe('Bloqueado')
    expect(user.version).toBe(1)
  })

  test('PATCH admin promovendo a admin → 403 (guard hierárquico)', async () => {
    const { app, users } = buildApp()
    const id = seedUser(users, { role: 'customer' })
    const res = await app.handle(
      patchReq(`/auth/admin/users/${id}`, { role: 'admin' }, actorHeaders('admin')),
    )
    expect(res.status).toBe(403)
  })

  test('PATCH com version defasada → 409', async () => {
    const { app, users } = buildApp()
    const id = seedUser(users, { role: 'customer', version: 5 })
    const res = await app.handle(
      patchReq(
        `/auth/admin/users/${id}`,
        { status: 'suspended', version: 4 },
        actorHeaders('admin'),
      ),
    )
    expect(res.status).toBe(409)
  })

  test('PATCH alvo inexistente → 404', async () => {
    const { app } = buildApp()
    const res = await app.handle(
      patchReq(
        `/auth/admin/users/${crypto.randomUUID()}`,
        { status: 'suspended' },
        actorHeaders('admin'),
      ),
    )
    expect(res.status).toBe(404)
  })

  test('POST /auth/admin/users/batch hidrata por ids (ignora inexistentes); sem id → 401', async () => {
    const { app, users } = buildApp()
    const id1 = seedUser(users, { email: 'a@example.com' })
    const id2 = seedUser(users, { email: 'b@example.com' })

    expect((await app.handle(post('/auth/admin/users/batch', { ids: [id1] }))).status).toBe(401)

    const res = await app.handle(
      post(
        '/auth/admin/users/batch',
        { ids: [id1, id2, crypto.randomUUID()] },
        actorHeaders('staff'),
      ),
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as { users: UserView[] }
    expect(json.users).toHaveLength(2)
    expect(json.users.map((u) => u.email).sort()).toEqual(['a@example.com', 'b@example.com'])
  })

  test(':id que não é uuid → 400 na borda (não 500 do banco)', async () => {
    const { app } = buildApp()
    expect(
      (await app.handle(getReq('/auth/admin/users/not-a-uuid', actorHeaders('staff')))).status,
    ).toBe(400)
    expect(
      (
        await app.handle(
          patchReq('/auth/admin/users/not-a-uuid', { status: 'suspended' }, actorHeaders('admin')),
        )
      ).status,
    ).toBe(400)
    expect(
      (
        await app.handle(
          post('/auth/admin/users/batch', { ids: ['not-a-uuid'] }, actorHeaders('staff')),
        )
      ).status,
    ).toBe(400)
  })
})

describe('Correções do full review (readyz / cooldown / 413)', () => {
  test('GET /readyz → 200 quando pronto; 503 quando o banco falha', async () => {
    const ok = buildApp()
    const readyRes = await ok.app.handle(new Request('http://localhost/readyz'))
    expect(readyRes.status).toBe(200)
    expect(((await readyRes.json()) as { checks: { db: string } }).checks.db).toBe('ok')

    const down = buildApp({ ready: false })
    const downRes = await down.app.handle(new Request('http://localhost/readyz'))
    expect(downRes.status).toBe(503)
  })

  test('idempotencyKey do OTP vem do uuid do REGISTRO, nunca do código', async () => {
    const { app, messaging, otpCodes } = buildApp()
    await app.handle(post('/auth/register', REGISTER_BODY))
    await app.handle(post('/auth/otp/request', { email: 'maria@example.com', purpose: 'sign_in' }))

    const sent = messaging.sent.find((s) => s.templateKey === 'otp')
    expect(sent).toBeDefined()
    const [recordId] = [...otpCodes.byId.keys()]
    expect(sent?.idempotencyKey).toBe(`otp-${recordId}`)
    // E o uuid não é derivável do código (a chave antiga era sha256(código) truncado).
    expect(sent?.idempotencyKey).toMatch(/^otp-[0-9a-f]{8}-[0-9a-f-]{27}$/)
  })

  test('cooldown do OTP: re-pedido dentro da janela é no-op (não invalida o código vigente)', async () => {
    const { app, messaging, otpCodes } = buildApp({ otpCooldownSeconds: 60 })
    await app.handle(post('/auth/register', REGISTER_BODY))

    const first = await app.handle(
      post('/auth/otp/request', { email: 'maria@example.com', purpose: 'sign_in' }),
    )
    expect(first.status).toBe(200)
    const code = messaging.sent.find((s) => s.templateKey === 'otp')?.variables.codigo

    // Dentro da janela: 200 (anti-enumeração) mas SEM novo e-mail nem novo código.
    const second = await app.handle(
      post('/auth/otp/request', { email: 'maria@example.com', purpose: 'sign_in' }),
    )
    expect(second.status).toBe(200)
    expect(messaging.sent.filter((s) => s.templateKey === 'otp')).toHaveLength(1)

    // O código original continua valendo (não foi consumido pelo re-pedido).
    expect(
      (await app.handle(post('/auth/otp/verify', { email: 'maria@example.com', code }))).status,
    ).toBe(200)

    // Janela vencida → novo pedido emite de novo.
    for (const [id, at] of otpCodes.issuedAt) {
      otpCodes.issuedAt.set(id, new Date(at.getTime() - 61_000))
    }
    await app.handle(post('/auth/otp/request', { email: 'maria@example.com', purpose: 'sign_in' }))
    expect(messaging.sent.filter((s) => s.templateKey === 'otp')).toHaveLength(2)
  })

  test('cooldown do forgot-password: re-pedido na janela não re-envia nem invalida o token', async () => {
    const { app, messaging } = buildApp({ resetCooldownSeconds: 60 })
    await app.handle(post('/auth/register', REGISTER_BODY))

    expect(
      (await app.handle(post('/auth/forgot-password', { email: 'maria@example.com' }))).status,
    ).toBe(200)
    const link = messaging.sent.find((s) => s.templateKey === 'password-reset')?.variables.link
    const token = new URL(String(link)).searchParams.get('token')

    expect(
      (await app.handle(post('/auth/forgot-password', { email: 'maria@example.com' }))).status,
    ).toBe(200)
    expect(messaging.sent.filter((s) => s.templateKey === 'password-reset')).toHaveLength(1)

    // O token do 1º e-mail continua utilizável (o re-pedido não o consumiu).
    const reset = await app.handle(
      post('/auth/reset-password', { token, newPassword: 'senha-nova-pos-cooldown-1' }),
    )
    expect(reset.status).toBe(200)
  })

  test('corpo acima do limite em /refresh e /logout → 413', async () => {
    const { app } = buildApp()
    const oversize = (path: string) => {
      const body = JSON.stringify({ refreshToken: 'x', junk: 'A'.repeat(20_000) })
      return new Request(`http://localhost${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          // O onParse decide pelo Content-Length declarado (como numa request real).
          'content-length': String(Buffer.byteLength(body, 'utf8')),
        },
        body,
      })
    }
    expect((await app.handle(oversize('/auth/refresh'))).status).toBe(413)
    expect((await app.handle(oversize('/auth/logout'))).status).toBe(413)
  })
})

describe('Impersonação (rotas /auth/admin/users/:id/impersonate + /auth/impersonate/exchange)', () => {
  const now = new Date()

  function seedTarget(users: InMemoryUserRepository, role: UserRole = 'customer'): string {
    const id = crypto.randomUUID()
    users.seed(
      UserAggregate.restore({
        id,
        version: 0,
        email: `alvo-${id.slice(0, 8)}@example.com`,
        passwordHash: 'hashed:x',
        firstName: 'Alvo',
        lastName: 'Teste',
        role,
        status: 'active',
        phone: null,
        signupSource: null,
        avatarUrl: null,
        createdAt: now,
        updatedAt: now,
      }),
    )
    return id
  }

  function actorHeaders(role: string, id = crypto.randomUUID()): Record<string, string> {
    return {
      'x-internal-token': INTERNAL_TOKEN,
      'x-auth-user-id': id,
      'x-auth-user-role': role,
      'x-auth-user-status': 'active',
    }
  }

  test('staff não impersona (escrita exige admin/superadmin) → 403; sem gateway → 401', async () => {
    const { app, users } = buildApp()
    const targetId = seedTarget(users)
    expect(
      (
        await app.handle(
          post(`/auth/admin/users/${targetId}/impersonate`, {}, actorHeaders('staff')),
        )
      ).status,
    ).toBe(403)
    expect((await app.handle(post(`/auth/admin/users/${targetId}/impersonate`, {}))).status).toBe(
      401,
    )
  })

  test('fluxo completo: admin emite handoff → exchange devolve sessão do alvo com act', async () => {
    const { app, users, tokenIssuer } = buildApp()
    const adminId = crypto.randomUUID()
    // O ATOR também existe no banco (o exchange o recarrega p/ montar a claim act).
    users.seed(
      UserAggregate.restore({
        id: adminId,
        version: 0,
        email: 'admin@example.com',
        passwordHash: 'hashed:x',
        firstName: 'Admin',
        lastName: 'Suporte',
        role: 'admin',
        status: 'active',
        phone: null,
        signupSource: null,
        avatarUrl: null,
        createdAt: now,
        updatedAt: now,
      }),
    )
    const targetId = seedTarget(users)

    const created = await app.handle(
      post(`/auth/admin/users/${targetId}/impersonate`, {}, actorHeaders('admin', adminId)),
    )
    expect(created.status).toBe(201)
    const handoff = (await created.json()) as {
      token: string
      expiresAt: string
      communityUrl: string
    }
    expect(handoff.communityUrl).toBe(COMMUNITY_URL)
    expect(new Date(handoff.expiresAt).getTime()).toBeGreaterThan(Date.now())

    // `?platform=kids` → a URL devolvida é a do app kids (mesmo handoff/exchange).
    const kidsRes = await app.handle(
      post(
        `/auth/admin/users/${targetId}/impersonate?platform=kids`,
        {},
        actorHeaders('admin', adminId),
      ),
    )
    expect(kidsRes.status).toBe(201)
    expect(((await kidsRes.json()) as { communityUrl: string }).communityUrl).toBe(
      KIDS_COMMUNITY_URL,
    )

    const exchanged = await app.handle(post('/auth/impersonate/exchange', { token: handoff.token }))
    expect(exchanged.status).toBe(200)
    const session = (await exchanged.json()) as {
      user: UserView
      tokens: { accessToken: string; refreshExpiresIn: number }
    }
    expect(session.user.id).toBe(targetId)
    expect(session.tokens.refreshExpiresIn).toBe(60 * 60 * 2)

    const claims = await tokenIssuer.verifyAccessToken(session.tokens.accessToken)
    expect(claims?.sub).toBe(targetId)
    expect(claims?.act?.sub).toBe(adminId)

    // Single-use: o mesmo token de handoff não vale uma 2ª vez.
    expect(
      (await app.handle(post('/auth/impersonate/exchange', { token: handoff.token }))).status,
    ).toBe(401)
  })

  test('admin tentando impersonar admin → 403; alvo inexistente → 404; token lixo → 401', async () => {
    const { app, users } = buildApp()
    const otherAdmin = seedTarget(users, 'admin')
    expect(
      (
        await app.handle(
          post(`/auth/admin/users/${otherAdmin}/impersonate`, {}, actorHeaders('admin')),
        )
      ).status,
    ).toBe(403)
    expect(
      (
        await app.handle(
          post(`/auth/admin/users/${crypto.randomUUID()}/impersonate`, {}, actorHeaders('admin')),
        )
      ).status,
    ).toBe(404)
    expect(
      (await app.handle(post('/auth/impersonate/exchange', { token: 'token-invalido-123456' })))
        .status,
    ).toBe(401)
  })
})

describe('Auth — perfis (estilo Netflix)', () => {
  const ACCOUNT = '11111111-1111-4111-8111-111111111111'
  const OTHER = '22222222-2222-4222-8222-222222222222'

  // Headers que o gateway injeta para uma conta de responsável (customer ativo) +
  // o token interno que prova a origem.
  function gw(accountId = ACCOUNT, extra: Record<string, string> = {}) {
    return {
      'x-internal-token': INTERNAL_TOKEN,
      'x-auth-user-id': accountId,
      'x-auth-user-role': 'customer',
      'x-auth-user-status': 'active',
      ...extra,
    }
  }
  function req(
    method: string,
    path: string,
    headers: Record<string, string>,
    body?: unknown,
  ): Request {
    return new Request(`http://localhost${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  }
  interface Profile {
    id: string
    name: string
    avatarUrl: string | null
    whatsapp: string | null
    sortOrder: number
  }

  test('o teto vem do members: maxProfiles=0 → 409 (a conta não comprou)', async () => {
    const { app, allowance } = buildApp()
    allowance.maxProfiles = 0
    const res = await app.handle(req('POST', '/auth/profiles', gw(), { name: 'Sofia' }))
    expect(res.status).toBe(409)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      'PROFILE_LIMIT_REACHED',
    )
  })

  test('cria até o teto e barra o excedente; a lista volta ordenada', async () => {
    const { app, allowance } = buildApp()
    allowance.maxProfiles = 2
    const a = await app.handle(req('POST', '/auth/profiles', gw(), { name: 'Sofia' }))
    expect(a.status).toBe(201)
    const b = await app.handle(req('POST', '/auth/profiles', gw(), { name: 'Théo' }))
    expect(b.status).toBe(201)
    const c = await app.handle(req('POST', '/auth/profiles', gw(), { name: 'Extra' }))
    expect(c.status).toBe(409)

    const list = (await (await app.handle(req('GET', '/auth/profiles', gw()))).json()) as {
      profiles: Profile[]
    }
    expect(list.profiles.map((p) => p.name)).toEqual(['Sofia', 'Théo'])
  })

  test('editar e arquivar: arquivar libera um slot do teto', async () => {
    const { app, allowance } = buildApp()
    allowance.maxProfiles = 1
    const created = (await (
      await app.handle(req('POST', '/auth/profiles', gw(), { name: 'Sofia' }))
    ).json()) as { profile: Profile }
    const id = created.profile.id

    // Editar nome + WhatsApp.
    const patched = (await (
      await app.handle(
        req('PATCH', `/auth/profiles/${id}`, gw(), { name: 'Sofia Maria', whatsapp: '+55319' }),
      )
    ).json()) as { profile: Profile }
    expect(patched.profile.name).toBe('Sofia Maria')
    expect(patched.profile.whatsapp).toBe('+55319')

    // No teto (1) — não cria outro.
    expect((await app.handle(req('POST', '/auth/profiles', gw(), { name: 'Outro' }))).status).toBe(
      409,
    )
    // Arquivar libera o slot.
    expect((await app.handle(req('DELETE', `/auth/profiles/${id}`, gw()))).status).toBe(200)
    const after = (await (await app.handle(req('GET', '/auth/profiles', gw()))).json()) as {
      profiles: Profile[]
    }
    expect(after.profiles).toHaveLength(0)
    expect((await app.handle(req('POST', '/auth/profiles', gw(), { name: 'Novo' }))).status).toBe(
      201,
    )
  })

  test('ownership: editar/arquivar perfil de OUTRA conta → 404 (não vaza)', async () => {
    const { app, allowance } = buildApp()
    allowance.maxProfiles = 1
    const created = (await (
      await app.handle(req('POST', '/auth/profiles', gw(ACCOUNT), { name: 'Sofia' }))
    ).json()) as { profile: Profile }
    const id = created.profile.id
    expect(
      (await app.handle(req('PATCH', `/auth/profiles/${id}`, gw(OTHER), { name: 'x' }))).status,
    ).toBe(404)
    expect((await app.handle(req('DELETE', `/auth/profiles/${id}`, gw(OTHER)))).status).toBe(404)
    // E a conta de outro não vê o perfil.
    const list = (await (await app.handle(req('GET', '/auth/profiles', gw(OTHER)))).json()) as {
      profiles: Profile[]
    }
    expect(list.profiles).toHaveLength(0)
  })

  test('foto inválida (não http(s)) → 400', async () => {
    const { app, allowance } = buildApp()
    allowance.maxProfiles = 2
    const res = await app.handle(
      req('POST', '/auth/profiles', gw(), { name: 'Sofia', avatarUrl: 'javascript:alert(1)' }),
    )
    expect(res.status).toBe(400)
  })

  test('guardas de origem: sem token interno → 401; sem identidade → 401', async () => {
    const { app, allowance } = buildApp()
    allowance.maxProfiles = 2
    // Sem x-internal-token (GET — sem schema de corpo, o guard de origem corre primeiro).
    const noToken = await app.handle(
      req('GET', '/auth/profiles', {
        'x-auth-user-id': ACCOUNT,
        'x-auth-user-role': 'customer',
        'x-auth-user-status': 'active',
      }),
    )
    expect(noToken.status).toBe(401)
    // Com token interno mas sem identidade do gateway.
    const noUser = await app.handle(
      req('GET', '/auth/profiles', { 'x-internal-token': INTERNAL_TOKEN }),
    )
    expect(noUser.status).toBe(401)
  })
})

describe('Auth — sessão de perfil (PR2)', () => {
  const PROFILE_ID = '33333333-3333-4333-8333-333333333333'

  function req(
    method: string,
    path: string,
    headers: Record<string, string>,
    body?: unknown,
  ): Request {
    return new Request(`http://localhost${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  }
  // Headers que o gateway injeta numa sessão da CONTA (sem x-auth-account-id).
  const gwAccount = (accountId: string) => ({
    'x-internal-token': INTERNAL_TOKEN,
    'x-auth-user-id': accountId,
    'x-auth-user-role': 'customer',
    'x-auth-user-status': 'active',
  })
  // ...e numa sessão de PERFIL (sub = perfil; x-auth-account-id = conta).
  const gwProfile = (profileId: string, accountId: string) => ({
    ...gwAccount(profileId),
    'x-auth-account-id': accountId,
  })

  async function setup() {
    const built = buildApp()
    const reg = (await (await built.app.handle(post('/auth/register', REGISTER_BODY))).json()) as {
      user: { id: string }
    }
    const accountId = reg.user.id
    built.profilesRepo.seed(
      ProfileAggregate.create({ id: PROFILE_ID, accountUserId: accountId, name: 'Sofia' }),
    )
    return { ...built, accountId }
  }

  test('selecionar perfil → sessão de perfil (sub = perfil, claim pfl = {conta, nome})', async () => {
    const { app, accountId } = await setup()
    const res = await app.handle(
      req('POST', `/auth/profiles/${PROFILE_ID}/select`, gwAccount(accountId)),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { tokens: { accessToken: string } }
    const payload = decodeJwt(body.tokens.accessToken)
    expect(payload.sub).toBe(PROFILE_ID)
    expect(payload.pfl).toEqual({ accountId, name: 'Sofia' })
  })

  test('gestão é BLOQUEADA na sessão de perfil (403); listar e selecionar são permitidos', async () => {
    const { app, accountId } = await setup()
    const ph = gwProfile(PROFILE_ID, accountId)
    expect((await app.handle(req('POST', '/auth/profiles', ph, { name: 'Outro' }))).status).toBe(
      403,
    )
    expect(
      (await app.handle(req('PATCH', `/auth/profiles/${PROFILE_ID}`, ph, { name: 'x' }))).status,
    ).toBe(403)
    expect((await app.handle(req('DELETE', `/auth/profiles/${PROFILE_ID}`, ph))).status).toBe(403)
    // Listar resolve a conta do x-auth-account-id → 200.
    expect((await app.handle(req('GET', '/auth/profiles', ph))).status).toBe(200)
    // Trocar de perfil (selecionar) também é livre a partir de uma sessão de perfil.
    expect((await app.handle(req('POST', `/auth/profiles/${PROFILE_ID}/select`, ph))).status).toBe(
      200,
    )
  })

  test('sair do perfil: senha certa → sessão da conta (sem pfl); errada → 401; fora de perfil → 400', async () => {
    const { app, accountId } = await setup()
    const ph = gwProfile(PROFILE_ID, accountId)
    expect(
      (await app.handle(req('POST', '/auth/profile-session/exit', ph, { password: 'errada' })))
        .status,
    ).toBe(401)
    // Sessão da conta (sem x-auth-account-id) não está "num perfil" → 400.
    expect(
      (
        await app.handle(
          req('POST', '/auth/profile-session/exit', gwAccount(accountId), {
            password: REGISTER_BODY.password,
          }),
        )
      ).status,
    ).toBe(400)
    const ok = await app.handle(
      req('POST', '/auth/profile-session/exit', ph, { password: REGISTER_BODY.password }),
    )
    expect(ok.status).toBe(200)
    const payload = decodeJwt(
      ((await ok.json()) as { tokens: { accessToken: string } }).tokens.accessToken,
    )
    expect(payload.sub).toBe(accountId)
    expect(payload.pfl).toBeUndefined()
  })

  test('rotação re-deriva pfl; perfil ARQUIVADO → cai para sessão da conta', async () => {
    const { app, accountId, profilesRepo } = await setup()
    const sel = (await (
      await app.handle(req('POST', `/auth/profiles/${PROFILE_ID}/select`, gwAccount(accountId)))
    ).json()) as { tokens: { refreshToken: string } }
    const r1 = (await (
      await app.handle(post('/auth/refresh', { refreshToken: sel.tokens.refreshToken }))
    ).json()) as { tokens: { accessToken: string; refreshToken: string } }
    expect(decodeJwt(r1.tokens.accessToken).sub).toBe(PROFILE_ID)
    expect(decodeJwt(r1.tokens.accessToken).pfl).toMatchObject({ accountId })

    // Arquiva o perfil e rotaciona de novo → a sessão cai para a conta (sem pfl).
    const profile = await profilesRepo.findById(PROFILE_ID)
    profile?.archive()
    if (profile) await profilesRepo.update(profile)
    const r2 = (await (
      await app.handle(post('/auth/refresh', { refreshToken: r1.tokens.refreshToken }))
    ).json()) as { tokens: { accessToken: string } }
    expect(decodeJwt(r2.tokens.accessToken).sub).toBe(accountId)
    expect(decodeJwt(r2.tokens.accessToken).pfl).toBeUndefined()
  })

  test('ownership: selecionar perfil de OUTRA conta → 404', async () => {
    const { app } = await setup()
    const OTHER = '44444444-4444-4444-8444-444444444444'
    expect(
      (await app.handle(req('POST', `/auth/profiles/${PROFILE_ID}/select`, gwAccount(OTHER))))
        .status,
    ).toBe(404)
  })

  test('admin lista os perfis de uma conta (GET /auth/admin/users/:id/profiles)', async () => {
    const { app, accountId } = await setup() // seeds PROFILE_ID na conta
    const adminHeaders = {
      'x-internal-token': INTERNAL_TOKEN,
      'x-auth-user-id': '99999999-9999-4999-8999-999999999999',
      'x-auth-user-role': 'admin',
      'x-auth-user-status': 'active',
    }
    const res = await app.handle(
      req('GET', `/auth/admin/users/${accountId}/profiles`, adminHeaders),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { profiles: { id: string; name: string }[] }
    expect(body.profiles.map((p) => p.id)).toContain(PROFILE_ID)
  })
})
