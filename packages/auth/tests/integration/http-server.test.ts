import { describe, expect, test } from 'bun:test'
import { GetMeService } from '../../src/application/get-me/get-me.service'
import { LoginService } from '../../src/application/login/login.service'
import { LogoutService } from '../../src/application/logout/logout.service'
import { RefreshService } from '../../src/application/refresh/refresh.service'
import { RegisterService } from '../../src/application/register/register.service'
import { AuthTokenService } from '../../src/application/tokens/auth-token.service'
import { UserAggregate } from '../../src/domain/user/user.aggregate'
import { Email } from '../../src/domain/value-objects/email'
import type { Env } from '../../src/infrastructure/config/env'
import { createServer } from '../../src/interfaces/http/server'
import {
  fakeHasher,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
  silentLogger,
} from '../fakes/in-memory'
import { testTokenIssuer } from '../helpers'

function buildApp() {
  const users = new InMemoryUserRepository()
  const refreshTokens = new InMemoryRefreshTokenRepository()
  const tokenIssuer = testTokenIssuer()
  const authTokens = new AuthTokenService(tokenIssuer, refreshTokens, { refreshTtlDays: 30 })

  const register = new RegisterService(
    users,
    fakeHasher,
    authTokens,
    { passwordMinLength: 10 },
    silentLogger,
  )
  const login = new LoginService(users, fakeHasher, authTokens, {})
  const refresh = new RefreshService(users, refreshTokens, authTokens, silentLogger)
  const logout = new LogoutService(refreshTokens)
  const getMe = new GetMeService(users)

  const env = {
    MAX_REQUEST_BODY_BYTES: 16 * 1024,
    NODE_ENV: 'test',
    TRUST_PROXY: false,
    TRUSTED_PROXY_HOPS: 1,
  } as unknown as Env

  const app = createServer({
    env,
    logger: silentLogger,
    tokenIssuer,
    register,
    login,
    refresh,
    logout,
    getMe,
  })
  return { app, users, refreshTokens, tokenIssuer }
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
