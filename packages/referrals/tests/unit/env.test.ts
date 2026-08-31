import { describe, expect, test } from 'bun:test'
import { loadEnv } from '../../src/infrastructure/config/env'

const SECRET = 'x'.repeat(32)

/**
 * Base VÁLIDA de produção; cada teste tweaka UM campo p/ provar um refine.
 * Overrides vencem o process.env (o bun test auto-carrega .env).
 */
function prodEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    NODE_ENV: 'production',
    APP_ENV: 'staging',
    DATABASE_URL: 'postgres://postgres:postgres@postgres.railway.internal:5432/sistemazero',
    GATEWAY_URL: 'http://api-gateway.railway.internal:3000',
    REFERRALS_HMAC_SECRET: SECRET,
    INTERNAL_API_TOKEN: SECRET,
    METRICS_TOKEN: SECRET,
    FUNNEL_PUBLIC_URL: 'https://sistemazero.com.br',
    KIDS_COMMUNITY_URL: 'https://kids.sistemazero.com.br',
    REQUIRE_ADMIN: 'true',
    ...overrides,
  }
}

describe('env do referrals', () => {
  test('produção válida passa', () => {
    const env = loadEnv(prodEnv())
    expect(env.PORT).toBe(3012)
    expect(env.HOST).toBe('::')
    expect(env.SCHOLARSHIP_OFFER_SLUG).toBe('desafio-primeiro-jogo')
  })

  test('dev mínimo passa (só DATABASE_URL)', () => {
    const env = loadEnv({
      NODE_ENV: 'test',
      APP_ENV: undefined,
      DATABASE_URL: 'postgres://localhost:5433/x',
      GATEWAY_URL: undefined,
      REFERRALS_HMAC_SECRET: undefined,
      INTERNAL_API_TOKEN: undefined,
      METRICS_TOKEN: undefined,
      FUNNEL_PUBLIC_URL: undefined,
      KIDS_COMMUNITY_URL: undefined,
      REQUIRE_ADMIN: undefined,
    })
    expect(env.REQUIRE_ADMIN).toBe(true)
  })

  test('produção sem APP_ENV falha', () => {
    expect(() => loadEnv(prodEnv({ APP_ENV: undefined }))).toThrow(/APP_ENV/)
  })

  test('produção com REQUIRE_ADMIN=false falha', () => {
    expect(() => loadEnv(prodEnv({ REQUIRE_ADMIN: 'false' }))).toThrow(/REQUIRE_ADMIN/)
  })

  test('produção sem os tokens/segredos falha', () => {
    expect(() => loadEnv(prodEnv({ INTERNAL_API_TOKEN: undefined }))).toThrow(/obrigatórios/)
    expect(() => loadEnv(prodEnv({ METRICS_TOKEN: undefined }))).toThrow(/obrigatórios/)
    expect(() => loadEnv(prodEnv({ GATEWAY_URL: undefined }))).toThrow(/obrigatórios/)
    expect(() => loadEnv(prodEnv({ REFERRALS_HMAC_SECRET: undefined }))).toThrow(/obrigatórios/)
  })

  test('produção com URL pública loopback falha', () => {
    expect(() => loadEnv(prodEnv({ FUNNEL_PUBLIC_URL: 'http://localhost:4321' }))).toThrow(
      /FUNNEL_PUBLIC_URL/,
    )
    expect(() => loadEnv(prodEnv({ KIDS_COMMUNITY_URL: 'http://127.0.0.1:3008' }))).toThrow(
      /KIDS_COMMUNITY_URL/,
    )
    expect(() => loadEnv(prodEnv({ GATEWAY_URL: 'http://localhost:3000' }))).toThrow(/GATEWAY_URL/)
  })

  test('lease que não cobre as chamadas S2S falha', () => {
    expect(() => loadEnv(prodEnv({ REDEMPTION_LEASE_MS: '10000' }))).toThrow(/REDEMPTION_LEASE_MS/)
  })

  test('segredo curto falha', () => {
    expect(() => loadEnv(prodEnv({ REFERRALS_HMAC_SECRET: 'curto' }))).toThrow()
  })
})
