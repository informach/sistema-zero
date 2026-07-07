import { describe, expect, it } from 'bun:test'
import {
  nextQuotaResetPt,
  quotaDayPt,
  YtQuotaGuard,
} from '../../src/application/publications/yt-quota-guard'
import { InMemoryQuotaUsageRepository } from '../fakes/youtube'

describe('yt-quota-guard (dia de quota em America/Los_Angeles)', () => {
  it('o dia vira à meia-noite PT, não UTC', () => {
    // 06:59Z ainda é o dia ANTERIOR em PT (PDT = UTC-7 em julho).
    expect(quotaDayPt(new Date('2026-07-08T06:59:00Z'))).toBe('2026-07-07')
    expect(quotaDayPt(new Date('2026-07-08T07:01:00Z'))).toBe('2026-07-08')
    // Janeiro (PST = UTC-8): vira às 08:00Z.
    expect(quotaDayPt(new Date('2026-01-08T07:59:00Z'))).toBe('2026-01-07')
    expect(quotaDayPt(new Date('2026-01-08T08:01:00Z'))).toBe('2026-01-08')
  })

  it('nextQuotaResetPt é sempre no futuro e num dia PT novo', () => {
    for (const iso of ['2026-07-07T12:00:00Z', '2026-07-08T06:30:00Z', '2026-01-15T23:00:00Z']) {
      const now = new Date(iso)
      const reset = nextQuotaResetPt(now, 0)
      expect(reset.getTime()).toBeGreaterThan(now.getTime())
      expect(quotaDayPt(reset)).not.toBe(quotaDayPt(now))
    }
  })

  it('tryReserve respeita os DOIS tetos (units e uploads) e acumula no dia', async () => {
    const repo = new InMemoryQuotaUsageRepository()
    const now = () => new Date('2026-07-07T12:00:00Z')
    const guard = new YtQuotaGuard(repo, { budgetUnits: 2000, uploadDailyCap: 1 }, now)

    expect(await guard.tryReserve({ units: 1600, isUpload: true })).toBe(true)
    // Teto de units: 1600 + 1600 > 2000.
    expect(await guard.tryReserve({ units: 1600, isUpload: false })).toBe(false)
    // Cabe em units mas estoura o cap de uploads (1).
    expect(await guard.tryReserve({ units: 100, isUpload: true })).toBe(false)
    // Leitura barata ainda cabe.
    expect(await guard.tryReserve({ units: 100, isUpload: false })).toBe(true)
  })

  it('dia novo zera o orçamento', async () => {
    const repo = new InMemoryQuotaUsageRepository()
    let current = new Date('2026-07-07T12:00:00Z')
    const guard = new YtQuotaGuard(repo, { budgetUnits: 1600, uploadDailyCap: 5 }, () => current)
    expect(await guard.tryReserve({ units: 1600, isUpload: true })).toBe(true)
    expect(await guard.tryReserve({ units: 1600, isUpload: true })).toBe(false)
    current = new Date('2026-07-08T12:00:00Z')
    expect(await guard.tryReserve({ units: 1600, isUpload: true })).toBe(true)
  })
})
