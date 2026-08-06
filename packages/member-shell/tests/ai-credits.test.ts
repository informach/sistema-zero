import { describe, expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))

process.env.JWT_HS256_SECRET ??= 'test-jwt-secret-with-32-characters'

const { consumeAiQuota, consumeAiQuotaStrict } = await import('../src/server/ai-quota')

const CREDITS = {
  dayLimit: 50,
  dayRemaining: 13,
  monthLimit: 500,
  monthRemaining: 300,
  monthRenewsOn: '2026-09-01',
}

function membersWith(body: unknown, status = 200) {
  return { aiUsageConsume: async () => ({ status, body }) } as never
}

describe('consumeAiQuota — o saldo viaja junto do consumo', () => {
  test('liberado carrega o saldo fresco', async () => {
    const result = await consumeAiQuota(
      membersWith({ allowed: true, usedDay: 37, usedMonth: 200, credits: CREDITS }),
      'pensa-chat',
    )
    expect(result.allowed).toBe(true)
    expect(result.credits).toEqual(CREDITS)
  })

  test('recusado também carrega — é a tela que mais precisa saber quando volta', async () => {
    const result = await consumeAiQuota(
      membersWith({
        allowed: false,
        scope: 'day',
        usedDay: 50,
        usedMonth: 200,
        credits: { ...CREDITS, dayRemaining: 0 },
      }),
      'pensa-chat',
    )
    expect(result.allowed).toBe(false)
    expect(result.credits?.dayRemaining).toBe(0)
  })

  test('members ANTIGO (sem o campo) libera sem saldo, não com saldo zero', async () => {
    const result = await consumeAiQuota(
      membersWith({ allowed: true, usedDay: 1, usedMonth: 1 }),
      'pensa-chat',
    )
    expect(result.allowed).toBe(true)
    expect(result.credits).toBeUndefined()
  })

  test('members FORA libera (fail-open) e NÃO inventa saldo', async () => {
    const result = await consumeAiQuota(membersWith(null, 503), 'pensa-chat')
    expect(result.allowed).toBe(true)
    // Ausência de saldo é "não sei". Se virasse `0`, a criança veria "acabou"
    // toda vez que o members piscasse.
    expect(result.credits).toBeUndefined()
  })

  test('a variante estrita bloqueia sem saldo quando o members não responde', async () => {
    const result = await consumeAiQuotaStrict(membersWith(null, 503), 'studio-zappy')
    expect(result).toEqual({ allowed: false, scope: 'unavailable' })
  })
})
