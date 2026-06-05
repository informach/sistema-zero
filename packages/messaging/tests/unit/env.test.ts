import { describe, expect, it } from 'bun:test'
import { loadEnv } from '../../src/infrastructure/config/env'

const BASE = {
  DATABASE_URL: 'postgres://localhost:5433/sistemazero',
}

const PROD_OK = {
  ...BASE,
  NODE_ENV: 'production',
  MESSAGING_INTERNAL_TOKEN: 'token-interno',
  MESSAGING_WEBHOOK_TOKEN: 'token-webhook',
}

describe('loadEnv — fail-closed em produção', () => {
  it('dev: tokens opcionais (checagens desligadas)', () => {
    const env = loadEnv(BASE)
    expect(env.MESSAGING_INTERNAL_TOKEN).toBeUndefined()
    expect(env.HOST).toBe('::')
  })

  it('produção sem MESSAGING_INTERNAL_TOKEN → falha no boot', () => {
    expect(() =>
      loadEnv({ ...BASE, NODE_ENV: 'production', MESSAGING_WEBHOOK_TOKEN: 'x' }),
    ).toThrow(/MESSAGING_INTERNAL_TOKEN/)
  })

  it('produção sem MESSAGING_WEBHOOK_TOKEN → falha no boot', () => {
    expect(() =>
      loadEnv({ ...BASE, NODE_ENV: 'production', MESSAGING_INTERNAL_TOKEN: 'x' }),
    ).toThrow(/MESSAGING_WEBHOOK_TOKEN/)
  })

  it('produção com REQUIRE_ADMIN=false → falha no boot', () => {
    expect(() => loadEnv({ ...PROD_OK, REQUIRE_ADMIN: 'false' })).toThrow(/REQUIRE_ADMIN/)
  })

  it('produção com SENDGRID_API_KEY sem a chave pública do webhook → falha no boot', () => {
    expect(() => loadEnv({ ...PROD_OK, SENDGRID_API_KEY: 'SG.x' })).toThrow(
      /SENDGRID_WEBHOOK_PUBLIC_KEY/,
    )
  })

  it('produção completa → ok', () => {
    const env = loadEnv({
      ...PROD_OK,
      SENDGRID_API_KEY: 'SG.x',
      SENDGRID_WEBHOOK_PUBLIC_KEY: 'chave-publica',
    })
    expect(env.NODE_ENV).toBe('production')
    expect(env.SEND_CLAIM_LEASE_MS).toBe(600_000)
  })
})
