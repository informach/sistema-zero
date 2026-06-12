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
  METRICS_TOKEN: 'token-de-metricas-16',
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

  it('produção sem METRICS_TOKEN → falha no boot', () => {
    const { METRICS_TOKEN: _omit, ...semMetrics } = PROD_OK
    expect(() => loadEnv(semMetrics)).toThrow(/METRICS_TOKEN/)
  })

  it('EVOLUTION_URL sem EVOLUTION_API_KEY (e vice-versa) → falha no boot', () => {
    expect(() => loadEnv({ ...BASE, EVOLUTION_URL: 'http://localhost:8080' })).toThrow(
      /EVOLUTION_API_KEY/,
    )
    expect(() => loadEnv({ ...BASE, EVOLUTION_API_KEY: 'chave' })).toThrow(/EVOLUTION_API_KEY/)
  })

  it('anexos: defaults seguros (5MB; allowlist vazia = dev liberado)', () => {
    const env = loadEnv(BASE)
    expect(env.ATTACHMENT_MAX_BYTES).toBe(5 * 1024 * 1024)
    expect(env.ATTACHMENT_FETCH_ALLOWED_HOSTS).toEqual([])
  })

  it('anexos: CSV de hosts é aparado, minúsculo e ignora entradas vazias', () => {
    const env = loadEnv({
      ...BASE,
      ATTACHMENT_FETCH_ALLOWED_HOSTS: ' Fiscal.Railway.Internal , ,outro.host,',
    })
    expect(env.ATTACHMENT_FETCH_ALLOWED_HOSTS).toEqual(['fiscal.railway.internal', 'outro.host'])
  })

  it('ATTACHMENT_MAX_BYTES inválido → falha no boot', () => {
    expect(() => loadEnv({ ...BASE, ATTACHMENT_MAX_BYTES: 'muito' })).toThrow(
      /ATTACHMENT_MAX_BYTES/,
    )
    expect(() => loadEnv({ ...BASE, ATTACHMENT_MAX_BYTES: '0' })).toThrow(/ATTACHMENT_MAX_BYTES/)
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
