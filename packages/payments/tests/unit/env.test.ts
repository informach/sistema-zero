import { describe, expect, test } from 'bun:test'
import { loadEnv } from '../../src/infrastructure/config/env'

/**
 * Os refines do env são BARREIRAS DE SEGURANÇA (boleto duplicado, sandbox em
 * produção, cobrança duplicada por TTL curto) — um refactor que os afrouxe não
 * pode passar verde. Cada caso abaixo fixa uma invariante do boot fail-fast.
 */
const BASE: Record<string, string> = {
  DATABASE_URL: 'postgres://postgres:postgres@localhost:5433/sistemazero',
  EFI_CLIENT_ID: 'client-id',
  EFI_CLIENT_SECRET: 'client-secret',
  EFI_PIX_KEY: 'chave@pix.com',
  EFI_CERTIFICATE_BASE64: 'QkFTRTY0RkFLRQ==',
}

describe('loadEnv — refines críticos (fail-fast no boot)', () => {
  test('config mínima válida carrega com os defaults documentados', () => {
    const env = loadEnv(BASE)
    expect(env.EFI_REQUEST_TIMEOUT_MS).toBe(20_000)
    expect(env.EFI_TOTAL_RETRY_BUDGET_MS).toBe(30_000)
    expect(env.IDEMPOTENCY_IN_FLIGHT_TTL_SECONDS).toBe(60)
    expect(env.CHARGE_CLAIM_STALE_MS).toBe(60_000)
    expect(env.REQUIRE_ADMIN).toBe(true) // seguro por default
    expect(env.EFI_SANDBOX).toBe(true)
  })

  test('sem certificado (nem PATH nem BASE64) → falha', () => {
    const { EFI_CERTIFICATE_BASE64: _omitted, ...rest } = BASE
    expect(() => loadEnv(rest)).toThrow(/EFI_CERTIFICATE/)
  })

  // Config mínima de PRODUÇÃO: além do EFI_SANDBOX=false, o boot exige o segredo
  // do webhook (anti-amplificação não autenticada) e o token do /metrics
  // (telemetria em ingress público).
  const PROD: Record<string, string> = {
    ...BASE,
    NODE_ENV: 'production',
    EFI_SANDBOX: 'false',
    EFI_WEBHOOK_SECRET: 'segredo-webhook-forte',
    METRICS_TOKEN: 'token-metrics-16chars',
  }

  test('produção exige EFI_SANDBOX=false EXPLÍCITO (não aponta pro sandbox em silêncio)', () => {
    expect(() => loadEnv({ ...PROD, EFI_SANDBOX: 'true' })).toThrow(/EFI_SANDBOX/)
    const ok = loadEnv(PROD)
    expect(ok.EFI_SANDBOX).toBe(false)
  })

  test('produção exige EFI_WEBHOOK_SECRET (webhook público sem segredo = amplificação)', () => {
    const { EFI_WEBHOOK_SECRET: _omitted, ...rest } = PROD
    expect(() => loadEnv(rest)).toThrow(/EFI_WEBHOOK_SECRET/)
  })

  test('produção exige METRICS_TOKEN (≥16 chars) — /metrics fica em ingress público', () => {
    const { METRICS_TOKEN: _omitted, ...rest } = PROD
    expect(() => loadEnv(rest)).toThrow(/METRICS_TOKEN/)
    expect(() => loadEnv({ ...PROD, METRICS_TOKEN: 'curto' })).toThrow(/METRICS_TOKEN/)
    // Fora de produção segue opcional (dev local sem token).
    expect(loadEnv(BASE).METRICS_TOKEN).toBeUndefined()
  })

  test('HOST default é "::" (dual-stack — private networking do Railway é IPv6)', () => {
    expect(loadEnv(BASE).HOST).toBe('::')
    expect(loadEnv({ ...BASE, HOST: '0.0.0.0' }).HOST).toBe('0.0.0.0')
  })

  test('EFI_WEBHOOK_SECRET vazio → falha (para desabilitar, OMITA a variável)', () => {
    expect(() => loadEnv({ ...BASE, EFI_WEBHOOK_SECRET: '' })).toThrow(/EFI_WEBHOOK_SECRET/)
    expect(loadEnv(BASE).EFI_WEBHOOK_SECRET).toBeUndefined()
  })

  test('lease do charge worker < 2× timeout da Efí → falha (anti boleto duplicado)', () => {
    expect(() =>
      loadEnv({ ...BASE, CHARGE_CLAIM_STALE_MS: '30000', EFI_REQUEST_TIMEOUT_MS: '20000' }),
    ).toThrow(/CHARGE_CLAIM_STALE_MS/)
  })

  test('budget total < timeout de uma tentativa → falha (config contraditória)', () => {
    expect(() =>
      loadEnv({ ...BASE, EFI_TOTAL_RETRY_BUDGET_MS: '10000', EFI_REQUEST_TIMEOUT_MS: '20000' }),
    ).toThrow(/EFI_TOTAL_RETRY_BUDGET_MS/)
  })

  test('TTL de idempotência sem folga de 10s sobre o budget → falha (anti cobrança duplicada)', () => {
    // 35s NÃO cobre 30s de budget + 10s de folga…
    expect(() => loadEnv({ ...BASE, IDEMPOTENCY_IN_FLIGHT_TTL_SECONDS: '35' })).toThrow(
      /IDEMPOTENCY_IN_FLIGHT_TTL_SECONDS/,
    )
    // …40s cobre exatamente.
    expect(
      loadEnv({ ...BASE, IDEMPOTENCY_IN_FLIGHT_TTL_SECONDS: '40' })
        .IDEMPOTENCY_IN_FLIGHT_TTL_SECONDS,
    ).toBe(40)
  })

  test('booleano inválido falha alto em vez de virar false silenciosamente', () => {
    expect(() => loadEnv({ ...BASE, TRUST_PROXY: 'yes' })).toThrow(/true/)
  })
})
