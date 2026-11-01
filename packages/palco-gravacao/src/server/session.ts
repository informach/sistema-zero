import {
  createRemoteJWKSet,
  errors,
  type JWTVerifyGetKey,
  type JWTVerifyOptions,
  jwtVerify,
} from 'jose'
import { type StaffUser, staffFromClaims } from '../lib/staff'
import { getEnv } from './env'

export type { StaffUser }

/**
 * Quem entra no palco: a conta da equipe (superadmin, admin ou staff, ativa), com o token de
 * acesso do auth, verificado como o admin verifica (HS256 em desenvolvimento, RS256 pelo JWKS no
 * staging). Uma sessão de impersonação (claim `act`) nunca entra, nem a de um perfil do Kids.
 */

export const ACCESS_COOKIE = 'palco_access'
export const REFRESH_COOKIE = 'palco_refresh'

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined

function verificationKey(): JWTVerifyGetKey {
  const env = getEnv()
  const secret = env.JWT_HS256_SECRET ? new TextEncoder().encode(env.JWT_HS256_SECRET) : undefined
  return (protectedHeader, token) => {
    if ((protectedHeader.alg ?? '').startsWith('HS')) {
      if (!secret) throw new Error('Token HS256 sem JWT_HS256_SECRET configurado')
      return Promise.resolve(secret)
    }
    if (!env.JWT_JWKS_URL) throw new Error('Token assimétrico sem JWT_JWKS_URL configurado')
    jwks ??= createRemoteJWKSet(new URL(env.JWT_JWKS_URL))
    return jwks(protectedHeader, token)
  }
}

function verifyOptions(): JWTVerifyOptions {
  const env = getEnv()
  const algorithms: string[] = []
  if (env.JWT_JWKS_URL) algorithms.push('RS256')
  if (env.JWT_HS256_SECRET) algorithms.push('HS256')
  return {
    algorithms,
    ...(env.JWT_ISSUER ? { issuer: env.JWT_ISSUER } : {}),
    ...(env.JWT_AUDIENCE ? { audience: env.JWT_AUDIENCE } : {}),
  }
}

export type AccessVerdict = { ok: true; user: StaffUser } | { ok: false; expired: boolean }

/** Verificação estrita: assinatura, validade, emissor e público, e o papel da equipe. */
export async function verifyAccess(token: string | undefined): Promise<AccessVerdict> {
  if (!token) return { ok: false, expired: false }
  try {
    const { payload } = await jwtVerify(token, verificationKey(), verifyOptions())
    const user = staffFromClaims(payload)
    return user ? { ok: true, user } : { ok: false, expired: false }
  } catch (error) {
    return { ok: false, expired: error instanceof errors.JWTExpired }
  }
}
