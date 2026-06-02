import { createPublicKey } from 'node:crypto'
import type { Logger } from '@sistemazero/core/logging'
import { exportJWK, generateKeyPair, importJWK, importPKCS8 } from 'jose'
import type { JsonWebKeySet } from '../../domain/ports/token-issuer.port'
import type { Env } from '../config/env'

/** Material de assinatura/verificação resolvido no boot a partir do env. */
export interface SigningMaterial {
  alg: 'HS256' | 'RS256'
  kid?: string
  /** Chave de assinatura: segredo (HS256) ou chave privada (RS256). */
  signKey: CryptoKey | Uint8Array
  /** Chave de verificação: mesmo segredo (HS256) ou chave pública (RS256). */
  verifyKey: CryptoKey | Uint8Array
  /** JWKS público (RS256) para o gateway verificar; vazio em HS256. */
  jwks: JsonWebKeySet
}

/** PEM em env costuma vir com `\n` literais — normaliza para quebras reais. */
function normalizePem(pem: string): string {
  return pem.includes('\\n') ? pem.replace(/\\n/g, '\n') : pem
}

/**
 * Resolve o material de assinatura conforme `JWT_ALG`:
 * - HS256: segredo simétrico (compartilhado com o gateway).
 * - RS256: chave privada (PKCS#8) + JWKS público derivado. Sem chave em dev →
 *   gera um par efêmero (em produção o boot já exigiu a chave).
 */
export async function loadSigningMaterial(env: Env, logger?: Logger): Promise<SigningMaterial> {
  if (env.JWT_ALG === 'HS256') {
    // Presença/tamanho garantidos pelo refine do env.
    const secret = new TextEncoder().encode(env.JWT_HS256_SECRET ?? '')
    return { alg: 'HS256', signKey: secret, verifyKey: secret, jwks: { keys: [] } }
  }

  const kid = env.JWT_KID

  if (env.JWT_PRIVATE_KEY?.trim()) {
    const privatePem = normalizePem(env.JWT_PRIVATE_KEY)
    const signKey = await importPKCS8(privatePem, 'RS256')
    const publicSource = env.JWT_PUBLIC_KEY?.trim() ? normalizePem(env.JWT_PUBLIC_KEY) : privatePem
    const publicJwk = await derivePublicJwk(publicSource, kid)
    const verifyKey = (await importJWK(publicJwk, 'RS256')) as CryptoKey
    return { alg: 'RS256', kid, signKey, verifyKey, jwks: { keys: [publicJwk] } }
  }

  // Dev: par efêmero (produção é barrada no refine do env).
  logger?.warn('auth.jwt.ephemeral_key', {
    message:
      'RS256 sem JWT_PRIVATE_KEY — gerando par efêmero (apenas dev). Os tokens não sobrevivem a um restart.',
  })
  const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true })
  const jwk = await exportJWK(publicKey)
  return {
    alg: 'RS256',
    kid,
    signKey: privateKey,
    verifyKey: publicKey,
    jwks: { keys: [{ ...jwk, kid, alg: 'RS256', use: 'sig' }] },
  }
}

/** Deriva o JWK público (com kid/alg/use) a partir de um PEM (privado ou público). */
async function derivePublicJwk(pem: string, kid: string): Promise<Record<string, unknown>> {
  const publicKeyObject = createPublicKey({ key: pem, format: 'pem' })
  const jwk = await exportJWK(publicKeyObject)
  return { ...jwk, kid, alg: 'RS256', use: 'sig' }
}
