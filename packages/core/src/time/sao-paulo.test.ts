import { describe, expect, test } from 'bun:test'
import { saoPauloDayKey } from './sao-paulo'

describe('saoPauloDayKey', () => {
  test('mantém o dia anterior entre a meia-noite UTC e a virada civil de São Paulo', () => {
    expect(saoPauloDayKey(new Date('2026-08-16T00:30:00.000Z'))).toBe('2026-08-15')
  })

  test('vira o dia às 03:00 UTC durante o horário padrão', () => {
    expect(saoPauloDayKey(new Date('2026-08-16T02:59:59.999Z'))).toBe('2026-08-15')
    expect(saoPauloDayKey(new Date('2026-08-16T03:00:00.000Z'))).toBe('2026-08-16')
  })
})
