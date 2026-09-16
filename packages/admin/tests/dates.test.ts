import { describe, expect, test } from 'bun:test'
import {
  dateInputToSaoPauloEndOfDayIso,
  dateInputToSaoPauloStartOfDayIso,
  isoToSaoPauloDateInput,
  monthLabelPt,
} from '../src/lib/dates'

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

describe('isoToSaoPauloDateInput', () => {
  test('preenche a data civil de São Paulo mesmo perto da virada UTC', () => {
    expect(isoToSaoPauloDateInput('2026-09-17T02:59:59.999Z')).toBe('2026-09-16')
    expect(isoToSaoPauloDateInput('2026-09-17T03:00:00.000Z')).toBe('2026-09-17')
  })

  test('retorna vazio para valor ausente ou inválido', () => {
    expect(isoToSaoPauloDateInput(null)).toBe('')
    expect(isoToSaoPauloDateInput('não-é-data')).toBe('')
  })
})

describe('monthLabelPt', () => {
  test('YYYY-MM vira mês por extenso em português', () => {
    expect(monthLabelPt('2026-07')).toBe('julho de 2026')
    expect(monthLabelPt('2027-01')).toBe('janeiro de 2027')
    expect(monthLabelPt('2026-03')).toBe('março de 2026')
  })

  test('valor inválido volta como está (não quebra a lista)', () => {
    expect(monthLabelPt('m:2026-07')).toBe('m:2026-07')
    expect(monthLabelPt('2026-13')).toBe('2026-13')
  })
})
