import { describe, expect, test } from 'bun:test'
import {
  aggregate,
  bucketStart,
  buildStats,
  clampWindow,
  DAY_MS,
  densify,
  MAX_WINDOW_DAYS,
  pickGranularity,
} from '../src/lib/sales-series'
import type { DailyPaymentBucket } from '../src/lib/types'

function bucket(
  day: string,
  gross: string,
  refunded = '0',
  tx = 1,
  cancel = 0,
): DailyPaymentBucket {
  return {
    day,
    grossAmountInCents: gross,
    refundedAmountInCents: refunded,
    netAmountInCents: (BigInt(gross) - BigInt(refunded)).toString(),
    transactions: tx,
    cancellations: cancel,
  }
}

describe('densify', () => {
  test('preenche os dias civis (BRT) com zeros e soma os totais em BigInt', () => {
    // 12:00Z = 09:00 BRT → o rótulo do dia coincide com a data UTC.
    const from = new Date('2026-06-01T12:00:00Z')
    const to = new Date('2026-06-03T12:00:00Z')
    const stats = densify(from, to, [bucket('2026-06-02', '123456789012345', '300', 2, 1)])

    expect(stats.days.map((d) => d.day)).toEqual(['2026-06-01', '2026-06-02', '2026-06-03'])
    expect(stats.days[0]?.grossAmountInCents).toBe('0')
    expect(stats.totals.grossAmountInCents).toBe('123456789012345')
    expect(stats.totals.refundedAmountInCents).toBe('300')
    expect(stats.totals.netAmountInCents).toBe('123456789012045')
    expect(stats.totals.transactions).toBe(2)
    expect(stats.totals.cancellations).toBe(1)
  })

  test('janela de um dia gera exatamente um bucket', () => {
    const at = new Date('2026-06-05T12:00:00Z')
    const stats = densify(at, at, [])
    expect(stats.days).toHaveLength(1)
    expect(stats.days[0]?.day).toBe('2026-06-05')
  })
})

describe('pickGranularity', () => {
  const day = (n: number) => new Date(n * DAY_MS)
  test('≤90d dia · >90d semana · >270d mês', () => {
    expect(pickGranularity(day(0), day(90))).toBe('day')
    expect(pickGranularity(day(0), day(91))).toBe('week')
    expect(pickGranularity(day(0), day(270))).toBe('week')
    expect(pickGranularity(day(0), day(271))).toBe('month')
  })
})

describe('bucketStart', () => {
  test('mês: primeiro dia do mês do rótulo', () => {
    expect(bucketStart('2026-06-15', 'month')).toBe('2026-06-01')
  })
  test('semana: segunda-feira da semana do rótulo', () => {
    // 2026-06-01 é segunda-feira.
    expect(bucketStart('2026-06-01', 'week')).toBe('2026-06-01')
    expect(bucketStart('2026-06-07', 'week')).toBe('2026-06-01') // domingo
    expect(bucketStart('2026-06-08', 'week')).toBe('2026-06-08') // segunda seguinte
  })
})

describe('aggregate', () => {
  test('semanal: soma BigInt por semana e marca periodEnd com o último dia coberto', () => {
    const days = [
      bucket('2026-06-06', '100'),
      bucket('2026-06-07', '200', '50', 1, 1),
      bucket('2026-06-08', '400'),
    ]
    const weekly = aggregate(days, 'week')
    expect(weekly).toHaveLength(2)
    expect(weekly[0]).toMatchObject({
      day: '2026-06-01',
      periodEnd: '2026-06-07',
      grossAmountInCents: '300',
      refundedAmountInCents: '50',
      netAmountInCents: '250',
      transactions: 2,
      cancellations: 1,
    })
    expect(weekly[1]).toMatchObject({ day: '2026-06-08', periodEnd: '2026-06-08' })
  })

  test('granularidade dia devolve a série intacta', () => {
    const days = [bucket('2026-06-01', '100')]
    expect(aggregate(days, 'day')).toBe(days)
  })
})

describe('clampWindow', () => {
  const now = new Date('2026-06-05T00:00:00Z')

  test('to no futuro distante é capado em agora+1d (anti-DoS da densificação)', () => {
    const { to } = clampWindow(new Date('2026-06-01T00:00:00Z'), new Date('9999-12-31'), now)
    expect(to.getTime()).toBe(now.getTime() + DAY_MS)
  })

  test('from > to colapsa para to', () => {
    const { from, to } = clampWindow(
      new Date('2026-06-04T00:00:00Z'),
      new Date('2026-06-01T00:00:00Z'),
      now,
    )
    expect(from.getTime()).toBe(to.getTime())
  })

  test('span acima do teto corta pelo lado do from', () => {
    const { from, to } = clampWindow(new Date('1970-01-01'), new Date('2026-06-01T00:00:00Z'), now)
    expect(to.toISOString()).toBe('2026-06-01T00:00:00.000Z')
    expect(to.getTime() - from.getTime()).toBe(MAX_WINDOW_DAYS * DAY_MS)
  })

  test('janela legítima passa intacta', () => {
    const f = new Date('2026-05-06T00:00:00Z')
    const t = new Date('2026-06-05T00:00:00Z')
    const { from, to } = clampWindow(f, t, now)
    expect(from.getTime()).toBe(f.getTime())
    expect(to.getTime()).toBe(t.getTime())
  })
})

describe('buildStats', () => {
  test('janela longa sai agregada mas com totais idênticos aos diários', () => {
    const from = new Date('2026-01-01T12:00:00Z')
    const to = new Date('2026-06-01T12:00:00Z') // ~151d → week
    const stats = buildStats(from, to, [bucket('2026-03-10', '777')])
    expect(stats.granularity).toBe('week')
    expect(stats.totals.grossAmountInCents).toBe('777')
    expect(stats.days.length).toBeLessThan(160) // agregada, não diária
  })
})
