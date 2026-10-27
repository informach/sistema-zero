import { describe, expect, test } from 'bun:test'
import { dividirIntervaloDeTempo } from '../../src/domain/intervalo-de-tempo'

describe('intervalo confirmado pelo serviço', () => {
  test('limita o tempo à concessão e conserva a fração para o próximo pulso', () => {
    const r = dividirIntervaloDeTempo(
      new Date('2026-10-27T12:00:00.250Z'),
      new Date('2026-10-27T12:00:20.999Z'),
      new Date('2026-10-27T12:00:15.900Z'),
    )
    expect(r.parcelas).toEqual([{ dia: '2026-10-27', segundos: 15 }])
    expect(r.cursor.toISOString()).toBe('2026-10-27T12:00:15.250Z')
  })

  test('separa os segundos na virada do dia em São Paulo', () => {
    const r = dividirIntervaloDeTempo(
      new Date('2026-10-28T02:59:58.000Z'),
      new Date('2026-10-28T03:00:03.000Z'),
      new Date('2026-10-28T03:00:10.000Z'),
    )
    expect(r.parcelas).toEqual([
      { dia: '2026-10-27', segundos: 2 },
      { dia: '2026-10-28', segundos: 3 },
    ])
    expect(r.cursor.toISOString()).toBe('2026-10-28T03:00:03.000Z')
  })

  test('não gera tempo negativo se o relógio do serviço recuar', () => {
    const inicio = new Date('2026-10-27T12:00:05.000Z')
    expect(dividirIntervaloDeTempo(inicio, new Date('2026-10-27T12:00:00Z'), inicio)).toEqual({
      parcelas: [],
      cursor: inicio,
    })
  })

  test('recusa datas inválidas', () => {
    expect(() => dividirIntervaloDeTempo(new Date(NaN), new Date(), new Date())).toThrow()
  })
})
