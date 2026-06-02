import { describe, expect, test } from 'bun:test'
import { importJWK, jwtVerify } from 'jose'
import { UserAggregate } from '../../src/domain/user/user.aggregate'
import { Email } from '../../src/domain/value-objects/email'
import type { Env } from '../../src/infrastructure/config/env'
import { createJoseTokenIssuer } from '../../src/infrastructure/security/jose-token-issuer'
import { loadSigningMaterial } from '../../src/infrastructure/security/keys'
import { hs256Signing, TEST_AUDIENCE, TEST_ISSUER } from '../helpers'

function makeUser() {
  return UserAggregate.register({
    id: crypto.randomUUID(),
    email: Email.create('joao@example.com'),
    passwordHash: 'irrelevante',
    firstName: 'João',
    lastName: 'Souza',
    phone: '+5511999',
    signupSource: 'web',
  })
}

describe('TokenIssuer (HS256)', () => {
  const issuer = createJoseTokenIssuer({
    signing: hs256Signing(),
    issuer: TEST_ISSUER,
    audience: TEST_AUDIENCE,
    accessTtlSeconds: 900,
  })

  test('issue + verify roundtrip carrega as claims de identidade', async () => {
    const user = makeUser()
    const { token, expiresInSeconds } = await issuer.issueAccessToken(user)
    expect(expiresInSeconds).toBe(900)

    const claims = await issuer.verifyAccessToken(token)
    expect(claims?.sub).toBe(user.id)
    expect(claims?.email).toBe('joao@example.com')
    expect(claims?.firstName).toBe('João')
    expect(claims?.role).toBe('customer')
    expect(claims?.status).toBe('active')
    expect(claims?.phone).toBe('+5511999')
    expect(claims?.signupSource).toBe('web')
  })

  test('token adulterado → null', async () => {
    const { token } = await issuer.issueAccessToken(makeUser())
    expect(await issuer.verifyAccessToken(`${token}x`)).toBeNull()
  })

  test('lixo → null', async () => {
    expect(await issuer.verifyAccessToken('not.a.jwt')).toBeNull()
  })

  test('jwks vazio em HS256', () => {
    expect(issuer.jwks()).toEqual({ keys: [] })
  })
})

describe('TokenIssuer (RS256 + JWKS)', () => {
  test('token é verificável pela chave pública da JWKS (caminho do gateway)', async () => {
    const env = {
      JWT_ALG: 'RS256',
      JWT_ISSUER: TEST_ISSUER,
      JWT_AUDIENCE: TEST_AUDIENCE,
      JWT_KID: 'auth-key-1',
      NODE_ENV: 'test',
    } as unknown as Env
    const signing = await loadSigningMaterial(env)
    const issuer = createJoseTokenIssuer({
      signing,
      issuer: TEST_ISSUER,
      audience: TEST_AUDIENCE,
      accessTtlSeconds: 900,
    })

    const { token } = await issuer.issueAccessToken(makeUser())
    const jwks = issuer.jwks()
    expect(jwks.keys.length).toBe(1)

    // Verifica com a chave pública exportada (como o gateway faria via JWKS).
    const [jwk] = jwks.keys
    const publicKey = await importJWK(jwk as Record<string, unknown>, 'RS256')
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: TEST_ISSUER,
      audience: TEST_AUDIENCE,
    })
    expect(payload.sub).toBeTruthy()
    expect(payload.role).toBe('customer')

    // E o próprio emissor também verifica.
    expect((await issuer.verifyAccessToken(token))?.role).toBe('customer')
  })
})
