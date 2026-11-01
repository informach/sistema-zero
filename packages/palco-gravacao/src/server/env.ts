import 'server-only'
import { z } from 'zod'

/**
 * As variáveis do palco: o gateway do ambiente (o staging) e a verificação do token da equipe,
 * as mesmas do admin. Lidas na hora do uso, nunca no carregamento do módulo (o build roda sem
 * elas).
 */
const schema = z.object({
  GATEWAY_URL: z.url().default('http://localhost:3000'),
  JWT_JWKS_URL: z.url().optional(),
  JWT_HS256_SECRET: z.string().min(16).optional(),
  JWT_ISSUER: z.string().min(1).optional(),
  JWT_AUDIENCE: z.string().min(1).optional(),
})

export type PalcoEnv = z.infer<typeof schema>

let cached: PalcoEnv | undefined

export function getEnv(): PalcoEnv {
  cached ??= schema.parse({
    GATEWAY_URL: process.env.GATEWAY_URL || undefined,
    JWT_JWKS_URL: process.env.JWT_JWKS_URL || undefined,
    JWT_HS256_SECRET: process.env.JWT_HS256_SECRET || undefined,
    JWT_ISSUER: process.env.JWT_ISSUER || undefined,
    JWT_AUDIENCE: process.env.JWT_AUDIENCE || undefined,
  })
  return cached
}

export const isProd = (): boolean => process.env.NODE_ENV === 'production'
