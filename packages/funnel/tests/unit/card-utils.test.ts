import { describe, expect, test } from 'bun:test'
import {
  brandLabel,
  CARD_BRANDS,
  cardLengthFor,
  cardPlaceholder,
  cvvLengthFor,
  isExpiryInFuture,
  luhnCheck,
  maskCardNumber,
  maskCpf,
  normalizeBrand,
  onlyDigits,
} from '../../src/lib/card-utils'

describe('normalizeBrand', () => {
  test('aceita as 5 bandeiras suportadas pela Efí', () => {
    for (const b of CARD_BRANDS) expect(normalizeBrand(b)).toBe(b)
  })

  test('rejeita os retornos especiais e valores fora do union', () => {
    expect(normalizeBrand('undefined')).toBeNull()
    expect(normalizeBrand('unsupported')).toBeNull()
    expect(normalizeBrand('')).toBeNull()
    expect(normalizeBrand('foo')).toBeNull()
    expect(normalizeBrand(null)).toBeNull()
    expect(normalizeBrand(undefined)).toBeNull()
  })
})

describe('cardLengthFor / cvvLengthFor', () => {
  test('amex: 15 dígitos e CVV de 4', () => {
    expect(cardLengthFor('amex')).toBe(15)
    expect(cvvLengthFor('amex')).toBe(4)
  })

  test('demais bandeiras e desconhecida: 16 dígitos e CVV de 3', () => {
    for (const b of ['visa', 'mastercard', 'elo', 'hipercard', null] as const) {
      expect(cardLengthFor(b)).toBe(16)
      expect(cvvLengthFor(b)).toBe(3)
    }
  })
})

describe('onlyDigits', () => {
  test('remove não-dígitos e aplica o teto', () => {
    expect(onlyDigits('12a3-4 5', 4)).toBe('1234')
    expect(onlyDigits('', 4)).toBe('')
  })
})

describe('maskCardNumber', () => {
  test('bandeira desconhecida/visa: grupos de 4, máx 16 dígitos', () => {
    expect(maskCardNumber('4242424242424242', null)).toBe('4242 4242 4242 4242')
    expect(maskCardNumber('4242424242424242', 'visa')).toBe('4242 4242 4242 4242')
  })

  test('amex: grupos 4-6-5, máx 15 dígitos', () => {
    expect(maskCardNumber('378282246310005', 'amex')).toBe('3782 822463 10005')
    expect(maskCardNumber('3782', 'amex')).toBe('3782')
    expect(maskCardNumber('37828224', 'amex')).toBe('3782 8224')
  })

  test('corta o excedente conforme a bandeira', () => {
    expect(maskCardNumber('42424242424242429999', 'visa')).toBe('4242 4242 4242 4242')
    expect(maskCardNumber('3782822463100059999', 'amex')).toBe('3782 822463 10005')
  })

  test('ignora letras, espaços e símbolos', () => {
    expect(maskCardNumber('4242-4242 4242x4242', null)).toBe('4242 4242 4242 4242')
  })
})

describe('cardPlaceholder', () => {
  test('formato por bandeira', () => {
    expect(cardPlaceholder('amex')).toBe('0000 000000 00000')
    expect(cardPlaceholder('visa')).toBe('0000 0000 0000 0000')
    expect(cardPlaceholder(null)).toBe('0000 0000 0000 0000')
  })
})

describe('luhnCheck', () => {
  test('números de teste válidos por bandeira', () => {
    expect(luhnCheck('4242424242424242')).toBe(true) // visa
    expect(luhnCheck('5555555555554444')).toBe(true) // mastercard
    expect(luhnCheck('378282246310005')).toBe(true) // amex (15)
    expect(luhnCheck('6362970000457013')).toBe(true) // elo
    expect(luhnCheck('6062825624254001')).toBe(true) // hipercard
  })

  test('um dígito trocado invalida', () => {
    expect(luhnCheck('4242424242424241')).toBe(false)
    expect(luhnCheck('378282246310006')).toBe(false)
  })

  test('vazio, curto demais ou com não-dígitos → false', () => {
    expect(luhnCheck('')).toBe(false)
    expect(luhnCheck('424242')).toBe(false)
    expect(luhnCheck('4242 4242 4242 4242')).toBe(false)
  })
})

describe('isExpiryInFuture', () => {
  const now = new Date('2026-06-15T12:00:00Z')

  test('mês corrente ainda vale', () => {
    expect(isExpiryInFuture('06', '2026', now)).toBe(true)
  })

  test('futuro vale (mesmo ano e anos seguintes)', () => {
    expect(isExpiryInFuture('07', '2026', now)).toBe(true)
    expect(isExpiryInFuture('01', '2030', now)).toBe(true)
  })

  test('passado não vale', () => {
    expect(isExpiryInFuture('05', '2026', now)).toBe(false)
    expect(isExpiryInFuture('12', '2025', now)).toBe(false)
  })

  test('entradas inválidas → false', () => {
    expect(isExpiryInFuture('', '2030', now)).toBe(false)
    expect(isExpiryInFuture('13', '2030', now)).toBe(false)
    expect(isExpiryInFuture('00', '2030', now)).toBe(false)
    expect(isExpiryInFuture('ab', 'cd', now)).toBe(false)
  })
})

describe('maskCpf', () => {
  test('formata progressivamente até 000.000.000-00', () => {
    expect(maskCpf('529')).toBe('529')
    expect(maskCpf('5299822')).toBe('529.982.2')
    expect(maskCpf('52998224725')).toBe('529.982.247-25')
  })

  test('ignora não-dígitos e corta excedente', () => {
    expect(maskCpf('529.982.247-25999')).toBe('529.982.247-25')
    expect(maskCpf('abc')).toBe('')
  })
})

describe('brandLabel', () => {
  test('nomes de exibição em pt-BR', () => {
    expect(brandLabel('visa')).toBe('Visa')
    expect(brandLabel('mastercard')).toBe('Mastercard')
    expect(brandLabel('amex')).toBe('American Express')
    expect(brandLabel('elo')).toBe('Elo')
    expect(brandLabel('hipercard')).toBe('Hipercard')
  })
})
