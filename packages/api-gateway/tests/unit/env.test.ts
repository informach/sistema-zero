import { describe, expect, test } from 'bun:test'
import { loadEnv } from '../../src/infrastructure/config/env'

/** Env de produção COMPLETA (todos os fail-fast satisfeitos). */
const PROD_OK: Record<string, string> = {
  NODE_ENV: 'production',
  TRUST_PROXY: 'true',
  METRICS_TOKEN: 'metrics-token-com-16-chars',
  MEMBERS_INTERNAL_TOKEN: 'members-internal-16chars',
  CATALOG_INTERNAL_TOKEN: 'catalog-internal-16chars',
  MESSAGING_INTERNAL_TOKEN: 'messaging-internal-16ch',
  AUTH_HMAC_SECRET: 'auth-hmac-secret-16chrs',
  AUTH_INTERNAL_TOKEN: 'auth-internal-16-chars!',
  PAYMENTS_INTERNAL_TOKEN: 'payments-internal-16chrs',
  FISCAL_INTERNAL_TOKEN: 'fiscal-internal-16chrs',
  FISCAL_HMAC_SECRET: 'fiscal-hmac-secret-16chrs',
  HUB_INTERNAL_TOKEN: 'hub-internal-16-chars-ok',
  MARKETING_INTERNAL_TOKEN: 'marketing-internal-16ch!',
  MARKETING_HMAC_SECRET: 'marketing-hmac-secret-16',
  PAYMENTS_URL: 'http://payments.railway.internal:3001',
  AUTH_URL: 'http://auth.railway.internal:3002',
  FUNNEL_URL: 'http://funnel.railway.internal:4321',
  CATALOG_URL: 'http://catalog.railway.internal:3003',
  MEMBERS_URL: 'http://members.railway.internal:3004',
  MESSAGING_URL: 'http://messaging.railway.internal:3006',
  FISCAL_URL: 'http://fiscal.railway.internal:3009',
  HUB_URL: 'http://hub.railway.internal:3010',
}

describe('loadEnv — defaults de dev', () => {
  test('vazio → ok (tokens ausentes, TRUST_PROXY=false)', () => {
    const env = loadEnv({})
    expect(env.NODE_ENV).toBe('development')
    expect(env.TRUST_PROXY).toBe(false)
    expect(env.METRICS_TOKEN).toBeUndefined()
  })

  test('token interno vazio ("") é tratado como ausente (igual ao gateway.config.ts)', () => {
    const env = loadEnv({ MEMBERS_INTERNAL_TOKEN: '', CATALOG_INTERNAL_TOKEN: '   ' })
    expect(env.MEMBERS_INTERNAL_TOKEN).toBeUndefined()
    expect(env.CATALOG_INTERNAL_TOKEN).toBeUndefined()
  })

  test('token interno curto (<16) falha mesmo em dev', () => {
    expect(() => loadEnv({ MESSAGING_INTERNAL_TOKEN: 'curto' })).toThrow(/16 caracteres/)
  })

  test('segredos de assinatura fracos falham no boot', () => {
    expect(() => loadEnv({ GATEWAY_HMAC_SECRET: 'curto' })).toThrow(/16 caracteres/)
    expect(() => loadEnv({ JWT_HS256_SECRET: 'curto' })).toThrow(/32 caracteres/)
  })
})

describe('loadEnv — fail-fast de produção', () => {
  test('produção completa → ok', () => {
    const env = loadEnv(PROD_OK)
    expect(env.NODE_ENV).toBe('production')
    expect(env.METRICS_TOKEN).toBe(PROD_OK.METRICS_TOKEN as string)
  })

  test('sem METRICS_TOKEN → falha nomeando a variável', () => {
    const { METRICS_TOKEN: _omit, ...rest } = PROD_OK
    expect(() => loadEnv(rest)).toThrow(/METRICS_TOKEN.*obrigatório em produção/)
  })

  test.each([
    'MEMBERS_INTERNAL_TOKEN',
    'CATALOG_INTERNAL_TOKEN',
    'MESSAGING_INTERNAL_TOKEN',
    'AUTH_HMAC_SECRET',
    'AUTH_INTERNAL_TOKEN',
    'PAYMENTS_INTERNAL_TOKEN',
    'FISCAL_INTERNAL_TOKEN',
    'FISCAL_HMAC_SECRET',
    'HUB_INTERNAL_TOKEN',
    'MARKETING_INTERNAL_TOKEN',
    'MARKETING_HMAC_SECRET',
  ])('sem %s → falha (injeção silenciosamente desligada não sobe em prod)', (key) => {
    const source = { ...PROD_OK }
    delete source[key]
    expect(() => loadEnv(source)).toThrow(new RegExp(`${key}.*obrigatório em produção`))
  })

  test('TRUST_PROXY ausente em produção → falha (decisão deve ser explícita)', () => {
    const { TRUST_PROXY: _omit, ...rest } = PROD_OK
    expect(() => loadEnv(rest)).toThrow(/TRUST_PROXY/)
  })

  test('TRUST_PROXY=false EXPLÍCITO em produção → ok (tráfego direto/rede privada)', () => {
    const env = loadEnv({ ...PROD_OK, TRUST_PROXY: 'false' })
    expect(env.TRUST_PROXY).toBe(false)
  })

  test('URL de upstream em loopback em produção → falha no boot', () => {
    expect(() => loadEnv({ ...PROD_OK, MEMBERS_URL: 'http://localhost:3004' })).toThrow(
      /MEMBERS_URL.*loopback/,
    )
    expect(() => loadEnv({ ...PROD_OK, FISCAL_URL: 'http://127.0.0.1:3009' })).toThrow(
      /FISCAL_URL.*loopback/,
    )
  })

  test('SHUTDOWN_DRAIN_MS sem env em produção → default 5s (drain do SIGTERM precisa valer)', () => {
    expect(loadEnv(PROD_OK).SHUTDOWN_DRAIN_MS).toBe(5_000)
    // Valor explícito do operador (inclusive 0) é respeitado.
    expect(loadEnv({ ...PROD_OK, SHUTDOWN_DRAIN_MS: '0' }).SHUTDOWN_DRAIN_MS).toBe(0)
    expect(loadEnv({ ...PROD_OK, SHUTDOWN_DRAIN_MS: '8000' }).SHUTDOWN_DRAIN_MS).toBe(8_000)
    // Fora de produção o default segue 0 (dev/local sem espera).
    expect(loadEnv({}).SHUTDOWN_DRAIN_MS).toBe(0)
  })

  test('MAX_REQUEST_BODY_BYTES default 2 MB (lotes de webhook da SendGrid)', () => {
    expect(loadEnv({}).MAX_REQUEST_BODY_BYTES).toBe(2 * 1024 * 1024)
  })
})
