import { describe, expect, test } from 'bun:test'
import { actorLabel, parseActClaim, parseProfileClaim } from '../src/lib/act'

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

describe('parseProfileClaim (claim pfl — sessão de perfil estilo Netflix)', () => {
  test('shape válido → ProfileClaim (name só quando presente)', () => {
    expect(parseProfileClaim({ accountId: 'conta-1', name: 'Sofia' })).toEqual({
      accountId: 'conta-1',
      name: 'Sofia',
    })
    expect(parseProfileClaim({ accountId: 'conta-1' })).toEqual({ accountId: 'conta-1' })
  })

  test('shape inválido → undefined (sessão tratada como da conta)', () => {
    for (const bad of [undefined, null, 'conta-1', 42, [], {}, { accountId: '' }, { name: 'x' }]) {
      expect(parseProfileClaim(bad)).toBeUndefined()
    }
  })

  test('name não-string é descartado sem derrubar a claim', () => {
    expect(parseProfileClaim({ accountId: 'conta-1', name: 42 })).toEqual({ accountId: 'conta-1' })
  })
})
