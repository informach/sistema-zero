import { describe, expect, test } from 'bun:test'
import {
  CODE_ALPHABET,
  CODE_RE,
  generateAccountCode,
  generateAmbassadorCode,
  generatePageToken,
  isValidCode,
  normalizeCode,
  normalizeEmail,
  randomCodeSuffix,
  slugFromName,
} from '../../src/domain/codes'

describe('códigos de indicação', () => {
  test('slugFromName remove acentos e não-alfanuméricos', () => {
    expect(slugFromName('Márcia Souza')).toBe('marcia')
    expect(slugFromName('João-Pedro')).toBe('joaopedro')
    expect(slugFromName('  Ana  ')).toBe('ana')
    expect(slugFromName('X')).toBe('amigo')
    expect(slugFromName('')).toBe('amigo')
    expect(slugFromName('Wolfeschlegelsteinhausen')).toHaveLength(12)
  })

  test('generateAmbassadorCode casa o formato canônico', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateAmbassadorCode('Helena Oliveira')
      expect(isValidCode(code)).toBe(true)
      expect(code).toMatch(/^helena-[a-z0-9]{4}$/)
    }
  })

  test('generateAccountCode: 8 chars do alfabeto sem ambíguos', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateAccountCode()
      expect(code).toHaveLength(8)
      expect(isValidCode(code)).toBe(true)
      for (const ch of code) expect(CODE_ALPHABET).toContain(ch)
    }
  })

  test('alfabeto não tem caracteres ambíguos', () => {
    for (const ch of '0o1li') expect(CODE_ALPHABET).not.toContain(ch)
  })

  test('randomCodeSuffix respeita o tamanho', () => {
    expect(randomCodeSuffix(4)).toHaveLength(4)
    expect(randomCodeSuffix(8)).toHaveLength(8)
  })

  test('normalizeCode/normalizeEmail: lower + trim', () => {
    expect(normalizeCode('  Maria-X7K2 ')).toBe('maria-x7k2')
    expect(normalizeEmail('  Foo@Example.COM ')).toBe('foo@example.com')
  })

  test('CODE_RE rejeita formatos inválidos', () => {
    expect(isValidCode('abc')).toBe(false) // curto
    expect(isValidCode('a'.repeat(33))).toBe(false) // longo
    expect(isValidCode('Maiusculo')).toBe(false)
    expect(isValidCode('com espaço')).toBe(false)
    expect(CODE_RE.test('helena-x7k2')).toBe(true)
  })

  test('generatePageToken: base64url de 32 bytes', () => {
    const token = generatePageToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(generatePageToken()).not.toBe(token)
  })
})
