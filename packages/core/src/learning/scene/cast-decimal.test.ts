import { describe, expect, test } from 'bun:test'
import { decimal, numero } from './cast'

describe('números como a criança lê', () => {
  test('duas casas por padrão: o relógio de 40 quadros não vira 1,3333333333333333', () => {
    expect(decimal(40 / 30)).toBe('1,33')
    expect(decimal(0.6)).toBe('0,6')
    expect(decimal(0.1 + 0.2)).toBe('0,3')
    expect(decimal(3)).toBe('3')
  })

  test('quem precisa de mais precisão pede as casas', () => {
    expect(decimal(1 / 8, 3)).toBe('0,125')
  })

  test('o sinal de menos do conteúdo, e nada de "−0" depois de arredondar', () => {
    expect(numero(-9)).toBe('−9')
    expect(numero(-0.004)).toBe('0')
    expect(numero(-1.5)).toBe('−1,5')
  })
})
