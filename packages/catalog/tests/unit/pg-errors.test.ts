import { describe, expect, it } from 'bun:test'
import {
  escapeLike,
  isUniqueViolation,
} from '../../src/infrastructure/persistence/drizzle/pg-errors'

describe('isUniqueViolation', () => {
  it('reconhece o code 23505 no topo (driver cru)', () => {
    expect(isUniqueViolation({ code: '23505' })).toBe(true)
  })

  it('reconhece o 23505 ENVELOPADO em cause (DrizzleQueryError do drizzle ≥0.44)', () => {
    const driver = Object.assign(new Error('duplicate key'), { code: '23505' })
    const wrapped = new Error('Failed query', { cause: driver })
    expect(isUniqueViolation(wrapped)).toBe(true)
  })

  it('caminha múltiplos níveis de cause (com teto)', () => {
    const driver = Object.assign(new Error('dup'), { code: '23505' })
    const l1 = new Error('outer', { cause: new Error('mid', { cause: driver }) })
    expect(isUniqueViolation(l1)).toBe(true)
  })

  it('não casa outros codes nem erros sem code', () => {
    expect(isUniqueViolation(Object.assign(new Error('x'), { code: '22P02' }))).toBe(false)
    expect(isUniqueViolation(new Error('x'))).toBe(false)
    expect(isUniqueViolation(null)).toBe(false)
    expect(isUniqueViolation('23505')).toBe(false)
  })

  it('não entra em loop com cause circular (teto de profundidade)', () => {
    const a = new Error('a')
    const b = new Error('b', { cause: a })
    Reflect.set(a, 'cause', b)
    expect(isUniqueViolation(a)).toBe(false)
  })
})

describe('escapeLike', () => {
  it('escapa %, _ e \\ (busca literal, sem wildcard injection)', () => {
    expect(escapeLike('100%')).toBe('100\\%')
    expect(escapeLike('a_b')).toBe('a\\_b')
    expect(escapeLike('c\\d')).toBe('c\\\\d')
    expect(escapeLike('promo')).toBe('promo')
  })
})
