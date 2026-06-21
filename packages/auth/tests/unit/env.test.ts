import { describe, expect, test } from 'bun:test'
import { loadEnv } from '../../src/infrastructure/config/env'

/** Base mínima válida (HS256 com segredo forte + banco). */
const BASE: Record<string, string> = {
  DATABASE_URL: 'postgres://postgres:postgres@localhost:5433/sistemazero',
  JWT_HS256_SECRET: 'um-segredo-de-teste-com-32-ou-mais!!',
}

/** Base de PRODUÇÃO válida: produção exige também messaging + COMMUNITY_URL real. */
const PROD_BASE: Record<string, string> = {
  ...BASE,
  NODE_ENV: 'production',
  AUTH_INTERNAL_TOKEN: 'token-interno-forte-de-producao',
  GATEWAY_URL: 'https://gateway.example.com',
  AUTH_HMAC_SECRET: 'segredo-hmac-de-producao!',
  COMMUNITY_URL: 'https://comunidade.example.com',
  MEMBERS_BASE_URL: 'http://members.railway.internal:3004',
  MEMBERS_INTERNAL_TOKEN: 'token-interno-members-de-producao',
}

describe('loadEnv', () => {
  test('defaults: HOST dual-stack e cooldowns de 60s', () => {
    const env = loadEnv(BASE)
    expect(env.HOST).toBe('::')
    expect(env.OTP_REQUEST_COOLDOWN_SECONDS).toBe(60)
    expect(env.RESET_REQUEST_COOLDOWN_SECONDS).toBe(60)
  })

  test('produção SEM AUTH_INTERNAL_TOKEN → falha no boot (fail-closed)', () => {
    const { AUTH_INTERNAL_TOKEN: _omitted, ...rest } = PROD_BASE
    expect(() => loadEnv(rest)).toThrow(/AUTH_INTERNAL_TOKEN/)
  })

  test('produção com AUTH_INTERNAL_TOKEN curto (<16) → falha no boot', () => {
    expect(() => loadEnv({ ...PROD_BASE, AUTH_INTERNAL_TOKEN: 'curto' })).toThrow(
      /AUTH_INTERNAL_TOKEN/,
    )
  })

  test('produção com config completa → ok', () => {
    const env = loadEnv(PROD_BASE)
    expect(env.AUTH_INTERNAL_TOKEN).toBe('token-interno-forte-de-producao')
  })

  test('produção SEM MEMBERS_INTERNAL_TOKEN → falha no boot (allowance S2S exige o token)', () => {
    const { MEMBERS_INTERNAL_TOKEN: _omitted, ...rest } = PROD_BASE
    expect(() => loadEnv(rest)).toThrow(/MEMBERS_INTERNAL_TOKEN/)
  })

  test('produção com MEMBERS_BASE_URL localhost → falha no boot', () => {
    expect(() => loadEnv({ ...PROD_BASE, MEMBERS_BASE_URL: 'http://localhost:3004' })).toThrow(
      /MEMBERS_BASE_URL/,
    )
  })

  test('produção SEM messaging (GATEWAY_URL/AUTH_HMAC_SECRET) → falha no boot', () => {
    // Sem o messaging configurado o envio de e-mail vira no-op SILENCIOSO
    // (reset/OTP/convite respondem 200 sem nunca enviar nada).
    const { GATEWAY_URL: _g, ...semGateway } = PROD_BASE
    expect(() => loadEnv(semGateway)).toThrow(/GATEWAY_URL/)
    const { AUTH_HMAC_SECRET: _s, ...semSecret } = PROD_BASE
    expect(() => loadEnv(semSecret)).toThrow(/GATEWAY_URL e AUTH_HMAC_SECRET/)
  })

  test('produção com GATEWAY_URL localhost → falha no boot', () => {
    expect(() => loadEnv({ ...PROD_BASE, GATEWAY_URL: 'http://localhost:3000' })).toThrow(
      /GATEWAY_URL/,
    )
  })

  test('produção com COMMUNITY_URL default (localhost) → falha no boot', () => {
    const { COMMUNITY_URL: _c, ...semCommunity } = PROD_BASE
    expect(() => loadEnv(semCommunity)).toThrow(/COMMUNITY_URL/)
  })

  test('KIDS_COMMUNITY_URL: opcional em produção; setada com localhost → falha no boot', () => {
    // Ausente: produção sobe normalmente (o domínio kids pode não existir ainda).
    expect(() => loadEnv(PROD_BASE)).not.toThrow()
    // Setada apontando p/ localhost: links de e-mail quebrados — fail-fast.
    expect(() => loadEnv({ ...PROD_BASE, KIDS_COMMUNITY_URL: 'http://localhost:3008' })).toThrow(
      /KIDS_COMMUNITY_URL/,
    )
    // Setada com domínio real: ok.
    const env = loadEnv({ ...PROD_BASE, KIDS_COMMUNITY_URL: 'https://kids.example.com' })
    expect(env.KIDS_COMMUNITY_URL).toBe('https://kids.example.com')
  })

  test('dev/test SEM AUTH_INTERNAL_TOKEN → ok (checagem desligada fora de produção)', () => {
    expect(() => loadEnv(BASE)).not.toThrow()
  })

  test('HS256 sem segredo forte → falha no boot (invariante pré-existente)', () => {
    expect(() => loadEnv({ DATABASE_URL: BASE.DATABASE_URL as string })).toThrow(/JWT_HS256_SECRET/)
  })
})
