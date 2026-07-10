import { describe, expect, test } from 'bun:test'
import { ConsumeAiUsageService } from '../../src/application/ai-usage/consume-ai-usage.service'
import { InMemoryAiUsageRepository } from '../fakes/ai-usage-in-memory'

/**
 * O "dia" da quota é o calendário civil de São Paulo (UTC-3, mesma régua do
 * streak): o dia só vira às 03:00Z. Um uso às 02:59Z ainda pertence ao dia
 * anterior; às 03:00Z começa o balde novo.
 */
describe('ConsumeAiUsageService — dia civil America/Sao_Paulo', () => {
  function build(daily: number, monthly = 1000) {
    const repo = new InMemoryAiUsageRepository()
    const clockRef = { now: new Date(0) }
    const service = new ConsumeAiUsageService({
      aiUsage: repo,
      dailyLimit: daily,
      monthlyLimit: monthly,
      clock: () => clockRef.now,
    })
    return { repo, clockRef, service }
  }

  test('02:59Z conta no dia ANTERIOR; 03:00Z abre o dia novo', async () => {
    const { repo, clockRef, service } = build(1)
    const account = 'acc-1'

    // 23:59 de 09/07 em SP (02:59Z de 10/07) — esgota o dia 09.
    clockRef.now = new Date('2026-07-10T02:59:00.000Z')
    expect((await service.execute(account, 'pensa-chat', false)).allowed).toBe(true)
    expect((await service.execute(account, 'pensa-chat', false)).scope).toBe('day')
    expect(repo.rows[0]?.day).toBe('2026-07-09')

    // 00:00 de 10/07 em SP (03:00Z) — balde diário NOVO.
    clockRef.now = new Date('2026-07-10T03:00:00.000Z')
    const fresh = await service.execute(account, 'pensa-chat', false)
    expect(fresh.allowed).toBe(true)
    expect(repo.rows.find((r) => r.day === '2026-07-10')?.used).toBe(1)
  })

  test('virada de MÊS segue o calendário SP (31/07 03:00Z = 1º/08 SP? não — 31/07 SP)', async () => {
    const { clockRef, service } = build(10, 2)
    const account = 'acc-2'

    // 30/07 23:30 SP e 31/07 12:00 SP → mesmo mês (2 usos = teto mensal).
    clockRef.now = new Date('2026-07-31T02:30:00.000Z') // 30/07 23:30 SP
    await service.execute(account, 'pensa-chat', false)
    clockRef.now = new Date('2026-07-31T15:00:00.000Z') // 31/07 12:00 SP
    await service.execute(account, 'pensa-chat', false)
    expect((await service.execute(account, 'pensa-chat', false)).scope).toBe('month')

    // 1º/08 00:30 SP (03:30Z) → mês novo, permite de novo.
    clockRef.now = new Date('2026-08-01T03:30:00.000Z')
    expect((await service.execute(account, 'pensa-chat', false)).allowed).toBe(true)
  })
})
