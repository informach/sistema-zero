import { describe, expect, test } from 'bun:test'
import { dateInputToSaoPauloEndOfDayIso } from '../src/lib/dates'

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
