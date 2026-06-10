import { describe, expect, test } from 'bun:test'
import { actorLabel, parseActClaim } from '../src/lib/act'

describe('parseActClaim (claim de impersonação do JWT)', () => {
  test('shape válido → ActClaim (campos opcionais só quando presentes)', () => {
    expect(parseActClaim({ sub: 'adm-1', email: 'a@x.com', name: 'Ana Admin' })).toEqual({
      sub: 'adm-1',
      email: 'a@x.com',
      name: 'Ana Admin',
    })
    expect(parseActClaim({ sub: 'adm-1' })).toEqual({ sub: 'adm-1' })
  })

  test('shape inválido → undefined (sessão tratada como normal)', () => {
    for (const bad of [undefined, null, 'adm-1', 42, [], {}, { sub: '' }, { sub: 7 }]) {
      expect(parseActClaim(bad)).toBeUndefined()
    }
  })

  test('email/name não-string são descartados sem derrubar a claim', () => {
    expect(parseActClaim({ sub: 'adm-1', email: 42, name: null })).toEqual({ sub: 'adm-1' })
  })
})

describe('actorLabel', () => {
  test('nome → e-mail → genérico', () => {
    expect(actorLabel({ sub: 'a', name: 'Ana', email: 'a@x.com' })).toBe('Ana')
    expect(actorLabel({ sub: 'a', email: 'a@x.com' })).toBe('a@x.com')
    expect(actorLabel({ sub: 'a' })).toBe('um administrador')
  })
})
