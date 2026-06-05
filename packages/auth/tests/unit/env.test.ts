import { describe, expect, test } from 'bun:test'
import { loadEnv } from '../../src/infrastructure/config/env'

/** Base mínima válida (HS256 com segredo forte + banco). */
const BASE: Record<string, string> = {
  DATABASE_URL: 'postgres://postgres:postgres@localhost:5433/sistemazero',
  JWT_HS256_SECRET: 'um-segredo-de-teste-com-32-ou-mais!!',
}

describe('loadEnv', () => {
  test('defaults: HOST dual-stack e cooldowns de 60s', () => {
    const env = loadEnv(BASE)
    expect(env.HOST).toBe('::')
    expect(env.OTP_REQUEST_COOLDOWN_SECONDS).toBe(60)
    expect(env.RESET_REQUEST_COOLDOWN_SECONDS).toBe(60)
  })

  test('produção SEM AUTH_INTERNAL_TOKEN → falha no boot (fail-closed)', () => {
    expect(() => loadEnv({ ...BASE, NODE_ENV: 'production' })).toThrow(/AUTH_INTERNAL_TOKEN/)
  })

  test('produção com AUTH_INTERNAL_TOKEN curto (<16) → falha no boot', () => {
    expect(() =>
      loadEnv({ ...BASE, NODE_ENV: 'production', AUTH_INTERNAL_TOKEN: 'curto' }),
    ).toThrow(/AUTH_INTERNAL_TOKEN/)
  })

  test('produção com AUTH_INTERNAL_TOKEN forte → ok', () => {
    const env = loadEnv({
      ...BASE,
      NODE_ENV: 'production',
      AUTH_INTERNAL_TOKEN: 'token-interno-forte-de-producao',
    })
    expect(env.AUTH_INTERNAL_TOKEN).toBe('token-interno-forte-de-producao')
  })

  test('dev/test SEM AUTH_INTERNAL_TOKEN → ok (checagem desligada fora de produção)', () => {
    expect(() => loadEnv(BASE)).not.toThrow()
  })

  test('HS256 sem segredo forte → falha no boot (invariante pré-existente)', () => {
    expect(() => loadEnv({ DATABASE_URL: BASE.DATABASE_URL as string })).toThrow(/JWT_HS256_SECRET/)
  })
})
