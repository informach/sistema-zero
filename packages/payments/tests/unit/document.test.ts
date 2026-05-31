import { describe, expect, test } from 'bun:test'
import { ValidationError } from '../../src/domain/shared/errors'
import { Document } from '../../src/domain/value-objects/document'

describe('Document', () => {
  test('aceita CPF válido e normaliza para dígitos', () => {
    const doc = Document.create('529.982.247-25')
    expect(doc.type).toBe('CPF')
    expect(doc.value).toBe('52998224725')
  })

  test('aceita CNPJ válido', () => {
    const doc = Document.create('11.222.333/0001-81')
    expect(doc.type).toBe('CNPJ')
    expect(doc.value).toBe('11222333000181')
  })

  test('rejeita CPF com dígito verificador inválido', () => {
    expect(() => Document.create('52998224724')).toThrow(ValidationError)
  })

  test('rejeita sequências repetidas', () => {
    expect(() => Document.create('11111111111')).toThrow(ValidationError)
  })

  test('rejeita tamanho inválido', () => {
    expect(() => Document.create('123')).toThrow(ValidationError)
  })

  test('rejeita CNPJ com dígito verificador inválido', () => {
    expect(() => Document.create('11.222.333/0001-82')).toThrow(ValidationError)
  })

  test('rejeita CNPJ de sequência repetida', () => {
    expect(() => Document.create('00000000000000')).toThrow(ValidationError)
  })

  test('rejeita entrada vazia/nula', () => {
    expect(() => Document.create('')).toThrow(ValidationError)
    expect(() => Document.create('abc.def')).toThrow(ValidationError)
  })
})
