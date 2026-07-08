import { describe, expect, it } from 'bun:test'
import {
  densifyVolume,
  STATS_WINDOW_DAYS,
  spDayKey,
  statsWindows,
} from '../../src/domain/ticket/ticket-stats'

describe('spDayKey (dia civil SP, UTC-3)', () => {
  it('meia-noite UTC ainda é o dia anterior em SP', () => {
    // 2026-07-08T00:00Z = 2026-07-07 21:00 em SP.
    expect(spDayKey(new Date('2026-07-08T00:00:00Z'))).toBe('2026-07-07')
  })

  it('03:00Z é a virada do dia em SP', () => {
    expect(spDayKey(new Date('2026-07-08T02:59:59Z'))).toBe('2026-07-07')
    expect(spDayKey(new Date('2026-07-08T03:00:00Z'))).toBe('2026-07-08')
  })
})

describe('statsWindows', () => {
  const now = new Date('2026-07-08T15:00:00Z') // 12:00 em SP → dia 2026-07-08

  it('a série cobre STATS_WINDOW_DAYS dias, ascendente, terminando hoje', () => {
    const w = statsWindows(now)
    expect(w.dayKeys).toHaveLength(STATS_WINDOW_DAYS)
    expect(w.dayKeys[w.dayKeys.length - 1]).toBe('2026-07-08')
    expect(w.dayKeys[0]).toBe('2026-06-25') // 13 dias antes
    // Ordenação estritamente crescente.
    expect([...w.dayKeys].sort()).toEqual(w.dayKeys)
  })

  it('hoje começa 03:00Z (00:00 SP); a janela de 7 dias volta 6 dias', () => {
    const w = statsWindows(now)
    expect(w.todayStartIso).toBe('2026-07-08T03:00:00.000Z')
    expect(w.weekStartIso).toBe('2026-07-02T03:00:00.000Z')
    expect(w.seriesStartIso).toBe('2026-06-25T03:00:00.000Z')
  })

  it('aceita um tamanho de janela custom', () => {
    const w = statsWindows(now, 3)
    expect(w.dayKeys).toEqual(['2026-07-06', '2026-07-07', '2026-07-08'])
  })
})

describe('densifyVolume', () => {
  it('preenche dias sem dado com 0 e mantém a ordem das chaves', () => {
    const days = ['2026-07-06', '2026-07-07', '2026-07-08']
    const created = new Map([
      ['2026-07-06', 3],
      ['2026-07-08', 1],
    ])
    const auto = new Map([['2026-07-08', 1]])
    expect(densifyVolume(days, created, auto)).toEqual([
      { date: '2026-07-06', created: 3, autoReplied: 0 },
      { date: '2026-07-07', created: 0, autoReplied: 0 },
      { date: '2026-07-08', created: 1, autoReplied: 1 },
    ])
  })
})
