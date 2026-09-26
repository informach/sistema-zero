import { describe, expect, test } from 'bun:test'
import {
  formatShareCode,
  generateShareCode,
  normalizeShareCode,
  SHARE_CODE_ALPHABET,
  SHARE_CODE_LENGTH,
} from '../../src/domain/pensa/share-code'

describe('o código do plano (equipe do Pensa)', () => {
  test('gera 6 símbolos do alfabeto sem os ambíguos (0/O, 1/I/L)', () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateShareCode()
      expect(code).toHaveLength(SHARE_CODE_LENGTH)
      for (const char of code) expect(SHARE_CODE_ALPHABET).toContain(char)
    }
    expect(SHARE_CODE_ALPHABET).not.toMatch(/[0O1IL]/)
    // O gerador injetável percorre o alfabeto pelo índice pedido.
    expect(generateShareCode(() => 0)).toBe('AAAAAA')
    expect(generateShareCode((max) => max - 1)).toBe('999999')
  })

  test('a entrada tolera minúsculas, espaços, hífen e o prefixo ZAP', () => {
    expect(normalizeShareCode('7K3QM2')).toBe('7K3QM2')
    expect(normalizeShareCode('zap-7k3q m2')).toBe('7K3QM2')
    expect(normalizeShareCode('ZAP7K3QM2')).toBe('7K3QM2')
    expect(normalizeShareCode(' ZAP - 7K3QM2 ')).toBe('7K3QM2')
    // Um código que COMEÇA com letras do prefixo mas tem 6 símbolos é o próprio código.
    expect(normalizeShareCode('ZAPQM2')).toBe('ZAPQM2')
  })

  test('recusa tamanho errado e símbolos fora do alfabeto (inclusive 0, O, 1, I, L)', () => {
    expect(normalizeShareCode('')).toBeNull()
    expect(normalizeShareCode('7K3Q')).toBeNull()
    expect(normalizeShareCode('7K3QM2X')).toBeNull()
    expect(normalizeShareCode('0K3QM2')).toBeNull()
    expect(normalizeShareCode('OK3QM2')).toBeNull()
    expect(normalizeShareCode('1K3QM2')).toBeNull()
    expect(normalizeShareCode('LK3QM2')).toBeNull()
  })

  test('formata com o prefixo para a tela', () => {
    expect(formatShareCode('7K3QM2')).toBe('ZAP-7K3QM2')
  })
})
