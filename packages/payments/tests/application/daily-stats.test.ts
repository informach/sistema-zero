import { describe, expect, test } from 'bun:test'
import { GetDailyPaymentsStatsService } from '../../src/application/payments-stats/get-daily-payments-stats.service'
import type {
  PaymentAdminReadRepository,
  PaymentDailyRange,
} from '../../src/domain/ports/payment-admin-read.port'

/** Fake do port de leitura admin: captura o range repassado ao `statsDaily`. */
function buildFake() {
  const calls: PaymentDailyRange[] = []
  const repo = {
    list: async () => ({ items: [], total: 0 }),
    stats: async () => {
      throw new Error('não usado')
    },
    statsDaily: async (range: PaymentDailyRange) => {
      calls.push(range)
      return { from: range.from.toISOString(), to: range.to.toISOString(), days: [] }
    },
    ops: async () => {
      throw new Error('não usado')
    },
  } as unknown as PaymentAdminReadRepository
  return { repo, calls }
}

describe('GetDailyPaymentsStatsService', () => {
  test('delega a janela e o filtro de ofertas ao port sem alterar', async () => {
    const { repo, calls } = buildFake()
    const service = new GetDailyPaymentsStatsService(repo)

    const from = new Date('2026-05-05T03:00:00.000Z')
    const to = new Date('2026-06-04T02:59:59.999Z')
    const offerIds = [
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
    ]

    const result = await service.execute({ from, to, offerIds })

    expect(calls.length).toBe(1)
    expect(calls[0]?.from).toBe(from)
    expect(calls[0]?.to).toBe(to)
    expect(calls[0]?.offerIds).toEqual(offerIds)
    expect(result.days).toEqual([])
  })

  test('sem offerIds → repassa undefined (consulta sem filtro de oferta)', async () => {
    const { repo, calls } = buildFake()
    const service = new GetDailyPaymentsStatsService(repo)

    await service.execute({ from: new Date('2026-06-01'), to: new Date('2026-06-04') })

    expect(calls[0]?.offerIds).toBeUndefined()
  })
})
