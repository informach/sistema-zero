import { describe, expect, test } from 'bun:test'
import { parseLimit, parseOffset } from '../src/lib/list-params'

describe('parseLimit', () => {
  test('clampa ao teto (default 100)', () => {
    expect(parseLimit('1000000')).toBe(100)
    expect(parseLimit('100')).toBe(100)
    expect(parseLimit('50')).toBe(50)
  })

  test('respeita teto customizado', () => {
    expect(parseLimit('999', 25)).toBe(25)
    expect(parseLimit('10', 25)).toBe(10)
  })

  test('rejeita ausente/negativo/não-inteiro', () => {
    expect(parseLimit(null)).toBeUndefined()
    expect(parseLimit('')).toBeUndefined()
    expect(parseLimit('-1')).toBeUndefined()
    expect(parseLimit('1.5')).toBeUndefined()
    expect(parseLimit('abc')).toBeUndefined()
  })
})

describe('parseOffset', () => {
  test('aceita inteiro ≥ 0 sem teto', () => {
    expect(parseOffset('0')).toBe(0)
    expect(parseOffset('1000000')).toBe(1000000)
  })

  test('rejeita ausente/negativo/não-inteiro', () => {
    expect(parseOffset(null)).toBeUndefined()
    expect(parseOffset('-5')).toBeUndefined()
    expect(parseOffset('2.5')).toBeUndefined()
  })
})
