import { describe, expect, it, mock } from 'bun:test'

// `server-only` lança fora do React Server — neutraliza p/ testar o helper puro.
mock.module('server-only', () => ({}))

const { consumeAiQuota, aiQuotaMessage } = await import('../src/server/ai-quota')

type MembersLike = Parameters<typeof consumeAiQuota>[0]

function membersWith(res: { status: number; body: unknown } | (() => Promise<never>)): MembersLike {
  return {
    aiUsageConsume:
      typeof res === 'function' ? res : async () => res as { status: number; body: never },
  } as unknown as MembersLike
}

describe('consumeAiQuota — quota de IA por conta (fail-open)', () => {
  it('recusa explícita do members propaga o scope', async () => {
    const day = await consumeAiQuota(
      membersWith({
        status: 200,
        body: { allowed: false, scope: 'day', usedDay: 50, usedMonth: 120 },
      }),
      'pensa-chat',
    )
    expect(day).toEqual({ allowed: false, scope: 'day' })

    const month = await consumeAiQuota(
      membersWith({
        status: 200,
        body: { allowed: false, scope: 'month', usedDay: 3, usedMonth: 500 },
      }),
      'pensa-synthesis',
    )
    expect(month).toEqual({ allowed: false, scope: 'month' })
  })

  it('consumo permitido libera', async () => {
    const r = await consumeAiQuota(
      membersWith({ status: 200, body: { allowed: true, usedDay: 1, usedMonth: 10 } }),
      'studio-describe',
    )
    expect(r.allowed).toBe(true)
  })

  it('FAIL-OPEN: members fora (5xx/throw/corpo inválido) NUNCA bloqueia a IA', async () => {
    expect(
      (await consumeAiQuota(membersWith({ status: 503, body: null }), 'pensa-chat')).allowed,
    ).toBe(true)
    expect(
      (
        await consumeAiQuota(
          membersWith(async () => {
            throw new Error('rede caiu')
          }),
          'pensa-chat',
        )
      ).allowed,
    ).toBe(true)
    expect(
      (await consumeAiQuota(membersWith({ status: 200, body: { whatever: 1 } }), 'pensa-chat'))
        .allowed,
    ).toBe(true)
  })

  it('copy da recusa tem o tom Zappy por escopo', () => {
    expect(aiQuotaMessage('day')).toContain('Amanhã tem mais')
    expect(aiQuotaMessage('month')).toContain('No mês que vem tem mais')
  })
})
