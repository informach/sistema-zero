import { describe, expect, it } from 'bun:test'
import { nextCollectAt, nextCollectDelayMs } from '../../src/domain/metrics/collection-schedule'

const HOUR = 60 * 60_000
const DAY = 24 * HOUR
const NOW = new Date('2026-07-07T12:00:00Z')

function publishedAgo(ms: number): Date {
  return new Date(NOW.getTime() - ms)
}

describe('nextCollectDelayMs (decaimento por idade)', () => {
  it('faixas do plano: <48h→1h · <14d→6h · <90d→24h · <max→7d · além→null', () => {
    expect(nextCollectDelayMs(publishedAgo(HOUR), NOW, 365)).toBe(HOUR)
    expect(nextCollectDelayMs(publishedAgo(47 * HOUR), NOW, 365)).toBe(HOUR)
    expect(nextCollectDelayMs(publishedAgo(49 * HOUR), NOW, 365)).toBe(6 * HOUR)
    expect(nextCollectDelayMs(publishedAgo(13 * DAY), NOW, 365)).toBe(6 * HOUR)
    expect(nextCollectDelayMs(publishedAgo(15 * DAY), NOW, 365)).toBe(DAY)
    expect(nextCollectDelayMs(publishedAgo(89 * DAY), NOW, 365)).toBe(DAY)
    expect(nextCollectDelayMs(publishedAgo(91 * DAY), NOW, 365)).toBe(7 * DAY)
    expect(nextCollectDelayMs(publishedAgo(364 * DAY), NOW, 365)).toBe(7 * DAY)
    expect(nextCollectDelayMs(publishedAgo(366 * DAY), NOW, 365)).toBeNull()
  })

  it('bordas exatas: 48h cai na faixa seguinte (limites são exclusivos)', () => {
    expect(nextCollectDelayMs(publishedAgo(48 * HOUR), NOW, 365)).toBe(6 * HOUR)
    expect(nextCollectDelayMs(publishedAgo(14 * DAY), NOW, 365)).toBe(DAY)
    expect(nextCollectDelayMs(publishedAgo(90 * DAY), NOW, 365)).toBe(7 * DAY)
    expect(nextCollectDelayMs(publishedAgo(365 * DAY), NOW, 365)).toBeNull()
  })

  it('maxAgeDays configurável encurta o radar', () => {
    expect(nextCollectDelayMs(publishedAgo(91 * DAY), NOW, 90)).toBeNull()
  })

  it('nextCollectAt soma o delay ao agora (e null fora do radar)', () => {
    expect(nextCollectAt(publishedAgo(HOUR), NOW, 365)?.getTime()).toBe(NOW.getTime() + HOUR)
    expect(nextCollectAt(publishedAgo(400 * DAY), NOW, 365)).toBeNull()
  })
})
