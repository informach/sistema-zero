import { describe, expect, test } from 'bun:test'
import { brLocalDigits, formatTelefone, phoneDigits } from '../src/lib/phone'

describe('phoneDigits', () => {
  test('remove máscara, espaços e símbolos', () => {
    expect(phoneDigits('(11) 99999-8888')).toBe('11999998888')
    expect(phoneDigits('+55 11 99999-8888')).toBe('5511999998888')
    expect(phoneDigits('abc')).toBe('')
    expect(phoneDigits('')).toBe('')
  })
})

describe('brLocalDigits', () => {
  test('remove o DDI 55 de celular (13) e fixo (12)', () => {
    expect(brLocalDigits('5511999998888')).toBe('11999998888')
    expect(brLocalDigits('551133334444')).toBe('1133334444')
    expect(brLocalDigits('+55 (11) 99999-8888')).toBe('11999998888')
  })

  test('mantém número local (10–11 dígitos), mesmo começando com 55', () => {
    expect(brLocalDigits('11999998888')).toBe('11999998888')
    expect(brLocalDigits('1133334444')).toBe('1133334444')
    // DDD 55 (região Sul) sem DDI: 10–11 dígitos não são tocados.
    expect(brLocalDigits('55999998888')).toBe('55999998888')
  })

  test('não inventa nada p/ comprimentos fora do padrão BR', () => {
    expect(brLocalDigits('123')).toBe('123')
    expect(brLocalDigits('')).toBe('')
  })
})

describe('formatTelefone', () => {
  test('máscara progressiva durante a digitação', () => {
    expect(formatTelefone('')).toBe('')
    expect(formatTelefone('1')).toBe('(1')
    expect(formatTelefone('11')).toBe('(11')
    expect(formatTelefone('119')).toBe('(11) 9')
    expect(formatTelefone('119999')).toBe('(11) 9999')
    expect(formatTelefone('1199998888')).toBe('(11) 9999-8888')
    expect(formatTelefone('11999998888')).toBe('(11) 99999-8888')
  })

  test('descarta excedente além de 11 dígitos e re-mascara valor já formatado', () => {
    expect(formatTelefone('119999988889999')).toBe('(11) 99999-8888')
    expect(formatTelefone('(11) 99999-8888')).toBe('(11) 99999-8888')
  })
})
