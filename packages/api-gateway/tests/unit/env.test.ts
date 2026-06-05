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
  AUTH_INTERNAL_TOKEN: 'auth-internal-16-chars!',
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
    'AUTH_INTERNAL_TOKEN',
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
})
