import { describe, expect, it } from 'bun:test'
import { normalizeIdentifier, safeIdent } from '../identifier'

describe('normalizeIdentifier', () => {
  it('preserva identificadores pt-BR válidos (acentos) sem mutilar', () => {
    // Antes, cada caractere fora de [A-Za-z0-9_$] virava `_`, então `número`
    // saía como `n_mero` a cada geração Blocos→Código.
    expect(normalizeIdentifier('número')).toBe('número')
    expect(normalizeIdentifier('posição')).toBe('posição')
    expect(normalizeIdentifier('calcularÁrea')).toBe('calcularÁrea')
  })

  it('mantém identificadores ASCII simples', () => {
    expect(normalizeIdentifier('contador')).toBe('contador')
    expect(normalizeIdentifier('_priv')).toBe('_priv')
    expect(normalizeIdentifier('$ref')).toBe('$ref')
  })

  it('prefixa dígito inicial e desambigua palavra reservada', () => {
    expect(normalizeIdentifier('2x')).toBe('_2x')
    expect(normalizeIdentifier('class')).toBe('class_')
    expect(normalizeIdentifier('return')).toBe('return_')
  })

  it('colapsa caracteres genuinamente inválidos', () => {
    expect(normalizeIdentifier('a-b')).toBe('a_b')
    expect(normalizeIdentifier('')).toBe('_')
  })

  it('o resultado é sempre um identificador JS legal', () => {
    for (const name of ['número', 'posição', '2x', 'class', 'a-b', 'calcularÁrea']) {
      const id = normalizeIdentifier(name)
      expect(() => new Function(`let ${id} = 1; return ${id};`)).not.toThrow()
    }
  })

  it('safeIdent é alias de normalizeIdentifier', () => {
    expect(safeIdent('número')).toBe('número')
    expect(safeIdent('class')).toBe('class_')
  })
})
