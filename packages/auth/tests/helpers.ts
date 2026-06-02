import type { TokenIssuer } from '../src/domain/ports/token-issuer.port'
import { createJoseTokenIssuer } from '../src/infrastructure/security/jose-token-issuer'
import type { SigningMaterial } from '../src/infrastructure/security/keys'

/** Segredo HS256 de teste (≥ 32 bytes, como exige o jose para HS256). */
export const TEST_HS256_SECRET = 'test-secret-with-at-least-32-bytes!!'
export const TEST_ISSUER = 'sistemazero-auth'
export const TEST_AUDIENCE = 'sistemazero'

export function hs256Signing(): SigningMaterial {
  const secret = new TextEncoder().encode(TEST_HS256_SECRET)
  return { alg: 'HS256', signKey: secret, verifyKey: secret, jwks: { keys: [] } }
}

export function testTokenIssuer(accessTtlSeconds = 900): TokenIssuer {
  return createJoseTokenIssuer({
    signing: hs256Signing(),
    issuer: TEST_ISSUER,
    audience: TEST_AUDIENCE,
    accessTtlSeconds,
  })
}
