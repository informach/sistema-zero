import { describe, expect, test } from 'bun:test'
import { dateInputToSaoPauloEndOfDayIso, dateInputToSaoPauloStartOfDayIso } from '../src/lib/dates'

describe('dateInputToSaoPauloStartOfDayIso', () => {
  test('converte input de data para o início do dia em São Paulo', () => {
    expect(dateInputToSaoPauloStartOfDayIso('2026-07-01')).toBe('2026-07-01T03:00:00.000Z')
  })

  test('rejeita valores ausentes, malformados ou datas impossíveis', () => {
    expect(dateInputToSaoPauloStartOfDayIso('')).toBeNull()
    expect(dateInputToSaoPauloStartOfDayIso('2026/07/01')).toBeNull()
    expect(dateInputToSaoPauloStartOfDayIso('2026-02-31')).toBeNull()
  })
})

describe('dateInputToSaoPauloEndOfDayIso', () => {
  test('converte data de validade para o fim do dia em São Paulo', () => {
    expect(dateInputToSaoPauloEndOfDayIso('2026-07-01')).toBe('2026-07-02T02:59:59.999Z')
  })

  test('rejeita valores ausentes, malformados ou datas impossíveis', () => {
    expect(dateInputToSaoPauloEndOfDayIso('')).toBeNull()
    expect(dateInputToSaoPauloEndOfDayIso('2026/07/01')).toBeNull()
    expect(dateInputToSaoPauloEndOfDayIso('2026-02-31')).toBeNull()
  })
})
